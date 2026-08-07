# Safari Ride & Ocean Dive — Design

**Date:** 2026-08-07
**Audience:** children ages 4–6
**Status:** approved-by-default (autonomous session; user asked "plan and implement")

## Goal

Two new mini-games inside Ocean Buddy:

1. **Safari Ride** — child rides a jeep along a looping savanna track and meets safari animals.
2. **Ocean Dive** — child pilots a little submarine along an underwater loop and meets sea animals.

Both share one ride engine with two modes:

- **Auto mode (default)** — vehicle drives itself along the track. Near each animal it slows, stops for a moment, the animal is highlighted (glow ring + bounce), its name is spoken, its sound plays, and a big picture card appears. Then the ride continues.
- **Drive mode** — child controls the vehicle with arrow keys or large on-screen arrow buttons. Up = forward, Down = backward, Left/Right = slide sideways within the lane. Driving near an animal triggers the same highlight + announcement (without force-stopping).

Seeing all animals in a lap triggers a confetti celebration, then the counter resets so the ride loops forever. No fail states.

## Engine choice

**Three.js** (MIT, open source) — already a project dependency and named in AGENTS.md as the 3D layer. No new packages. A drive-through/swim-through world is naturally 3D; Phaser/Kaboom would add a second paradigm and bundle weight for no gain.

## Architecture

Game logic stays out of React (per AGENTS.md). All visuals are procedural low-poly primitives — no new binary assets, fully offline-safe, nothing copyrighted.

```
src/lib/ride-math.ts        Pure helpers: wrapped track distance, encounter pick (unit-tested)
src/lib/ride-data.ts        Ride configs: animals (word, emoji, color, track position t, side, soundKey?), titles, theme
src/lib/ride-engine.ts      RideEngine class: renderer, closed Catmull-Rom track, chase camera,
                            auto/manual movement, encounter detection, highlight ring, dispose()
src/lib/safari-world.ts     buildSafariWorld(): savanna env, jeep, 6 animal mesh builders
src/lib/ocean-world.ts      buildOceanWorld(): underwater env, submarine, 6 animal mesh builders
src/components/game/ride-screen.tsx   React shell: canvas mount, header, mode toggle,
                                      arrow pad, encounter card, confetti, speech + sounds
```

- `page.tsx` gains `safari` and `ocean` screens; `home-screen.tsx` gains 🚙 Safari and 🌊 Dive chips.
- Engine → React communication via callbacks: `onEncounter(word)`, `onEncounterEnd()`, `onLap()`.
- React → engine via methods: `setMode("auto" | "drive")`, `setInput(dir, pressed)`, `dispose()`.

## Animals

| Safari | Ocean |
|---|---|
| Lion, Elephant, Giraffe, Zebra, Monkey, Hippo | Whale, Dolphin, Turtle, Octopus, Shark, Jellyfish |

All twelve already exist in `alphabet-data.ts` (emoji + color) and `animal-info.ts` (spoken fact). Encounter announcement: name + short fact via `useFriendlySpeech`; animal sound via existing `playAnimalSound` where an authentic sound exists (lion, elephant, zebra, whale, turtle, jellyfish, monkey→gorilla hoot); otherwise the celebrate chime.

## Kid-safety / UX

- Touch-first: on-screen arrow buttons ≥ 64px; keyboard arrows also work; any arrow press switches Auto → Drive.
- No reading required: mode toggle uses icons, animals announced by voice, encounter card is emoji + word.
- Positive only: no timers, no fail states, confetti on completing a lap of sightings.
- Three.js hygiene: stable canvas sized to the ipad-screen, `requestAnimationFrame` loop, full dispose of geometries/materials/renderer on unmount, pixel ratio capped at 2 for mobile 60fps.
- Animals are large, bright, high-contrast, gently animated (idle bob) — never faint canvas ghosts.

## Testing / verification

- `src/lib/ride-math.test.ts` (Vitest): wrapped distance and encounter selection edge cases (loop seam, visited skip, nearest-first).
- `npx tsc --noEmit` clean.
- Browser verification on the dev server: both games render, auto mode stops and announces, arrows drive, no console errors; screenshots captured.
