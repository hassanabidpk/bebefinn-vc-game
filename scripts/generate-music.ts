/**
 * Ocean Buddy Dance Party song generator (Google Lyria 3 Pro).
 *
 * Generates one or more original songs, stores the returned timed lyrics
 * beside each MP3, and rebuilds src/lib/dance-song.ts for the game picker.
 * This is paid and intentionally never runs during a build.
 *
 *   npm run music:generate                    # all missing songs
 *   npm run music:generate -- animal-dance    # one song
 *   npm run music:generate -- color-dance --force # regenerate one song
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MODEL = "lyria-3-pro-preview";
const TIMING_MODEL = process.env.MUSIC_TIMING_MODEL || "gemini-2.5-pro";
const MUSIC_DIR = path.join(process.cwd(), "public", "music");
const MANIFEST = path.join(process.cwd(), "src", "lib", "dance-song.ts");
const FORCE = process.argv.includes("--force");

interface SongRecipe {
  id: string;
  title: string;
  emoji: string;
  prompt: string;
}

const RECIPES: SongRecipe[] = [
  {
    id: "abc-dance",
    title: "ABC Dance",
    emoji: "🔤",
    prompt: `Create a 90-second cheerful children's alphabet dance song at exactly 120 BPM, in C major, 4/4 time.
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
Yay!`,
  },
  {
    id: "animal-dance",
    title: "Animal Dance",
    emoji: "🦁",
    prompt: `Create a 75-second original cheerful toddler dance song at exactly 116 BPM, in C major, 4/4 time.
Style: bright bouncy kids' pop with ukulele, handclaps, playful brass, glockenspiel and a warm friendly female singer. Every line is short and repeats its action word three times so toddlers aged 2-6 can echo it. Keep the chorus melody identical every time it repeats. No copyrighted melodies or characters.
Sing these lyrics exactly:
[Intro - 4 bars, playful animal sounds]
[Verse 1]
Hop like a bunny, hop hop hop!
Stomp like an elephant, stomp stomp stomp!
Wiggle like an octopus, wiggle wiggle wiggle!
Clap like a seal, clap clap clap!
[Chorus]
Animal dance, animal dance
Everybody do the animal dance!
Hop and stomp and wiggle and clap
Animal dance, animal dance!
[Verse 2]
Jump like a deer, jump jump jump!
Flap like a crow, flap flap flap!
Splash like a dolphin, splash splash splash!
Roar like a lion, roar roar roar!
[Chorus]
Animal dance, animal dance
Everybody do the animal dance!
Hop and stomp and wiggle and clap
Animal dance, animal dance!
[Outro]
Animal dance, hooray!`,
  },
  {
    id: "counting-dance",
    title: "Counting Dance",
    emoji: "🔟",
    prompt: `Create a 75-second original cheerful toddler counting dance song at exactly 120 BPM, in C major, 4/4 time.
Style: energetic kids' pop with handclaps, ukulele, marimba, light drums and a warm friendly female singer. Sing every number slowly, clearly and evenly, one number per beat, so ages 2-6 can count along. Keep the chorus melody identical every time it repeats. No copyrighted melodies or characters.
Sing these lyrics exactly:
[Intro - 4 bars, count-in]
[Verse 1]
One two three, clap with me!
Four five six, stomp your feet!
Seven eight nine, jump up high!
Ten ten ten, wiggle again!
[Chorus]
Count and dance, count and dance
One two three four five!
Count and dance, count and dance
Six seven eight nine ten!
[Verse 2]
One two three, clap with me!
Four five six, stomp your feet!
Seven eight nine, jump up high!
Ten ten ten, wiggle again!
[Chorus]
Count and dance, count and dance
One two three four five!
Count and dance, count and dance
Six seven eight nine ten!
[Outro]
One to ten, hooray!`,
  },
  {
    id: "color-dance",
    title: "Color Dance",
    emoji: "🌈",
    prompt: `Create a 75-second original cheerful toddler color dance song at exactly 118 BPM, in C major, 4/4 time.
Style: sunny kids' pop with ukulele, handclaps, glockenspiel, bubbly synth and a warm friendly female singer. Each verse line sings one color word three times slowly and clearly, then one action word three times, so ages 2-6 can echo it. Keep the chorus melody identical every time it repeats. No copyrighted melodies or characters.
Sing these lyrics exactly:
[Intro - 4 bars, sparkling rainbow sounds]
[Verse 1]
Red red red, clap clap clap!
Yellow yellow yellow, jump jump jump!
Green green green, wiggle wiggle wiggle!
Blue blue blue, stomp stomp stomp!
[Chorus]
Color dance, color dance
Red and yellow, green and blue!
Color dance, color dance
Rainbow colors, me and you!
[Verse 2]
Orange orange orange, clap clap clap!
Purple purple purple, jump jump jump!
Pink pink pink, wiggle wiggle wiggle!
White white white, stomp stomp stomp!
[Chorus]
Color dance, color dance
Red and yellow, green and blue!
Color dance, color dance
Rainbow colors, me and you!
[Outro]
Rainbow hooray!`,
  },
];

async function loadDotEnvLocal() {
  if (process.env.GEMINI_API_KEY) return;
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) process.env[key] = value.replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // .env.local is optional when the key is already exported.
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

function durationSeconds(file: string, lyrics: string): number {
  try {
    const output = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { encoding: "utf8" }
    ).trim();
    const parsed = Number(output);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed * 100) / 100;
  } catch {
    // Fall back to the final lyric timestamp plus a short musical tail.
  }
  const stamps = [...lyrics.matchAll(/^\[(\d+(?:\.\d+)?):\]/gm)].map((match) => Number(match[1]));
  return (stamps.length ? Math.max(...stamps) : 0) + 4;
}

function escapeTemplateLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function lyricTextLines(lyrics: string) {
  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\[[^\]]*:\]/.test(line))
    .map((line) => line.replace(/^\[[^\]]*:\]\s*/, ""));
}

