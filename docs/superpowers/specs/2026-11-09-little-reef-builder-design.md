# Little Reef Builder — Design

**Date:** 2026-11-09

**Audience:** ages 2–6, with visual modeling for younger children

**Status:** implemented in English; local validation complete

**Source baseline:** `main` / `17b30b0` (fetched and verified 2026-11-09)

**Visual companion:** [Two new games](../../designs/2026-11-09-two-new-games.html)

## Purpose

Help sea friends settle into a little reef by following one spatial instruction
at a time: put the fish **above** the rock, the crab **inside** the cave, or the
shell **beside** the seaweed. Each placement visibly changes a living scene.

The new skill is understanding spatial language relative to a landmark. Unlike
Shape Sort, destinations do not share the object's outline: success depends on
where the friend belongs, not on matching a silhouette. Unlike Count & Feed,
there is no target count or repeated feeding action.

**Home chip:** 🪸 Build

**Game title:** Little Reef Builder

## One reef

1. Show a small scene with a central rock, a wide cave opening, and seaweed.
   Buddy models the first relation once using a ghost object and a hand.
2. Give one instruction, such as “Put the fish above the rock.” Show the fish
   in a large tray button and a small pictorial instruction card: a fish dot
   over a rock. There is no written sentence to decode in the child UI.
3. Tap the object, then a destination pad. Optional dragging supports children
   who prefer it, but the complete game works through two taps.
4. A correct placement snaps the friend into place and names the relationship:
   “Above the rock!” The friend swims or waves once; the rest of the reef stays
   calm. A Next arrow appears after narration and waits for the child.
5. A non-matching pad gives a gentle ripple and returns the object to the tray.
   Buddy demonstrates the correct relation with a translucent ghost; the child
   still makes the placement. No loss, negative sound, or reset.
6. Four placements complete a reef. Celebrate the scene, award one reef tile,
   and offer Replay Reef, New Reef, and Home. A saved shelf shows the three
   completed scene themes; repeating a scene does not create duplicate tiles.

The instruction card can be tapped to replay both narration and the visual
model. Help remains available; supported completion earns the same tile.

## Relations and progression

| Level | Relation vocabulary | Destinations | Presentation |
|---|---|---|---|
| Discover | above, below | 2 | Uncluttered rock and fish; visual model stays visible |
| Explore | inside, beside | 2–3 | Wide cave mouth; one marked beside pad |
| Build | mix all four | 3 | One instruction at a time; model available on tap |

MVP: three fixed scene themes (Sunny Reef, Shell Cove, Kelp Garden), four
placements per scene, and four relation types. Each scene contains one of each
relation. The first play begins with guided above/below examples before the
remaining relations. Unlock later themes through completion; never lock a
previously earned reef again.

Destination pads are authored semantic targets, not pixel guesses. Each step
has exactly one valid destination ID. For **beside**, show only one eligible
side pad; do not reject an equally valid mirror position. Above/below use the
same landmark reference, not page coordinates. Inside uses a large cave opening
with the entire friend visible and outlined; never hide it behind the rock.

Completed objects remain in the scene but become decorative and cannot
intercept input. New targets must not overlap their footprints. A narrow screen
uses a single scene over the tray, with no 3D camera, scrolling puzzle area, or
rotation-dependent left/right vocabulary.

## Visual and audio direction

Original SVG rock, cave, seaweed, fish, crab, shell, and starfish. Reuse the
project's ocean palette and Buddy mascot. Expose generous neutral landing pads;
reserve the friendly glow for the selected/assisted destination. Do not make the
correct target obvious by copying the piece silhouette into it.

English labels and narration use the same typed catalog as Bubble Patterns.
The relation is the emphasized part of each spoken line and visual model:

| Key | English |
|---|---|
| `builder.above` | Put the fish above the rock. |
| `builder.below` | Put the starfish below the rock. |
| `builder.inside` | Put the crab inside the cave. |
| `builder.beside` | Put the shell beside the seaweed. |
| `builder.complete` | You built a lovely reef! |

Use `en-US` browser speech with visual equivalents. Existing cloud voice
support and phrase allowlisting must be verified before using cloud narration
for English narration. No additional generated assets or paid calls are required.
Music and SFX remain separate; narration takes priority over background music.

