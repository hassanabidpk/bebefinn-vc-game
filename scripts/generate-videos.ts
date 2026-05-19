/**
 * Veo 3.1 animal video generator. For every real-animal lesson it asks
 * Veo to produce a short, kid-friendly clip where a warm narrator speaks
 * the English info line, then downloads the MP4 to
 * /public/assets/videos/{word}.mp4 and rewrites src/lib/animal-videos.ts.
 *
 * NOT wired into the build — Veo is slow (~2-5 min/clip) and paid. Run
 * deliberately:
 *
 *   npx tsx scripts/generate-videos.ts                # all missing
 *   npx tsx scripts/generate-videos.ts Lion Whale     # only these words
 *
 * Re-running skips words whose MP4 already exists, so it is resumable.
 */
import { mkdir, writeFile, access, readFile, readdir } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { alphabetData } from "../src/lib/alphabet-data.ts";
import { ANIMAL_INFO } from "../src/lib/animal-info.ts";

// Gemini API uses veo-3.1 preview; Vertex uses the GA veo-3.1-generate-001
// (the -preview id 404s on Vertex for this project). Both generate audio.
const MODEL = "veo-3.1-generate-preview";
const VERTEX_MODEL = process.env.VERTEX_MODEL || "veo-3.1-generate-001";
const VIDEO_DIR = path.join(process.cwd(), "public", "assets", "videos");
const MANIFEST = path.join(process.cwd(), "src", "lib", "animal-videos.ts");
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Provider: "vertex" uses Vertex AI (GCP project quota, no free-tier
// daily cap) via ADC; anything else uses the Gemini API key.
const USE_VERTEX =
  process.argv.includes("--vertex") || process.env.VIDEO_PROVIDER === "vertex";
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || "us-central1";
let VERTEX_PROJECT = process.env.VERTEX_PROJECT || "";

function gcloud(args: string[]): string {
  return execFileSync("gcloud", args, { encoding: "utf8" }).trim();
}

function vertexBase(): string {
  return `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}`;
}

function vertexHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${vertexToken()}`,
    "X-Goog-User-Project": VERTEX_PROJECT,
  };
}

// ADC tokens last ~1h; batches can run longer, so fetch fresh per job.
function vertexToken(): string {
  return gcloud(["auth", "application-default", "print-access-token"]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadDotEnvLocal() {
  if (process.env.GEMINI_API_KEY) return;
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!m) continue;
      const [, k, v] = m;
      if (!process.env[k]) process.env[k] = v.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* no .env.local */
  }
}

function fileSlug(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface Target {
  word: string;
  slug: string;
  prompt: string;
}

// Human-approved, per-word Veo 3.1 prompts (reviewed 2026-05-19). The
// quoted line is the spoken narration (matches src/lib/animal-info.ts).
// Words intentionally absent (Mommy, Renee, Handsome Xaven) keep their
// existing Blob clips and are NOT regenerated.
const APPROVED_PROMPTS: Record<string, string> = {
  Alpaca:
    'Medium shot of a fluffy alpaca chewing with ears perking, soft thick coat, in a green Andean meadow. Slow dolly-in, 50mm lens, warm soft daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Alpacas are fluffy!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Bear:
    'Wide-to-medium shot of a friendly brown bear ambling and sniffing toward a honey log, in a sunlit forest clearing. Slow tracking, 35mm lens, golden dappled light. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Bears love honey!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Cat:
    'Close-up of a cute cat meowing, whiskers twitching, on a cozy sunlit windowsill indoors, free and relaxed, no cage. Gentle push-in, 50mm lens, soft warm light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Cats say meow!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Dog:
    'Medium shot of a happy dog barking with tail wagging, in a grassy backyard. Soft follow camera, 35mm lens, bright daylight. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Dogs say woof!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Elephant:
    'Wide shot of an elephant curling its long trunk and flapping ears, at a savanna waterhole. Slow dolly, 35mm lens, warm late-afternoon light. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Elephants have long trunks!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Fish:
    'Close-up of a bright tropical fish darting with shimmering scales, in a colorful coral reef aquarium. Slow drift, macro lens, clear blue light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Fish swim in water!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Gorilla:
    'Medium shot of a calm gorilla gently beating its chest, steady gaze, in a leafy jungle enclosure. Slow push-in, 50mm lens, soft green light. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Gorillas are strong!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Hippo:
    'Wide shot of a hippo wading and gently splashing, in river shallows. Slow tracking, 35mm lens, bright daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Hippos love the water!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  "Ice Cream":
    'Macro shot of a scoop of ice cream on a cone with a slow gentle melt drip, in a bright pastel kitchen. Slow rotate, macro lens, soft even light. Clean and vibrant for young children, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Ice cream is yummy!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Jellyfish:
    'Close-up of a translucent jellyfish pulsing with trailing soft tentacles, in a deep-blue aquarium. Slow drift, macro lens, soft glowing light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Jellyfish are wobbly!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Kangaroo:
    'Wide shot of a kangaroo hopping high across open Australian outback. Slow tracking pan, 35mm lens, warm daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Kangaroos hop high!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Lion:
    'Medium tracking shot of a male lion, head raised with mane drifting in the breeze giving a low gentle roar, in golden savanna at sunrise. Slow dolly-in, 50mm lens, warm soft backlight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Lions roar loud!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Nest:
    'Close-up of small eggs in a twig nest with a gentle breeze stirring, on a tree branch. Slow drift, macro lens, soft morning light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Birds live in nests!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Octopus:
    'Close-up of an octopus curling its eight arms gracefully, on a rocky aquarium floor. Slow drifting camera, macro lens, soft blue light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Octopuses have eight arms!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Panda:
    'Medium shot of a panda sitting and munching bamboo, in a bamboo grove. Slow push-in, 50mm lens, soft daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Pandas eat bamboo!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Quokka:
    'Close-up of a smiling quokka nibbling a leaf, on a grassy island. Gentle push-in, 50mm lens, warm light. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Quokkas always smile!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Shark:
    'Medium shot of a sleek shark gliding with a smooth turn, in an open blue aquarium. Slow tracking, 35mm lens, cool clear light. Photorealistic for young children, vibrant and clean, single clear subject, friendly not scary. Audio: a warm friendly female narrator says cheerfully, "Sharks have sharp teeth!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Turtle:
    'Close-up of a turtle slowly walking and blinking, in sandy shallow water. Slow low tracking, macro lens, soft daylight. Photorealistic for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Turtles walk slowly!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Unicorn:
    'Medium shot of a gentle unicorn trotting with a flowing rainbow mane and soft magical sparkles, in an enchanted meadow. Slow tracking, 50mm lens, dreamy soft light. Stylized 3D-animation look for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Unicorns are magic!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Vulture:
    'Wide shot of a vulture soaring and circling high, in a canyon sky. Slow aerial pan, 35mm lens, bright daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject, friendly not scary. Audio: a warm friendly female narrator says cheerfully, "Vultures fly very high!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Whale:
    'Wide shot of a whale breaching with a gentle water spout, in the open ocean. Slow tracking, 35mm lens, bright soft light. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Whales are huge!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Yak:
    'Medium shot of a yak standing in gentle wind with thick fur, on a high mountain slope. Slow push-in, 50mm lens, crisp cool light. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Yaks live on mountains!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
  Zebra:
    'Medium shot of a zebra trotting with crisp black-and-white stripes, on a grassy plain. Slow tracking, 50mm lens, warm daylight. Photorealistic wildlife documentary for young children, vibrant and clean, single clear subject. Audio: a warm friendly female narrator says cheerfully, "Zebras have stripes!" — no background music, natural ambient sound only. Mood: happy, calm, wholesome. No on-screen text, no captions, no people. 8 seconds, 16:9.',
};

function collectTargets(only: string[]): Target[] {
  const wanted = new Set(only.map((w) => w.toLowerCase()));
  const out: Target[] = [];
  for (const [word, prompt] of Object.entries(APPROVED_PROMPTS)) {
    if (wanted.size && !wanted.has(word.toLowerCase())) continue;
    out.push({ word, slug: fileSlug(word), prompt });
  }
  return out;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

interface VeoOperation {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  // Gemini API shape
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
    // Vertex shape
    videos?: Array<{ bytesBase64Encoded?: string; gcsUri?: string }>;
  };
}

// ---- Gemini API provider --------------------------------------------------

async function geminiStart(apiKey: string, prompt: string): Promise<string> {
  const r = await fetch(`${GEMINI_BASE}/models/${MODEL}:predictLongRunning?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "16:9" } }),
  });
  if (!r.ok) throw new Error(`veo start ${r.status}: ${(await r.text()).slice(0, 240)}`);
  const json = (await r.json()) as VeoOperation;
  if (!json.name) throw new Error(`veo start: no operation name`);
  return json.name;
}

