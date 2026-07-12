# Spelling Challenge — Design Spec

Date: 2026-07-12
Status: Draft — awaiting review

## Overview

Add a new game mode, **Spelling Challenge**, to Ocean Buddy for ages 3–4. The child sees a big animal picture and its word as empty letter slots, then taps letters from a small letter bank to fill the slots in order. Every tap gives audio feedback; completing the word triggers a letter-by-letter chant ("C… A… T… Cat!"), the animal sound, and confetti. No fail states — wrong taps get a gentle wiggle and "Try again!".

Also included: two small improvements to existing modes (see Improvements).

## Goals

- Introduce letter-order awareness and word/sound association for pre-readers.
- Zero reading required to play: picture, pulsing slot hint, and audio carry all instruction.
- Reuse existing infrastructure: `AnimalPhoto`, `useSpeech`/`useGeminiTTS`, `useGameAudio`, `BubbleBackground`, confetti, existing header/score pill styles.

## Non-Goals

- No difficulty progression / levels system (single mixed pool of 3- and 4-letter words; more words are a data-only add).
- No persistence of progress or scores across sessions.
- No drag-and-drop (motor skill too demanding at 3; tap only).
- No i18n work in this iteration (matches current codebase, which is English-only today despite the AGENTS.md bilingual note).

## Gameplay Specification

### Round flow

1. A word is picked at random from the word pool, never repeating the previous word (same pattern as `buildRound` in `play-screen.tsx`).
2. Screen shows:
   - Large `AnimalPhoto` (or emoji sticker) of the target, centered top.
   - Word slots: one rounded square per letter, empty. The **next slot to fill pulses** (scale/glow animation).
   - Letter bank: target letters + 2 distractor letters (total = word length + 2), shuffled, as large colorful tiles (≥ 64px, using existing `play-tile` sizing conventions). Distractors are random A–Z letters not present in the word.
3. On entry, narrator speaks: "Spell {word}!" (Gemini TTS `Leda`, browser-TTS fallback — same `speakPrompt` pattern as `play-screen.tsx`).
4. Child taps a letter tile:
   - **Correct (matches next unfilled slot):** tile flies/appears into the slot, letter is spoken ("C!"), small sparkle. Tile becomes disabled/faded in the bank.
   - **Wrong:** tile wiggles briefly, gentle "Try again!" voice, no penalty, no streak reset visible to the child. Tile stays tappable.
   - Duplicate letters in a word (e.g., BEE) are handled by slot order: each tap fills the next slot; the bank contains one tile per letter instance.
5. On last slot filled: short pause, then chant "{L1}… {L2}… {L3}… {Word}!", play animal sound if the word has one (`playAnimalSound`), fire confetti, increment score/star counter.
6. Auto-advance to the next word after ~2.5s.

### Hint / stuck support

If no correct tap happens for 8 seconds, the correct tile in the bank pulses once and the letter is spoken softly ("Find the C!"). Repeats every 8s. Keeps a stuck 3-year-old moving without an adult.

### Controls

- Header matches other modes: back-home button (left), mode title pill, star score (right).
- 🔊 replay button re-speaks "Spell {word}!".
- Keyboard: letter keys act as taps on matching bank tiles (parity with existing keyboard shortcuts; harmless for touch users).

## Word Pool

Mixed 3- and 4-letter words, mostly animals and food. Every word has a real
picture: `Cat`/`Dog`/`Bear`/`Lion`/`Fish` reuse the photos under
`/public/animals/`; the rest are Gemini-generated cards under
`/public/spelling/` (see `scripts/generate-images.ts`, model
`gemini-2.5-flash-image`). All words map to a key in `CARD_IMAGES`.

- Animals: CAT, DOG, COW, PIG, BEE, FOX, BEAR, LION, FISH, FROG, GOAT, DUCK, DEER, CRAB, SEAL, WHALE, SHARK, ELEPHANT
- Food: CAKE, MILK, CORN, PEAR, EGGS, APPLE, BANANA, NOODLES, COOKIES, CHICKEN RICE
- Family: MOMMY, PAPA, AMMA
- Places / other: ZOO, SUN, BUS, SINGAPORE, TENGAH

