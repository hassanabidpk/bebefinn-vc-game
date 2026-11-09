# Bubble Patterns — Design

**Date:** 2026-11-09

**Audience:** ages 2–6, with guided play for younger children

**Status:** implemented in English; local validation complete

**Source baseline:** `main` / `17b30b0` (fetched and verified 2026-11-09)

**Visual companion:** [Two new games](../../designs/2026-11-09-two-new-games.html)

## Purpose

Complete a repeating parade of sea treasures by choosing what comes next. The
new skill is recognizing and extending a pattern. Existing Match teaches pair
recall; Shape Sort teaches outline matching; this game makes the relationship
between consecutive objects the lesson.

**Home chip:** 🫧 Patterns

**Game title:** Bubble Patterns

## One round

1. Ocean Buddy blows a row of bubbles containing `shell, starfish, shell,
   starfish, ?`. The last bubble has a bold dotted outline and a hand cue.
2. A short spoken prompt asks what comes next. The row stays visible throughout
   the round. Tapping Replay gently highlights the objects in reading order;
   this is an observation game, not an auditory-memory test.
3. Two large treasure buttons appear beneath the row. Each has a distinct
   silhouette and color. The child taps the missing treasure. No dragging or
   text input is necessary.
4. A correct treasure floats into the final bubble. Buddy repeats the complete
   pattern with a short chime per object, then celebrates. Each completed round
   adds one pearl to a five-pearl bracelet.
5. After the narration finishes, a large Next button appears. Next is explicit;
   the finished pattern remains visible for as long as the child wants.
6. Five completed rounds finish a bracelet. Show a calm celebration and two
   large controls: another bracelet and Home. Replay never removes a reward.

A non-matching choice produces a small friendly bounce. The pattern remains
unchanged, both choices remain available, and the repeated unit receives a
visual bracket. No red state, score loss, buzzer, or forced restart.

## Progression and content

A level is chosen from local progress, not from the child's age or any profile.
Start each new session with one easy warm-up. Complete two rounds without help
before offering the next level; using help never removes progress. All levels
remain available through a parent-facing difficulty control when implemented.

| Level | Pattern | Visible example | Choices | Guidance |
|---|---|---|---|---|
| Discover | AB | shell, starfish, shell, starfish, ? | 2 | Bracket repeated pairs; optional ghost answer |
| Repeat | AAB | fish, fish, shell, fish, fish, ? | 2 | Bracket groups of three |
| Explore | ABB | shell, fish, fish, shell, fish, ? | 3 | Group bracket on request |
| Mix | ABC | shell, fish, starfish, shell, fish, ? | 3 | Group bracket on request |

The longest row has six slots including the answer. On narrow displays use a
3×2 reading path with a visible arrow between rows; never shrink choice targets
or allow wrapping that changes the sequence order. A/B/C are design notation
only and do not appear in the child UI.

MVP: three original SVG symbols (shell, starfish, fish), four pattern families,
and three ordered symbol assignments per family: 12 authored round templates.
Assignments are validated so each symbol in a repeated unit is distinct.
Shuffle choice positions independently of the answer, without repeating the
same answer position more than twice. Ensure the visible prefix establishes at
least one full repeated unit and uniquely determines the next object within
that round's declared pattern family. Do not introduce alternating sizes,
rotations, or color-only distinctions in MVP.

## Help, narration, and access

- Help is always available as a 64px-or-larger hand/lightbulb control. It brackets
  the repeated unit, then points to the correct choice. Helped completion earns
  the same pearl as independent completion.
- After six seconds without interaction, offer one silent hand cue; do not
  repeat spoken prompts automatically. Any input cancels the idle cue.
- English is the language for labels and narration. New strings use a typed
  English message catalog rather than component literals.
- Example prompt: “What comes next?”
- Example completion: “You made a pattern!”
- Asset labels: Shell, Starfish, Fish.
- Replay and Help must work with muted or unavailable speech through the same
  visual cues. Browser speech uses `en-US`; cloud TTS is used only if
  the existing server pipeline explicitly supports and allowlists that locale.
- Roving focus follows row reading order; choice buttons are native buttons.
  Enter/Space selects, 1–3 selects the corresponding visible choice, and focus
  never advances itself during narration. Screen-reader labels describe the
  sequence and each choice without revealing the answer.
- Background music pauses or ducks under narration. No microphone, recording,
  child name, time pressure, or network dependency is part of the design.

## State and persistence

States: `showing → choosing → revealing → completed`; `help` is a flag on
`choosing`, not another answer path. A synchronous input guard accepts one answer
per round. All speech completion callbacks and animation timers carry a round
identifier and are cancelled on Home, Next, or unmount. A bounded fallback
reveals Next after a stalled speech engine; it never submits an answer.

Use a separate device-only `ocean-buddy-patterns-v1` key. Store version, highest
level reached, completed bracelet count, current bracelet's completed round
count, active template ID, and choice order. Save after each accepted answer;
validate IDs and bounds on load. A reload of a completed round resumes its
completed state without awarding another pearl. Bad data starts an easy round.
Unavailable storage keeps the whole game playable in memory. Existing sticker
progress is untouched in MVP; pearls belong to this game's bracelet.

## Implementation map (proposed files)

- `src/lib/patterns-data.ts`: symbol IDs, authored templates, seeded round
  selection, expected-answer and progression helpers; pure and unit-testable.
- `src/lib/patterns-progress.ts`: versioned parser and best-effort device storage.
- `src/lib/game-messages.ts`: typed English messages for the two new games.
- `src/components/game/patterns-screen.tsx`: rendering and state transitions.
- `src/components/game/sea-symbol.tsx`: original SVG symbols shared with Builder.
- `src/app/page.tsx`: lazy-loaded `patterns` mode and existing audio cleanup.
- `src/components/game/home-screen.tsx` and `src/app/globals.css`: chip, responsive
  layout, clear focus, reduced-motion support. Home remains at most two taps away.

## Acceptance criteria

- Every authored template has a valid, unambiguous next symbol and exactly one
  matching choice. Distractors and choice positions meet the stated rules.
- Wrong/help/replay interactions cannot increment pearls; duplicate taps and
  stale callbacks cannot complete or advance a round twice.
- A helped round earns one pearl; reload, Next, Home and unavailable storage do
  not lose or duplicate completed progress.
- Test English prompts and browser-voice fallback; no runtime
  arbitrary-text TTS requests. A silent browser can complete the whole game.
- Browser-test a full bracelet, hint use, mismatch recovery, reload during reveal,
  keyboard selection, Next after speech stall, and reduced motion.
- Verify actual transformed button bounds are ≥64px at 360×800, 800×360, and
  1024×768, with all six sequence slots visible. Test a real touch device before
  shipping. Parent document mockups are not touch-size proof for the real game.

## Exclusions

No new paid media, rhythm scoring, hidden-sequence memory mode, online accounts,
leaderboards, new global reward schema, or automatic production deployment.

## Implementation notes — 2026-11-09

The new modes render outside the legacy scaled/rotated iPad shell, using actual
viewport pixels. This keeps their controls upright and at least 64px in the
tested phone/tablet viewports. Home uses two pages of seven games plus a page
button. Existing modes retain their rendering shell. No paid generation or
cloud TTS requests are used by these new games.

`npm test`, TypeScript, and the production build passed. Browser checks cover
completion, reloads, unavailable storage, stalled speech, keyboard/touch-sized
controls, and 360×800, 800×360, and 1024×768 layouts. Real-device touch and
audible voice quality remain unverified.

The active saved puzzle resumes when returning. Each new bracelet starts with
an easy warm-up while preserving the highest unlocked difficulty.
