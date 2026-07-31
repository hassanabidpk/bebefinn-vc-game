/**
 * Build-time TTS pre-generation. Reads every lesson phrase from the
 * existing alphabet/info data and produces /public/tts/{hash}.wav so
 * the deployed app never needs to hit the Gemini API at runtime.
 *
 * Filename = first 16 hex chars of sha256(version|voice|text), matching the
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
import { getAlphabetEntriesWithVariants } from "../src/lib/alphabet-data.ts";
import { ANIMAL_INFO } from "../src/lib/animal-info.ts";
import { TTS_CACHE_VERSION } from "../src/lib/tts-config.ts";
import {
  generateGeminiSpeech,
  isGeminiSpendingCapError,
} from "../src/lib/gemini-tts.ts";
import {
  getCoreGameTtsPhrases,
  getTtsVoiceForPhrase,
} from "../src/lib/tts-phrases.ts";

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

const OUT_DIR = path.join(process.cwd(), "public", "tts");

interface Phrase {
  text: string;
  voice: string;
}

function hashKey(voice: string, text: string): string {
  return createHash("sha256")
    .update(`${TTS_CACHE_VERSION}|${voice}|${text}`)
    .digest("hex")
    .slice(0, 16);
}

function buildRevealPhrase(letter: string, word: string, spokenWord = word): string {
  const isNumber = /^[0-9]+$/.test(letter);
  return isNumber ? `${letter} for ${spokenWord}!` : `${letter}! ${letter} for ${spokenWord}!`;
}

function collectPhrases(): Phrase[] {
  const out: Phrase[] = [];
  for (const entry of getAlphabetEntriesWithVariants()) {
    out.push({ text: buildRevealPhrase(entry.letter, entry.word, entry.spokenWord), voice: "Leda" });
    const info = ANIMAL_INFO[entry.word];
    if (info) {
      out.push({ text: info.spokenEn ?? info.en, voice: "Leda" });
      out.push({ text: info.zh, voice: "Aoede" });
    }
  }
  for (const text of getCoreGameTtsPhrases()) {
    out.push({ text, voice: getTtsVoiceForPhrase(text) });
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
  isAborted: () => boolean,
  attempt = 0
): Promise<{ skipped: boolean }> {
  if (isAborted()) throw Object.assign(new Error("tts batch aborted"), { aborted: true });
  const hash = hashKey(phrase.voice, phrase.text);
  const dest = path.join(OUT_DIR, `${hash}.wav`);
  if (await fileExists(dest)) return { skipped: true };

  try {
    const wav = await generateGeminiSpeech(apiKey, phrase.text, phrase.voice);
    await writeFile(dest, wav);
    return { skipped: false };
  } catch (error) {
    if (isGeminiSpendingCapError(error)) {
      (error as Error & { fatal?: boolean }).fatal = true;
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (/API key not valid|401|403|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
      (error as Error & { fatal?: boolean }).fatal = true;
      throw error;
    }
    const transient = /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE/i.test(message);
    if (!transient) throw error;
    if (attempt >= 5) {
      throw new Error(`gemini tts failed after 5 retries: ${message.slice(0, 200)}`);
    }
    // Exponential backoff: 5s, 15s, 30s, 60s, 90s.
    const wait = [5000, 15000, 30000, 60000, 90000][attempt];
    process.stdout.write(`(transient error -> backoff ${wait / 1000}s) `);
    await sleep(wait);
    if (isAborted()) throw Object.assign(new Error("tts batch aborted"), { aborted: true });
    return generateOne(apiKey, phrase, isAborted, attempt + 1);
  }
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

  const concurrency = Math.max(1, Number(process.env.TTS_CONCURRENCY ?? 4));
  const throttleMs = Math.max(0, Number(process.env.TTS_THROTTLE_MS ?? 500));
  let cursor = 0;
  let aborted = false;

  const worker = async () => {
    while (!aborted) {
      const phrase = phrases[cursor++];
      if (!phrase) return;
      try {
        const { skipped: didSkip } = await generateOne(apiKey, phrase, () => aborted);
        if (didSkip) {
          skipped++;
          continue;
        }
        made++;
        process.stdout.write(".");
        await sleep(throttleMs);
      } catch (err) {
        if ((err as Error & { aborted?: boolean }).aborted === true) return;
        failed++;
        const fatal = (err as Error & { fatal?: boolean }).fatal === true;
        console.warn(`\n[tts] failed: ${phrase.voice} | ${phrase.text}`, err);
        if (fatal) {
          aborted = true;
          console.warn("[tts] account unavailable — aborting batch. Existing audio and device fallback remain active.");
          return;
        }
        await sleep(throttleMs);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\n[tts] done — made=${made} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  // Never block the build over TTS — runtime fallback handles it.
  console.error("[tts] generation crashed but build continues:", err);
});