Words with a matching entry in `ANIMAL_SOUND_FILES`/synth (cat, dog, bear,
lion, fish, whale, …) play their sound on completion; the rest simply skip
that step — the letter chant + confetti is the celebration.

`buildSpellingRound` supports any word length and multi-word phrases: it
splits the word into ordered `slots`, where spaces become non-tappable **gap
slots** (auto-filled, no bank tile) so "CHICKEN RICE" reads as two words.
`letters` (the tappable sequence) excludes gaps. Adding words is a data-only
change.

The bank holds **exactly the word's letters in reading order — no distractors,
no shuffle** — so a toddler sees "C A T" under the slots (not "T A C") and
matches left to right. This is deliberately gentle for ages 3-4; distractors
could return later as a harder mode.

**Celebration.** Each correct letter plays a pop (`playTap`) and is spoken;
the filled slot pops in. Completing the word fires a fanfare (`playCelebrate`),
a green ✓ check + word banner + party emojis, confetti, a letter-by-letter
chant then "You did it!", the animal sound, and a happy photo wiggle / slot
bounce / star pop before auto-advancing. Honors `prefers-reduced-motion`.

Image generation is a separate deliberate script (not wired into the build),
matching the existing `generate-videos.ts` / `generate-tts.ts` pattern.

## Architecture

New files:

- `src/lib/spelling-data.ts` — `SpellingWord { word: string; emoji: string; color: string; hasSound: boolean }` + `spellingWords: SpellingWord[]` + pure round-builder `buildSpellingRound(prev?)` returning `{ word, letters, bank, key }`. Game logic (bank construction, distractor pick, shuffle) lives here, separate from React, per AGENTS.md convention.
- `src/components/game/spelling-screen.tsx` — the screen component; owns slot/tap state, audio calls, celebration timing. Follows `play-screen.tsx` structure and styling classes; new CSS goes in `globals.css` alongside existing `play-*` rules.

Changed files:

- `src/app/page.tsx` — add `"spelling"` to `Screen` union, `goSpelling()` route with music start + speech warm-up.
- `src/components/game/home-screen.tsx` — add a "Spell" chip (`🔤 Spell`) to `home-chips`.

## Error handling

- TTS: Gemini play with `.catch(() => speak(text))` browser fallback, identical to existing screens.
- Missing art: `buildSpellingRound` only draws from words whose art check passes at module load, so a data mistake can't render a blank card.
- All timers (`hint`, `advance`, `celebration`) cleared on unmount and on round change.

## Testing

AGENTS.md wants Vitest but no test runner is configured yet. This feature adds it minimally:

- Add `vitest` dev dependency + `"test": "vitest run"` script.
- Unit tests for `buildSpellingRound`: bank always contains every needed letter instance, exactly 2 distractors, no previous-word repeat, shuffle keeps length.
- UI verified manually in the browser preview (tap flow, wrong-tap wiggle, celebration, hint timer) — documented as the manual check per repo convention.

## Improvements (existing game, small + scoped)

1. **Play mode celebration milestones** — every 5-streak in "Find the Animal", fire the existing `Confetti` component and speak "Amazing! {streak} in a row!". Currently streak is a silent number; 3-4yo don't read it.
2. **Notepad/lesson consistency** — none needed now; explicitly out of scope to avoid creep.

(Only #1 is in scope. Anything larger — parent gate, i18n, PWA — deferred; listed in AGENTS.md already as aspirations.)

## Alternatives considered

- **Drag-and-drop letter tiles into slots** — rejected: drag precision is above typical 3yo fine-motor level on tablets; tap-to-place is the standard pattern in preschool spelling apps (Endless Alphabet uses drag but targets 4+, and is heavily assisted).
- **"Which letter comes next?" multiple choice (one slot at a time, 3 choices)** — rejected: simpler to build but loses the visible whole-word structure, which is the learning point.
- **Free-order tapping (tap letters in any order, they sort themselves)** — rejected: removes the letter-order concept entirely.

## Success criteria

- `npx tsc --noEmit` and `npm run build` pass.
- `npm run test` passes with new round-builder tests.
- Manual: from home, one tap reaches Spelling; a full word can be completed with only correct taps; wrong taps never block progress; hint fires after 8s idle; celebration chant + confetti on completion; back button returns home and stops music.
