/**
 * ABC Dance Party song generator (Google Lyria 3 Pro). Produces
 * /public/music/abc-dance.mp3 and rewrites src/lib/dance-song.ts with the
 * lyric text Lyria returns (section markers + timestamps drive the cues).
 *
 * NOT wired into the build — Lyria is paid (~$0.08/song), takes ~30-60 s and
 * is non-deterministic. Run deliberately:
 *
 *   npm run music:generate            # skips when the MP3 already exists
 *   npm run music:generate -- --force # regenerate
 */
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = "lyria-3-pro-preview";
const MUSIC_DIR = path.join(process.cwd(), "public", "music");
const MP3_PATH = path.join(MUSIC_DIR, "abc-dance.mp3");
const MANIFEST = path.join(process.cwd(), "src", "lib", "dance-song.ts");
const FORCE = process.argv.includes("--force");

// Original lyrics. The alphabet order is public domain; the chorus is ours.
// Keep "clap", "stomp", "wiggle", "dance" in the chorus — dance-cues.ts
// picks the cued move from those words.
const PROMPT = `Create a 90-second cheerful children's alphabet dance song at exactly 120 BPM, in C major, 4/4 time.
Style: bright, bouncy kids' pop with ukulele, handclaps, glockenspiel and a warm friendly female singer. Upbeat and very easy for toddlers aged 2-6 to clap and dance to.
Sing these lyrics exactly, clearly, one letter per beat:
[Intro - 4 bars, instrumental with handclaps]
[Verse 1]
A B C D E F G
H I J K L M N O P
Q R S T U V
W X Y and Z
[Chorus]
Now I know my A B C's, dance with me, my ocean buddies!
Clap your hands and stomp your feet, wiggle wiggle to the beat!
[Verse 2]
A B C D E F G
H I J K L M N O P
Q R S T U V
W X Y and Z
[Chorus]
Now I know my A B C's, dance with me, my ocean buddies!
Clap your hands and stomp your feet, wiggle wiggle to the beat!
[Outro - big happy ending]
Yay!`;

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

async function exists(file: string) {
  try {
    await access(file, FS.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Exact length via ffprobe when installed; otherwise the last lyric timestamp plus a tail. */
function durationSeconds(file: string, lyrics: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" }
    ).trim();
    const parsed = Number(out);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed * 100) / 100;
  } catch {
    /* fall through */
  }
  const stamps = [...lyrics.matchAll(/^\[(\d+(?:\.\d+)?):\]/gm)].map((m) => Number(m[1]));
  const last = stamps.length ? Math.max(...stamps) : 0;
  console.warn("ffprobe unavailable — estimating duration from lyric timestamps");
  return last + 4;
}

function manifestSource(durationSec: number, lyrics: string) {
  return `/**
 * The ABC Dance Party song. Generated once with Google Lyria 3 Pro by
 * \`scripts/generate-music.ts\` (paid, slow, non-deterministic — run it
 * deliberately, never at build time). The MP3 is committed so the game is
 * fully static and offline-capable, and \`lyrics\` is the exact text Lyria
 * returned: section markers \`[[A0]]\` plus \`[seconds:] line\` timestamps on
 * the first line of each section. \`dance-cues.ts\` turns it into cues.
 */
export interface DanceSong {
  src: string;
  durationSec: number;
  lyrics: string;
}

export const DANCE_SONG: DanceSong = {
  src: "/music/abc-dance.mp3",
  durationSec: ${durationSec},
  lyrics: \`${lyrics.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\`,
};
`;
}

async function main() {
  await loadDotEnvLocal();
  if (!FORCE && (await exists(MP3_PATH))) {
    console.log(`${path.relative(process.cwd(), MP3_PATH)} exists — skipping (use --force to regenerate)`);
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  console.log(`Asking ${MODEL} for the ABC dance song…`);
  const ai = new GoogleGenAI({ apiKey, vertexai: false });
  const started = Date.now();
  const interaction = await ai.interactions.create({ model: MODEL, input: PROMPT });
  const audio = interaction.output_audio;
  if (!audio?.data) throw new Error("Lyria returned no audio");
  const lyrics = (interaction.output_text ?? "").trim();
  if (!lyrics) throw new Error("Lyria returned no lyric text — cues need the timestamps");

  await mkdir(MUSIC_DIR, { recursive: true });
  await writeFile(MP3_PATH, Buffer.from(audio.data, "base64"));
  const durationSec = durationSeconds(MP3_PATH, lyrics);
  await writeFile(MANIFEST, manifestSource(durationSec, lyrics));
  console.log(
    `Saved ${path.relative(process.cwd(), MP3_PATH)} (${durationSec}s, ${Math.round((Date.now() - started) / 1000)}s)\n${lyrics}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