function stripCodeFence(value: string) {
  return value.trim().replace(/^```(?:text)?\s*/i, "").replace(/\s*```$/, "").trim();
}

async function timestampLyrics(ai: GoogleGenAI, mp3: string, lyrics: string) {
  const audio = (await readFile(mp3)).toString("base64");
  const originalLines = lyricTextLines(lyrics);
  const response = await ai.models.generateContent({
    model: TIMING_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "audio/mpeg", data: audio } },
          {
            text: `Listen to this complete song and locate the actual vocal start time of every listed lyric line.
Return only one valid JSON array containing exactly ${originalLines.length} numbers in the same order, measured in seconds to one decimal place.
Include sung sound-effect and outro lines. Do not omit repeated lines. Do not return lyrics or markdown.

${originalLines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`,
          },
        ],
      },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });
  const raw = stripCodeFence(response.text ?? "");
  const parsed = JSON.parse(raw) as unknown;
  const duration = durationSeconds(mp3, lyrics);
  if (
    !Array.isArray(parsed) ||
    parsed.length !== originalLines.length ||
    !parsed.every(
      (value, index) =>
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= duration &&
        (index === 0 || value >= (parsed[index - 1] as number))
    )
  ) {
    throw new Error(
      `${TIMING_MODEL} returned invalid timing data for ${originalLines.length} lyric lines`
    );
  }
  let timestampIndex = 0;
  return lyrics
    .split(/\r?\n/)
    .map((line) => {
      const match = /^\[[^\]]*:\]\s*(.*)$/.exec(line.trim());
      if (!match) return line;
      const timestamp = parsed[timestampIndex++] as number;
      return `[${timestamp.toFixed(1)}:] ${match[1]}`;
    })
    .join("\n");
}

async function writeManifest() {
  const songs = [];
  for (const recipe of RECIPES) {
    const mp3 = path.join(MUSIC_DIR, `${recipe.id}.mp3`);
    const lyricsFile = path.join(MUSIC_DIR, `${recipe.id}.lyrics.txt`);
    if (!(await exists(mp3)) || !(await exists(lyricsFile))) continue;
    const lyrics = (await readFile(lyricsFile, "utf8")).trim();
    songs.push({ ...recipe, durationSec: durationSeconds(mp3, lyrics), lyrics });
  }
  const entries = songs.map(
    (song) => `  {\n    id: ${JSON.stringify(song.id)},\n    title: ${JSON.stringify(song.title)},\n    emoji: ${JSON.stringify(song.emoji)},\n    src: ${JSON.stringify(`/music/${song.id}.mp3`)},\n    durationSec: ${song.durationSec},\n    lyrics: \`${escapeTemplateLiteral(song.lyrics)}\`,\n  },`
  );
  const source = `/** AUTO-GENERATED by scripts/generate-music.ts. */
export interface DanceSong {
  id: string;
  title: string;
  emoji: string;
  src: string;
  durationSec: number;
  lyrics: string;
}

export const DANCE_SONGS: DanceSong[] = [
${entries.join("\n")}
];

export const DANCE_SONG = DANCE_SONGS[0];
`;
  await writeFile(MANIFEST, source);
  console.log(`[lyria] manifest updated with ${songs.length} song(s)`);
}

async function main() {
  await loadDotEnvLocal();
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const wanted = new Set(requested);
  const recipes = wanted.size ? RECIPES.filter((recipe) => wanted.has(recipe.id)) : RECIPES;
  if (wanted.size && recipes.length !== wanted.size) {
    const known = RECIPES.map((recipe) => recipe.id).join(", ");
    throw new Error(`Unknown song id. Choose from: ${known}`);
  }

  await mkdir(MUSIC_DIR, { recursive: true });
  let ai: GoogleGenAI | undefined;
  const requireAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is required to generate or timestamp a song");
    ai ??= new GoogleGenAI({ apiKey, vertexai: false });
    return ai;
  };
  for (const recipe of recipes) {
    const mp3 = path.join(MUSIC_DIR, `${recipe.id}.mp3`);
    const lyricsFile = path.join(MUSIC_DIR, `${recipe.id}.lyrics.txt`);
    const hasSong = (await exists(mp3)) && (await exists(lyricsFile));
    if (!FORCE && hasSong) {
      console.log(`[lyria] ${recipe.id} exists — skipping`);
    } else {
      console.log(`[lyria] generating ${recipe.title} with ${MODEL}…`);
      const started = Date.now();
      const interaction = await requireAi().interactions.create({ model: MODEL, input: recipe.prompt });
      const audio = interaction.output_audio;
      const lyrics = (interaction.output_text ?? "").trim();
      if (!audio?.data) throw new Error(`${recipe.title}: Lyria returned no audio`);
      if (!lyrics) throw new Error(`${recipe.title}: Lyria returned no lyric text`);
      await writeFile(mp3, Buffer.from(audio.data, "base64"));
      await writeFile(lyricsFile, `${lyrics}\n`);
      console.log(`[lyria] saved ${recipe.id}.mp3 in ${Math.round((Date.now() - started) / 1000)}s`);
    }

    const lyrics = (await readFile(lyricsFile, "utf8")).trim();
    if (/^\[:\]/m.test(lyrics)) {
      console.log(`[lyrics] timing ${recipe.title} with ${TIMING_MODEL}…`);
      const timed = await timestampLyrics(requireAi(), mp3, lyrics);
      await writeFile(lyricsFile, `${timed}\n`);
    }
  }
  await writeManifest();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
