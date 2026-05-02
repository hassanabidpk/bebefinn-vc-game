/**
 * Build-time TTS pre-generation. Reads every lesson phrase from the
 * existing alphabet/info data and produces /public/tts/{hash}.wav so
 * the deployed app never needs to hit the Gemini API at runtime.
 *
 * Filename = first 16 hex chars of sha256(voice|text), matching the
 * client-side helper in src/hooks/use-gemini-tts.ts. Skips files that
 * already exist on disk so reruns are cheap.
 *
 * Run via: GEMINI_API_KEY=... npx tsx scripts/generate-tts.ts
 * Wired into "prebuild" so Vercel runs it automatically.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import { alphabetData } from "../src/lib/alphabet-data.ts";
import { ANIMAL_INFO } from "../src/lib/animal-info.ts";

// Load GEMINI_API_KEY from .env.local for local runs. Vercel injects env
// vars directly, so this is a no-op there.
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
    // No .env.local — fine.
  }
}

const MODEL = "gemini-3.1-flash-tts-preview";
const OUT_DIR = path.join(process.cwd(), "public", "tts");

interface Phrase {
  text: string;
  voice: string;
}

interface InlineData {
  mimeType?: string;
  data?: string;
}

interface GeminiPart {
  inlineData?: InlineData;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
}

function hashKey(voice: string, text: string): string {
  return createHash("sha256").update(`${voice}|${text}`).digest("hex").slice(0, 16);
}

function wavHeader(pcmBytes: number, sampleRate: number, channels: number, bps: number): Buffer {
  const byteRate = sampleRate * channels * (bps / 8);
  const blockAlign = channels * (bps / 8);
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + pcmBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bps, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(pcmBytes, 40);
  return buf;
}

function parseAudioMime(mime: string) {
  const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
  const channels = Number(/channels=(\d+)/.exec(mime)?.[1] ?? 1);
  return { rate, channels };
}

function buildRevealPhrase(letter: string, word: string): string {
  const isNumber = /^[0-9]+$/.test(letter);
  return isNumber ? `${letter} for ${word}!` : `${letter}! ${letter} for ${word}!`;
}

function collectPhrases(): Phrase[] {
  const out: Phrase[] = [];
  for (const entry of alphabetData) {
    out.push({ text: buildRevealPhrase(entry.letter, entry.word), voice: "Leda" });
    const info = ANIMAL_INFO[entry.word];
    if (info) {
      out.push({ text: info.en, voice: "Leda" });
      out.push({ text: info.zh, voice: "Aoede" });
    }
  }
  // Dedup — same hash collapses to one entry.
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.voice}|${p.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateOne(
  apiKey: string,
  phrase: Phrase,
  attempt = 0
): Promise<{ skipped: boolean }> {
  const hash = hashKey(phrase.voice, phrase.text);
  const dest = path.join(OUT_DIR, `${hash}.wav`);
  if (await fileExists(dest)) return { skipped: true };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: phrase.text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: phrase.voice } },
        },
      },
    }),
  });

  if (r.status === 429 || r.status === 503) {
    if (attempt >= 5) {
      const msg = await r.text();
      throw new Error(`gemini ${r.status} after 5 retries: ${msg.slice(0, 200)}`);
    }
    // Exponential backoff: 5s, 15s, 30s, 60s, 90s.
    const wait = [5000, 15000, 30000, 60000, 90000][attempt];
    process.stdout.write(`(429 → backoff ${wait / 1000}s) `);
    await sleep(wait);
    return generateOne(apiKey, phrase, attempt + 1);
  }

  if (!r.ok) {
    const msg = await r.text();
    throw new Error(`gemini ${r.status}: ${msg.slice(0, 200)}`);
  }

  const json = (await r.json()) as GeminiResponse;
  const inline = json.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data || !inline.mimeType) {
    throw new Error(`no audio in response for "${phrase.text}"`);
  }
  const pcm = Buffer.from(inline.data, "base64");
  const { rate, channels } = parseAudioMime(inline.mimeType);
  const wav = Buffer.concat([wavHeader(pcm.length, rate, channels, 16), pcm]);
  await writeFile(dest, wav);
  return { skipped: false };
}

async function main() {
  await loadDotEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[tts] GEMINI_API_KEY not set; skipping pre-generation. Runtime /api/tts will be used.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const phrases = collectPhrases();
  console.log(`[tts] ${phrases.length} unique phrases to consider`);

  let made = 0;
  let skipped = 0;
  let failed = 0;

  // Sequential + throttled to respect free-tier RPM. Free tier on the
  // 3.1-flash-tts preview is currently ~5 req/min, so 13s between calls
  // keeps us safely under without bursting.
  const THROTTLE_MS = 13000;
  for (const phrase of phrases) {
    try {
      const { skipped: didSkip } = await generateOne(apiKey, phrase);
      if (didSkip) {
        skipped++;
        continue; // No API call happened, no throttle needed.
      }
      made++;
      process.stdout.write(`.`);
      await sleep(THROTTLE_MS);
    } catch (err) {
      failed++;
      console.warn(`\n[tts] failed: ${phrase.voice} | ${phrase.text}`, err);
      // Pace down on failures too.
      await sleep(THROTTLE_MS);
    }
  }
  console.log(`\n[tts] done — made=${made} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  // Never block the build over TTS — runtime fallback handles it.
  console.error("[tts] generation crashed but build continues:", err);
});