## Input, accessibility, and safety

- Tap object → tap pad is the primary interaction. Tap again to deselect. Tapping
  a pad without a selection highlights the tray and leaves the scene unchanged.
- Drag is optional: Pointer Events, single active pointer, pointer capture, a
  small movement threshold, and an enlarged non-overlapping catch region.
  Resolve an ambiguous drop by nearest eligible pad center, with a stable tie
  rule. A cancelled pointer resets the piece without submitting a placement.
- The existing iPad shell can scale and rotate ancestors. Convert screen deltas
  using its actual transform, reusing Shape Sort's tested transform helpers;
  do not subtract layout offsets from viewport coordinates.
- All active objects, target pads, Replay, Next, and Home must measure at least
  64px after transforms. If three destinations do not fit, use two for that
  viewport rather than shrinking them. Reflow on rotation without changing IDs.
- Tab focuses the object, then pads; Enter/Space completes the tap path. Native
  buttons have visible focus. Screen-reader pad labels describe their relative
  position. The complete exercise works without color discrimination or sound.
- Respect reduced motion: instant snap, static glow, no bouncing ocean scene.
  No timers, penalties, child text inputs, microphones, accounts, or analytics.

## State, replay, and saving

States: `instruction → selecting → placing → completed-step → completed-reef`.
The same pure placement validator handles drag, tap, and keyboard paths. Lock
placement synchronously after the first accepted answer. Increment step progress
once; run animation and speech independently of that saved decision. A stalled
voice cannot block Next indefinitely. Cancel pending speech and timers when
leaving, selecting a new reef, replaying, or unmounting.

Separate device-only `ocean-buddy-builder-v1` key: version, scene ID, completed
step IDs, current step ID, and earned scene IDs. Positions derive from authored
scene data rather than saved screen pixels, so orientation changes and reloads
cannot scatter objects. Validate all scene and step IDs. Save each placement
before celebration; reload resumes at the next unfinished instruction. Save
unique reef IDs before showing the final reward. Replay resets the scene's
placements while preserving earned tiles. Guard storage errors and continue in
memory; corrupt data falls back to the guided first scene.

## Implementation map (proposed files)

- `src/lib/reef-builder-data.ts`: typed scenes, landmarks, semantic targets,
  step definitions, relation validator and step selection; pure logic.
- `src/lib/reef-builder-progress.ts`: guarded save/load and unique tile awards.
- `src/components/game/reef-builder-screen.tsx`: state, input and rendering.
- `src/components/game/reef-builder-scene.tsx`: accessible SVG scene plus native
  HTML button overlays, all using one normalized coordinate system.
- Reuse `sea-symbol.tsx`, the typed new-game message catalog, Buddy, ocean
  background, celebration, and sound hooks.
- Lazy-load `builder` from `src/app/page.tsx`; add its home chip and responsive
  styles. No modifications to current lesson data or existing sticker payloads.

## Acceptance criteria

- Every scene has four non-overlapping, reachable steps with exactly one valid
  semantic target each; no accepted placement depends on a color or shape match.
- A full reef is completable using taps, keyboard, or optional drag. Verify all
  three paths with the same validator and include wrong-pad and cancelled-drag cases.
- Rapid duplicate input, pointer cancellation, Home during speech, reload between
  save and celebration, and replay cannot duplicate tiles or lose completed steps.
- Rotation preserves placements. Test scaled/rotated hit areas, 64px measured
  targets, 360×800, 800×360, and 1024×768; confirm on a real touch device before ship.
- English narration and silent/blocked speech all expose the same visual task and
  allow Next. Reduced-motion play remains fully usable.
- Back home stops narration; saved legacy sticker and coloring data remain intact.

## Exclusions

No physics sandbox, collision simulation, 3D asset loading, left/right quizzes,
multiple-step spoken instructions, global sticker migration, or deployment.

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

Builder saves an ordered completed-step count (the authored steps form a fixed
prefix), and uses client-space drop targets because its new layout has no
scaled ancestor. The shelf preserves unique scene tiles across replay.