async function geminiRun(apiKey: string, prompt: string, dest: string) {
  const opName = await geminiStart(apiKey, prompt);
  for (let i = 0; i < 48; i += 1) {
    await sleep(15000);
    const r = await fetch(`${GEMINI_BASE}/${opName}?key=${apiKey}`);
    if (!r.ok) throw new Error(`veo poll ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const op = (await r.json()) as VeoOperation;
    if (op.error) throw new Error(`veo job error: ${op.error.message}`);
    if (op.done) {
      const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new Error(`veo done but no video uri`);
      const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${apiKey}`;
      const dl = await fetch(url);
      if (!dl.ok) throw new Error(`veo download ${dl.status}`);
      await writeFile(dest, Buffer.from(await dl.arrayBuffer()));
      return;
    }
    process.stdout.write(".");
  }
  throw new Error(`veo poll timed out`);
}

// ---- Vertex AI provider ---------------------------------------------------

async function vertexRun(prompt: string, dest: string) {
  const startRes = await fetch(`${vertexBase()}:predictLongRunning`, {
    method: "POST",
    headers: vertexHeaders(),
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { aspectRatio: "16:9", sampleCount: 1, generateAudio: true },
    }),
  });
  if (!startRes.ok) {
    throw new Error(`vertex start ${startRes.status}: ${(await startRes.text()).slice(0, 240)}`);
  }
  const { name } = (await startRes.json()) as VeoOperation;
  if (!name) throw new Error(`vertex start: no operation name`);

  for (let i = 0; i < 60; i += 1) {
    await sleep(15000);
    const pr = await fetch(`${vertexBase()}:fetchPredictOperation`, {
      method: "POST",
      headers: vertexHeaders(),
      body: JSON.stringify({ operationName: name }),
    });
    if (!pr.ok) throw new Error(`vertex poll ${pr.status}: ${(await pr.text()).slice(0, 200)}`);
    const op = (await pr.json()) as VeoOperation;
    if (op.error) throw new Error(`vertex job error: ${op.error.message}`);
    if (op.done) {
      const v = op.response?.videos?.[0];
      if (v?.bytesBase64Encoded) {
        await writeFile(dest, Buffer.from(v.bytesBase64Encoded, "base64"));
        return;
      }
      if (v?.gcsUri) {
        const obj = v.gcsUri.replace("gs://", "");
        const dl = await fetch(
          `https://storage.googleapis.com/storage/v1/b/${obj.slice(0, obj.indexOf("/"))}/o/${encodeURIComponent(obj.slice(obj.indexOf("/") + 1))}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${vertexToken()}`,
              "X-Goog-User-Project": VERTEX_PROJECT,
            },
          }
        );
        if (!dl.ok) throw new Error(`vertex gcs download ${dl.status}`);
        await writeFile(dest, Buffer.from(await dl.arrayBuffer()));
        return;
      }
      throw new Error(`vertex done but no video payload`);
    }
    process.stdout.write(".");
  }
  throw new Error(`vertex poll timed out`);
}

