# Second Improvement Sweep — Sticker Book, Ride Ambience, Horn — Design

**Date:** 2026-08-15
**Audience:** children ages 4–6
**Status:** approved-by-default (autonomous session; user asked "brainstorm about improving games and then go for it")

## Brainstorm summary

Candidates considered as senior game designer, with verdicts:

| Idea | Verdict | Why |
|---|---|---|
| **Persistent cross-game sticker book** | ✅ build | Collection is the strongest motivator at 4–6; today every game forgets progress between sessions ("auto-save" is an AGENTS.md principle we don't yet honour) |
| **Horn / bubble button in rides** | ✅ build | Pure cause-and-effect joy, one button, huge giggle-per-line-of-code ratio |
| **Generative ride ambience** | ✅ build | Rides are silent outside encounters; soft birdsong / water keeps the world alive without fighting speech |
| More animals per world | ❌ later | New asset sourcing round; rides feel complete at 6 |
| Day/night or weather in rides | ❌ later | Visual polish worth less than retention right now |
| Letter tracing | ❌ no | Notepad already covers free drawing; tracing needs stroke validation — separate project |
| Parent dashboard / settings | ❌ no | Different audience; parent gate remains a future project |

## Design

### 1. Progress store (`src/lib/progress-store.ts`)
- localStorage key `ocean-buddy-progress-v1`, shape `{ version: 1, rideAnimals: string[], rescueLetters: string[], spellWords: string[] }`.
- Pure, unit-tested helpers: `emptyProgress()`, `withSticker(progress, kind, id)` (dedupes, keeps insertion order), `countStickers(progress)`.
- Guarded IO: `loadProgress()` / `saveProgress()` no-op on server or when storage throws (private mode). Bad/old JSON → `emptyProgress()`.
- No data leaves the device (AGENTS: no data collection).

### 2. Earning stickers (three one-line hooks)
- **Rides** (`ride-screen.tsx` `meetAnimalRef`): every animal met → `rideAnimals` sticker (word).
- **Rescue** (`letter-rescue-screen.tsx` correct branch): rescued letter → `rescueLetters`.
- **Spelling** (`spelling-screen.tsx` success callback): completed word → `spellWords`.
- Earning is silent (each game already celebrates); permanence shows up in the book.

### 3. Sticker Book screen (`sticker-book-screen.tsx`)
- Entered from a floating ⭐ button (with count badge) in the home screen's top-right; back button returns home. Route id `stickers` in `page.tsx`.
- Three shelves, no reading required:
  - **Animal friends** — 12 cards using each animal's real photo (from `RIDE_CONFIGS`); locked = dimmed grey silhouette. Tap unlocked → speak name + play its sound.
  - **Letters** — A–Z chips; locked dimmed. Tap unlocked → speak the letter.
  - **Words** — one chip per `spellingWords` entry with its picture. Tap unlocked → speak the word.
- Total sticker count in the header. No failure states, nothing to lose.

### 4. Ride ambience (`use-game-audio.ts`)
- `startRideAmbience(world)` / `stopRideAmbience()`, generative Web Audio, master gain ~0.06 so speech always wins:
  - **safari** — soft filtered wind noise loop + random pentatonic two-note bird chirps every 2.5–6 s.
  - **ocean** — low filtered noise "underwater room tone" + occasional sine bubble pops.
- Started when a ride mounts, stopped on unmount (and on `dispose` path). Independent of the music toggle (it is ambience, not music).

### 5. Horn button (rides)
- Big round button above the arrow pad: 🎺 in safari, 🫧 in ocean.
- `playHorn()` — cheerful two-tone beep-beep; `playBubbleHorn()` — bubbly blurp cluster. Button pops on press. No cooldown beyond 250 ms debounce (mashing is the point, but overlapping synths clip).

### Testing
- `progress-store.test.ts`: dedupe, ordering, count, corrupt-JSON recovery (pure parts).
- `npx tsc --noEmit`, full vitest, live browser pass: earn a ride sticker + rescue letter + spelled word, confirm book shows them after reload; horn audible path exercised via click (no console errors); ambience starts/stops across mount cycles.

### Out of scope
- Cross-device sync, parent gate, sticker rewards/unlockables, more animals.
