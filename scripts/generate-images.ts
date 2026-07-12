/**
 * Gemini image generator for Spelling Challenge cards. For every configured
 * word it asks Gemini 2.5 Flash Image ("nano banana") for a clean, square,
 * toddler-friendly picture and saves it to /public/spelling/{slug}.png.
 *
 * NOT wired into the build — run deliberately:
 *
 *   npx tsx scripts/generate-images.ts            # all missing
 *   npx tsx scripts/generate-images.ts frog cake  # only these words
 *   FORCE=1 npx tsx scripts/generate-images.ts pig # overwrite existing
 *
 * Re-running skips words whose PNG already exists (unless FORCE=1), so it
 * is resumable.
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";

const MODEL = process.env.IMAGE_MODEL || "gemini-2.5-flash-image";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OUT_DIR = path.join(process.cwd(), "public", "spelling");

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

const STYLE =
  "Bright, cheerful, photorealistic 3D-render style for a toddler learning app. " +
  "Single clear subject, centered, filling most of the square frame. " +
  "Soft plain pastel studio background, gentle soft lighting, vibrant clean colors, " +
  "rounded friendly shapes, cute and happy, not scary. " +
  "Square 1:1 composition. Absolutely no text, no letters, no words, no captions, no watermark, no people.";

// Per-word subject prompt; STYLE is appended to every one.
const PROMPTS: Record<string, string> = {
  // Animals (upgrading emoji cards + new 4-letter words)
  Cow: "A friendly spotted dairy cow standing and smiling gently.",
  Pig: "A cute happy pink pig with a curly tail.",
  Bee: "A cute friendly honeybee with soft round fuzzy body and little wings.",
  Fox: "An adorable orange fox sitting with a fluffy tail.",
  Frog: "A cheerful bright green frog sitting on a lily pad.",
  Goat: "A friendly little white goat with small horns, standing.",
  Duck: "A cute yellow duckling standing and looking happy.",
  Deer: "A gentle brown baby deer (fawn) with soft white spots, standing.",
  Crab: "A cute bright red crab with friendly round eyes and small claws.",
  Seal: "An adorable smooth grey baby seal with big shiny eyes.",
  // Not-animal, not-food but simple and picturable
  Sun: "A happy smiling golden sun with soft warm rays.",
  Bus: "A cute chunky yellow school bus, friendly cartoon style, side view.",
  // Food
  Cake: "A cheerful slice of birthday cake with pink frosting and a cherry on top.",
  Milk: "A tall clear glass of fresh white milk.",
  Corn: "A bright yellow ear of corn with green husk leaves.",
  Pear: "A single fresh green pear, ripe and shiny.",
  Eggs: "Two sunny fried eggs on a small round white plate.",
};

interface ImagePart {
  inlineData?: { data?: string; mimeType?: string };
  inline_data?: { data?: string; mime_type?: string };
}
interface GenResponse {
  candidates?: Array<{ content?: { parts?: ImagePart[] } }>;
  error?: { message?: string };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generate(apiKey: string, prompt: string, dest: string) {
  const r = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt} ${STYLE}` }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!r.ok) throw new Error(`image ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const json = (await r.json()) as GenResponse;
  if (json.error) throw new Error(`image job error: ${json.error.message}`);
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const data = p.inlineData?.data ?? p.inline_data?.data;
    if (data) {
      await writeFile(dest, Buffer.from(data, "base64"));
      return;
    }
  }
  throw new Error("no image part in response");
}

async function main() {
  await loadDotEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error("[img] GEMINI_API_KEY not set. Aborting.");
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const only = new Set(process.argv.slice(2).map((w) => w.toLowerCase()));
  const force = process.env.FORCE === "1";
  const words = Object.keys(PROMPTS).filter(
    (w) => only.size === 0 || only.has(w.toLowerCase())
  );
  console.log(`[img] provider=gemini-api model=${MODEL} — ${words.length} word(s)`);

  let made = 0;
  let skipped = 0;
  let failed = 0;
  for (const word of words) {
    const dest = path.join(OUT_DIR, `${fileSlug(word)}.png`);
    if (!force && (await fileExists(dest))) {
      skipped++;
      continue;
    }
    try {
      console.log(`[img] generating: ${word}`);
      await generate(apiKey, PROMPTS[word], dest);
      made++;
      console.log(`[img] saved ${fileSlug(word)}.png`);
    } catch (err) {
      failed++;
      console.warn(`[img] failed: ${word}`, err);
    }
  }
  console.log(`[img] done — made=${made} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error("[img] crashed:", err);
  process.exit(1);
});