async function runJob(apiKey: string, prompt: string, dest: string) {
  if (USE_VERTEX) return vertexRun(prompt, dest);
  return geminiRun(apiKey, prompt, dest);
}

async function writeManifest() {
  const files = (await readdir(VIDEO_DIR)).filter((f) => f.endsWith(".mp4"));
  // Map slug back to the canonical lesson word.
  const bySlug = new Map<string, string>();
  for (const entry of alphabetData) {
    if (ANIMAL_INFO[entry.word]) bySlug.set(fileSlug(entry.word), entry.word);
  }
  const entries: string[] = [];
  for (const f of files.sort()) {
    const slug = f.replace(/\.mp4$/, "");
    const word = bySlug.get(slug);
    if (!word) continue;
    entries.push(`  ${JSON.stringify(word)}: "/assets/videos/${f}",`);
  }
  const body = `/**
 * AUTO-GENERATED by scripts/generate-videos.ts. Do not edit by hand —
 * rerun the generator to refresh. Maps a lesson word to its Veo 3.1
 * clip under /public/assets/videos/.
 */
export const ANIMAL_VIDEOS: Record<string, string> = {
${entries.join("\n")}
};
`;
  await writeFile(MANIFEST, body);
  console.log(`[veo] manifest updated — ${entries.length} clips linked`);
}

async function main() {
  await loadDotEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY || "";

  if (USE_VERTEX) {
    if (!VERTEX_PROJECT) {
      try {
        VERTEX_PROJECT = gcloud(["config", "get-value", "project"]);
      } catch {
        /* handled below */
      }
    }
    if (!VERTEX_PROJECT) {
      console.error("[veo] Vertex mode: set VERTEX_PROJECT or `gcloud config set project`.");
      process.exit(1);
    }
    console.log(`[veo] provider=vertex project=${VERTEX_PROJECT} location=${VERTEX_LOCATION}`);
  } else {
    if (!apiKey) {
      console.error("[veo] GEMINI_API_KEY not set. Aborting.");
      process.exit(1);
    }
    console.log(`[veo] provider=gemini-api`);
  }

  await mkdir(VIDEO_DIR, { recursive: true });
  // Strip flags so they aren't treated as word filters.
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = collectTargets(only);
  console.log(`[veo] ${targets.length} animal(s) to consider`);

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of targets) {
    const dest = path.join(VIDEO_DIR, `${t.slug}.mp4`);
    if (await fileExists(dest)) {
      skipped++;
      continue;
    }
    try {
      console.log(`\n[veo] generating: ${t.word}`);
      await runJob(apiKey, t.prompt, dest);
      made++;
      console.log(`\n[veo] saved ${t.slug}.mp4`);
    } catch (err) {
      failed++;
      console.warn(`\n[veo] failed: ${t.word}`, err);
    }
  }

  await writeManifest();
  console.log(`\n[veo] done — made=${made} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error("[veo] crashed:", err);
  process.exit(1);
});
