/**
 * Gemini image generator for Spelling Challenge cards. For every configured
 * word it asks Gemini 2.5 Flash Image ("nano banana") for a clean, square,
 * toddler-friendly picture and saves it to /public/spelling/{slug}.png.
 *
 * NOT wired into the build — run deliberately:
 *
 *   npx tsx scripts/generate-images.ts              # all missing
 *   npx tsx scripts/generate-images.ts frog cake    # only these words
 *   FORCE=1 npx tsx scripts/generate-images.ts pig  # overwrite existing
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

// Shared trailer applied to every prompt — square, clean, and crucially
// free of any text (the letters live in the game UI, not the picture).
const SUFFIX =
  "Square 1:1 composition, subject centered and filling most of the frame. " +
  "Bright cheerful colors, soft gentle lighting, cute and friendly, not scary. " +
  "Absolutely no text, no letters, no words, no numbers, no captions, no watermark.";

// Per-word look. Objects/animals/food are single subjects with no people;
// people are warm cartoon characters; scenes are simple cartoon settings.
const STYLE = {
  object:
    "Photorealistic soft 3D-render style for a toddler app. Single clear subject on a soft plain pastel studio background, rounded friendly shapes. No people.",
  person:
    "Warm, friendly soft 3D cartoon character in the style of a wholesome children's animation. One smiling, kind person, head-and-shoulders, simple soft pastel background. Gentle and cute, not photorealistic.",
  scene:
    "Colorful, simple, cheerful cartoon scene for a toddler app, clean and uncluttered, soft pastel palette, rounded friendly shapes. No visible people.",
} as const;

type Style = keyof typeof STYLE;

const PROMPTS: Record<string, { p: string; s: Style }> = {
  // Animals (upgraded emoji cards + earlier 4-letter set)
  Cow: { p: "A friendly spotted dairy cow standing and smiling gently.", s: "object" },
  Pig: { p: "A cute happy pink pig with a curly tail.", s: "object" },
  Bee: { p: "A cute friendly honeybee with a soft round fuzzy body and little wings.", s: "object" },
  Fox: { p: "An adorable orange fox sitting with a fluffy tail.", s: "object" },
  Frog: { p: "A cheerful bright green frog sitting on a lily pad.", s: "object" },
  Goat: { p: "A friendly little white goat with small horns, standing.", s: "object" },
  Duck: { p: "A cute yellow duckling standing and looking happy.", s: "object" },
  Deer: { p: "A gentle brown baby deer (fawn) with soft white spots, standing.", s: "object" },
  Crab: { p: "A cute bright red crab with friendly round eyes and small claws.", s: "object" },
  Seal: { p: "An adorable smooth grey baby seal with big shiny eyes.", s: "object" },
  Sun: { p: "A happy smiling golden sun with soft warm rays.", s: "object" },
  Bus: { p: "A cute chunky yellow school bus, friendly cartoon style, side view.", s: "object" },
  // Food
  Cake: { p: "A cheerful slice of birthday cake with pink frosting and a cherry on top.", s: "object" },
  Milk: { p: "A tall clear glass of fresh white milk.", s: "object" },
  Corn: { p: "A bright yellow ear of corn with green husk leaves.", s: "object" },
  Pear: { p: "A single fresh green pear, ripe and shiny.", s: "object" },
  Eggs: { p: "Two sunny fried eggs on a small round white plate.", s: "object" },
  Apple: { p: "A single shiny red apple with a small green leaf on top.", s: "object" },
  Banana: { p: "A single ripe yellow banana.", s: "object" },
  Noodles: { p: "A friendly bowl of noodle soup with a few vegetables, cute and appetizing.", s: "object" },
  Cookies: { p: "A small stack of round golden chocolate-chip cookies.", s: "object" },
  Chicken: {
    p: "One unmistakable golden-brown roasted chicken drumstick with a visible white bone handle, centered on a small plain plate. No bread, no potatoes, no rice, and no side dishes.",
    s: "object",
  },
  Rice: {
    p: "A single small bowl filled with fluffy cooked long-grain white rice. Show many clearly elongated rice grains with natural rice texture. No round balls, no pearls, no tapioca, and no other food.",
    s: "object",
  },
  // Places / scenes
  Zoo: {
    p: "A cheerful cartoon zoo entrance with a big friendly archway and a couple of cute animals (a giraffe and an elephant) peeking over a fence.",
    s: "scene",
  },
  Singapore: {
    p: "A cute cartoon Singapore skyline with the Marina Bay waterfront, a friendly Merlion statue spouting water, and a boat-shaped rooftop building, blue sky.",
    s: "scene",
  },
  Thailand: {
    p: "A cheerful Thailand scene with a golden Thai temple, tropical greenery, and a small long-tail boat on calm blue water.",
    s: "scene",
  },
  Taiwan: {
    p: "A cheerful Taiwan scene with Taipei 101, green mountains, and pink cherry blossoms under a bright blue sky.",
    s: "scene",
  },
  China: {
    p: "A cheerful China scene with the Great Wall winding across green mountains beneath a bright blue sky.",
    s: "scene",
  },
  // Family
  Mommy: { p: "A warm, loving cartoon mom with a kind smile, waving hello.", s: "person" },
  Papa: { p: "A warm, friendly cartoon dad with a big happy smile, waving hello.", s: "person" },
  Amma: {
    p: "A warm, gentle cartoon grandmother with kind eyes and a loving smile, hair in a soft bun, waving hello.",
    s: "person",
  },
};

interface ImagePart {
  inlineData?: { data?: string; mimeType?: string };
  inline_data?: { data?: string; mime_type?: string };
}
interface GenResponse {
  candidates?: Array<{ content?: { parts?: ImagePart[] } }>;
  error?: { message?: string };
}

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

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generate(apiKey: string, text: string, dest: string) {
  const r = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
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
    (w) => only.size === 0 || only.has(w.toLowerCase()) || only.has(fileSlug(w))
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
      const { p, s } = PROMPTS[word];
      await generate(apiKey, `${p} ${STYLE[s]} ${SUFFIX}`, dest);
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
