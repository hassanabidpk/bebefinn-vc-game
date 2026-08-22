# ABC Dance Party — Design

**Date:** 2026-08-22
**Audience:** children ages 2–6
**Status:** approved-by-default (autonomous session; user asked "design and build a dance game for kids, use Lyria if possible, alphabet song and music; retire safari games")

## Goal

One new mini-game, **ABC Dance Party**, built around an original alphabet dance
song generated with Google's **Lyria 3 Pro** model. The child dances along by
tapping big move buttons while Ocean Buddy dances and the sung letters light up.

At the same time **Safari Ride** and **Ocean Dive** are retired (both ride games
share one engine and one spec; "safari games" is read as that pair — the
retirement is a separate commit so it can be reverted independently).

## Lyria usage

Feasibility spike (2026-08-22): `lyria-3-pro-preview` via `@google/genai`
`interactions.create` with the project's `GEMINI_API_KEY` produced an 89 s,
44.1 kHz stereo MP3 in ~35 s for $0.08. It honoured custom lyrics with section
tags and returned the lyrics back with section start timestamps
(`[10.0:] A B C D E F G`, `[30.0:] Now I know my A B C's…`, `[86.0:] Yay!`).

Decision: generate the song **once, offline**, commit the MP3 and the returned
lyric text, and ship them as static assets.

- `scripts/generate-music.ts` — deliberate run (`npx tsx scripts/generate-music.ts`),
  skips when `public/music/abc-dance.mp3` already exists. Not wired into
  `prebuild`: paid, slow, non-deterministic. Writes the MP3 and rewrites the
  lyric text inside `src/lib/dance-song.ts`.
- Lyria RealTime is rejected: it would need the API key in the browser and a
  live network connection — against the "no data collection / offline capable"
  rules.
- Lyrics are original (ABC order is public domain; the chorus is ours). No
  artist names, no copyrighted lyrics in the prompt.

## Gameplay

- Home gets a **🕺 Dance** chip (replacing 🚙 Safari and 🤿 Dive).
- Screen: Ocean Buddy in the centre, a big **move cue card** above, four move
  buttons (≥ 80 px) below: **👏 Clap · 🦘 Jump · 🔄 Spin · 🐙 Wiggle**.
- A large ▶ button starts the song (also satisfies autoplay policy). A loading
  bob shows until `canplaythrough`.
- While the song plays:
  - **Verse lines** — the letters of the line being sung appear as big chips
    with a highlight sweeping across them over the line's duration. A move cue
    is also shown (round-robin across the four moves).
  - **Chorus lines** — the cue move comes from the lyric: "clap" → 👏,
    "stomp" → 🦘, "wiggle" → 🐙, "dance" → 🔄.
  - Tapping the cued move gives a ⭐ (counter in header), a sparkle sound and
    the mascot performs the move (CSS keyframes). Tapping any other move still
    makes the mascot do it — no penalty, no fail state. Tapping the mascot
    makes it wiggle.
  - No TTS during singing and no synthesized background music (the song is the
    music).
- **Dance partner** — each play picks one animal friend (the next unearned of
  the 12 sticker animals, otherwise random). Its photo bounces beside Ocean
  Buddy during choruses.
- **Song end** — confetti, "Amazing dancing!" (friendly TTS), then stickers:
  every move the child tapped on cue goes to a new **Dance moves** shelf, and
  the dance partner goes to the existing **Animal friends** shelf (so that shelf
  stays earnable after the rides are gone). Replay and Home buttons.

## Architecture

Game logic stays out of React and is unit-tested.

```
scripts/generate-music.ts          Lyria 3 Pro call, MP3 + lyric text writer
src/lib/dance-song.ts              manifest: src, durationSec, raw lyric text from Lyria
src/lib/dance-cues.ts              pure: parseLyriaLyrics(text) → sections with lines & times;
                                   buildDanceCues(sections) → cues {start, end, move, letters, text};
                                   cueAt(cues, t); DANCE_MOVES
src/lib/sticker-animals.ts         the 12 animal stickers (word, emoji, color, photo, soundKey)
src/lib/progress-store.ts          + danceMoves: string[] (version stays 1; missing key parses to [])
src/components/game/dance-screen.tsx   React shell: <audio>, rAF loop reading currentTime → cue state,
                                   buttons, mascot animation, partner, celebration
```

Timing model: Lyria only timestamps the first line of each section. A section
spans from its timestamp to the next section's timestamp (last section → song
duration); lines inside a section are spread evenly. Letters inside a verse
line are spread evenly across the line. This is deliberately approximate —
good enough for toddlers, no audio analysis.

## Retirement

Deleted: `src/components/game/ride-screen.tsx`, `src/lib/ride-{data,engine,math,models,track,visuals}.ts`,
`src/lib/ride-math.test.ts`, `src/lib/safari-world.ts`, `src/lib/ocean-world.ts`,
`public/models/animals/*.glb`, `ATTRIBUTIONS.md` (held only the ride model credits),
the RIDE CSS blocks, ride ambience + horn synths in `use-game-audio.ts`, ride
phrases in `game-speech.ts` / `tts-phrases.ts`, ride routes and chips.
Kept: `three` (Rescue stage uses it), animal photos and sounds (sticker book),
previously generated TTS wavs (harmless), the 2026-08-07 ride spec (history).

## Kid-safety / UX

- Tap only, no reading required (emoji + colour cues, letters are the lesson).
- Touch targets ≥ 80 px; keyboard 1–4 also trigger the moves.
- Positive only: stars only go up, every tap animates the mascot.
- Static assets only — works offline, no network, no key in the client.

## Testing / verification

- `src/lib/dance-cues.test.ts`: parses the real spike lyric text; section and
  line boundaries; chorus keyword → move mapping; `cueAt` at edges and outside the song.
- `src/lib/progress-store.test.ts`: `danceMoves` round-trip and legacy payload without it.
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Browser pass on the dev server: song starts on ▶, cue card changes, on-cue tap
  adds a star, song end shows celebration, stickers persist after reload, no
  console errors.

## Out of scope

- Beat-accurate sync or audio analysis; multiple songs; camera/pose detection
  (never for this age group); Korean lyrics (follow-up once i18n exists).
