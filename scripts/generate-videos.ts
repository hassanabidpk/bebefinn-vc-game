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

// Scene by animal: aquarium for sea creatures, safari for wild land
// animals, zoo for everything else. Keeps clips informative + fun.
const AQUARIUM = new Set(["Fish", "Jellyfish", "Octopus", "Shark", "Turtle", "Whale"]);
const SAFARI = new Set([
  "Lion", "Elephant", "Gorilla", "Zebra", "Kangaroo",
  "Alpaca", "Yak", "Bear", "Hippo", "Vulture",
]);

function sceneFor(word: string): string {
  if (AQUARIUM.has(word)) return "a big bright aquarium with families of children watching through the glass";
  if (SAFARI.has(word)) return "a sunny safari park with a gentle tour vehicle nearby";
  return "a friendly, well-kept zoo enclosure with happy young visitors";
}

/** Veo 3.1 honours quoted speech for spoken audio. Keep the scene simple,
 *  bright and toddler-safe; one short narrated sentence. */
function buildPrompt(word: string, enInfo: string): string {
  return [
    `A bright, cheerful, photorealistic close-up of a friendly ${word.toLowerCase()} at ${sceneFor(word)}.`,
    `Soft daylight, gentle camera movement, wholesome children's nature-show style — informative and entertaining for young kids.`,
    `A warm, friendly female narrator says clearly: "${enInfo}"`,
    `Happy, calm mood. No text or captions on screen. 8 seconds.`,
  ].join(" ");
}

function collectTargets(only: string[]): Target[] {
  const wanted = new Set(only.map((w) => w.toLowerCase()));
  const out: Target[] = [];
  for (const entry of alphabetData) {
    if (!/^[A-Z]$/.test(entry.letter)) continue;
    const info = ANIMAL_INFO[entry.word];
    if (!info) continue;
    if (wanted.size && !wanted.has(entry.word.toLowerCase())) continue;
    out.push({
      word: entry.word,
      slug: fileSlug(entry.word),
      prompt: buildPrompt(entry.word, info.en),
    });
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
