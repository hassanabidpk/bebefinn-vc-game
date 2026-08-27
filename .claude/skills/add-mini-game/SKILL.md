---
name: add-mini-game
description: Add a new mini-game/activity screen to the Ocean Buddy kids game — wiring the screen component, the Screen route in src/app/page.tsx, the home-screen chip, and the globals.css section. Use whenever asked to add a new game mode, activity, or screen to this repo.
---

# Add a mini-game screen to Ocean Buddy

Follow this checklist in order. Every step maps to an existing pattern in the repo — copy the
closest sibling (`notepad-screen.tsx`, `spelling-screen.tsx`, `letter-rescue-screen.tsx`) rather
than inventing structure. Read `AGENTS.md` first if you have not this session.

## 1. Screen component — `src/components/game/<name>-screen.tsx`

- `"use client";` at the top; named export, functional component, no `default` export.
- Props interface takes at minimum `onHome: () => void`. Extra props follow the sibling screens
  (`letterCase`, `isMusicPlaying`/`onToggleMusic` only if the screen actually needs them).
- Root element `<div className="<name>-screen">`, then a `<header className="lesson-header">`
  containing `<button className="icon-btn" onClick={onHome} aria-label="Back home">` — that is the
  established back-home affordance.
- Keep game logic out of JSX: pure helpers/data go in `src/lib/<name>-data.ts` (or `-<thing>.ts`)
  so they can be unit-tested with Vitest, like `src/lib/letter-rescue-data.ts` +
  `letter-rescue-data.test.ts`.
- Audio: `useGameAudio()` from `@/hooks/use-game-audio` (`playTap`, `playCelebrate`,
  `playGuessSuspense`, `playNext`, `playPrevious`, `playAnimalSound`, `playStart`,
  `playLetterCall`, …) and `useSpeech()` from `@/hooks/use-speech` (`speak`, `speakBilingual`,
  `stop`, `isSpeaking`, `warmUp`). Do not hand-roll `new Audio()` or `speechSynthesis` calls.
- If the screen animates on canvas/Three.js, use `requestAnimationFrame` (not `setInterval`),
  dispose geometries/materials/renderer on cleanup, and honour
  `matchMedia("(prefers-reduced-motion: reduce)")` the way `dance-mascot-stage.tsx` does.

## 2. Route it in `src/app/page.tsx`

Three edits, all in that one file:

1. Add the screen name to the `type Screen = "home" | "lesson" | …` union.
2. Add a `goX()` navigation function next to the existing ones. The pattern is:
   ```tsx
   const goX = () => {
     playStart();
     warmUp();
     // Either: startBackgroundMusic();
     // Or a comment stating why not, e.g.
     // No background music — letter chant needs to be clearly heard.
     setRoute({ screen: "x", index: 0 });
   };
   ```
   `playStart()` gives tap feedback, `warmUp()` unlocks speech synthesis on the user gesture.
   Deciding music on/off is mandatory and the reason must be a comment — see `goNotepad`,
   `goSpelling`, `goDance`, `goRescue` for the existing wording.
3. Add the conditional render at the bottom:
   `{route.screen === "x" ? <XScreen onHome={goHome} /> : null}`

`goHome` already calls `stopBackgroundMusic()`, so screens never need to stop music themselves.

## 3. Entry point on the home screen

`src/components/game/home-screen.tsx`. Most modes go through `onMode`:

- Add the mode string to the `onMode` union in **both** `HomeScreenProps` (home-screen.tsx) and the
  `onMode` handler signature in `page.tsx`, then add the `else if (mode === "x") goX();` branch.
- Add the chip: `<button className="home-chip home-chip-x" onClick={() => onMode("x")}>🎯 Name</button>`.
  An emoji plus a very short word — a 2-6 year old cannot read a sentence.
- A screen that is not a "mode" (like the sticker book) gets its own dedicated prop instead
  (`onStickers`) — follow that only if the chip row is the wrong place for it.

Two taps maximum from home to playing.

## 4. Styles — `src/app/globals.css`

- Append a new section at the end, delimited like the others: `/* ---- MY GAME ---- */`.
- Prefix every class with the screen name (`.x-screen`, `.x-card`, …) — this file is one flat
  global sheet with no CSS modules.
- Add a `@media (max-width: 720px) { … }` block for phone sizing (this file uses that breakpoint
  consistently).
- Add `@media (prefers-reduced-motion: reduce) { … }` disabling your animations, matching the
  blocks at the end of the dance and rescue sections.

## 5. Kid-UX rules (non-negotiable, from AGENTS.md)

- Touch targets **≥ 64px**; support touch and mouse.
- **No reading required** — icons, images, colour, and audio carry every instruction.
- **Tap/click/drag only** — never a text input, never a keyboard-only interaction for the child.
- **Positive reinforcement only** — no fail states, no scores that can go down, no timers that
  punish; celebrate every interaction.
- **No external links, ads, purchases, or data collection.** Fully self-contained.
- Progress persists via `src/lib/progress-store.ts` — children never manage saves.
- Keep characters original (Ocean Buddy and friends); never BebeFinn/Pinkfong/Baby Shark lookalikes.

## 6. Verify before finishing

```bash
npx tsc --noEmit     # strict mode, no `any`
npx vitest run       # unit tests (also `npm test`)
```

`npm run lint` is broken in this repo (`next lint` is gone from the installed Next.js) — do not
run it. For a visual check use the `dev` config in `.claude/launch.json`; if a canvas animation
looks frozen in the preview pane, see the `preview-verify-animation` skill.
