# AGENTS.md — BebeFinn Kids Game

## Project Overview

A fun, educational, and interactive game for young children (ages 2-6) featuring **BebeFinn** (아기상어 베베핀) characters. The game is designed to be simple, colorful, and safe for toddlers and preschoolers.

## Characters

- **BebeFinn (베베핀)** — The main baby shark character, playful and curious
- **Brooklyn (브루클린)** — BebeFinn's older sister, helpful and adventurous
- **Mommy Shark / Daddy Shark** — Supporting parent characters
- **Pinkfong (핑크퐁)** — The pink fox companion
- Other sea creature friends (turtles, octopus, starfish, etc.)

## Tech Stack

- **Framework**: Next.js (React) with TypeScript
- **Styling**: Tailwind CSS v4
- **3D / Game Rendering**: Three.js for animated animal stages; HTML/CSS for the main alphabet UI
- **Audio**: Web Audio API for generated background music, interaction sounds, alphabet calls, and animal sounds
- **Speech**: Browser speech synthesis through `src/hooks/use-speech.ts`
- **Animation**: Framer Motion for UI transitions; Three.js `requestAnimationFrame` loops for animal scenes
- **State Management**: Local React state for the current game flow
- **Deployment**: Vercel

## Project Structure

```
bebefinn-vc-game/
├── AGENTS.md
├── CLAUDE.md              # Defers to AGENTS.md
├── public/
│   ├── assets/
│   │   └── images/         # Character sprites and placeholder art
│   └── favicon.ico
├── src/
│   ├── app/                # Next.js app router pages and globals.css
│   ├── components/
│   │   ├── ui/             # Reusable UI components (buttons, modals, menus)
│   │   └── game/           # Alphabet game, BebeFinn character, Three.js animal stage
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Shared utilities, constants, types
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Current Gameplay

- The active experience is **BebeFinn Alphabet Adventure**, a toddler-friendly alphabet and numbers practice game.
- Lessons are defined in `src/lib/alphabet-data.ts`. Keep custom family/person labels exactly as requested by the user unless asked to change them.
- Keyboard shortcuts jump directly to lessons: `A-Z` for letters, `1-9` for numbers, and `0` for `10`.
- Number lessons should speak simply as `1 for 1`, `2 for 2`, etc. Do not add a repeated leading number.
- Animal lessons use `src/components/game/animal-stage.tsx`, which combines a Three.js animated stage with a crisp visible animal layer so children can clearly see the animal.
- Animal lessons also play generated animal sounds from `src/hooks/use-game-audio.ts`.
- The lesson reveal flow should keep a short suspense moment first so the child can guess, then reveal the answer, speak it, and play the animal sound when applicable.

## Design Principles

### Child Safety First
- No external links or ads — fully self-contained experience
- No text input from children — interaction is tap/click/drag only
- No in-app purchases or monetization prompts
- No data collection from users
- All content is age-appropriate and parent-approved

### UI/UX for Young Children
- **Large, colorful buttons** — minimum 64px touch targets
- **Simple navigation** — maximum 2 taps to reach any game
- **No reading required** — use icons, images, and audio cues for all instructions
- **Positive reinforcement only** — no fail states, celebrate every interaction
- **Auto-save** — children don't manage saves
- **Parent gate** — settings/exit behind a simple parent-only gate (e.g., hold two buttons simultaneously)

### Visual Style
- Bright, saturated colors matching BebeFinn's palette (ocean blues, coral pinks, sunny yellows)
- Rounded corners on everything — soft, friendly shapes
- Large character sprites with expressive animations
- Ocean / underwater themed backgrounds
- Consistent art style across all screens

### Audio Design
- Background music should be cheerful, vibrant, looping, and suitable for a 4-year-old, while still tolerable for parents.
- Sound effects should play on taps, navigation, suspense/reveal, celebrations, alphabet calls, and animal lessons.
- Prefer generated Web Audio sounds unless real licensed assets are intentionally added.
- Keep music and SFX conceptually separate, with music controlled by the in-game music toggle.
- Animal sounds should be playful and recognizable rather than realistic or scary.

## Game Modes / Mini-Games

1. **Learn & Play** — Alphabet, numbers, colors, shapes with BebeFinn
2. **Ocean Adventure** — Tap-to-swim exploration collecting items
3. **Music & Dance** — Rhythm/music game with BebeFinn songs
4. **Puzzle Time** — Simple jigsaw and matching puzzles
5. **Coloring Book** — Digital coloring with BebeFinn characters
6. **Memory Match** — Card-flipping memory game with sea creatures

## Coding Conventions

### General
- Use TypeScript strict mode — no `any` types
- Functional components only — no class components
- Use named exports, not default exports
- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- One component per file
- Keep the main child-facing game free of text inputs, external links, ads, purchases, and data collection.

### Component Pattern
```tsx
// src/components/game/character-sprite.tsx
interface CharacterSpriteProps {
  character: CharacterType;
  animation: AnimationState;
  size?: number;
}

export function CharacterSprite({ character, animation, size = 128 }: CharacterSpriteProps) {
  // ...
}
```

### Game Development
- Keep game logic separate from React rendering
- Use `requestAnimationFrame` for the game loop, not `setInterval`
- All game assets must be preloaded before scene start
- Support both touch and mouse input
- Target 60fps on mobile devices
- Use sprite sheets for character animations to reduce HTTP requests
- For Three.js scenes, keep stable canvas dimensions, dispose geometries/materials/renderers on cleanup, and verify the canvas is visible in the browser.
- Do not rely on faint canvas-only visuals for toddler-facing animals; keep the animal itself clear, large, and high contrast.

### Performance
- Lazy load game scenes — only load assets for the active mini-game
- Compress all images (WebP preferred, PNG fallback)
- Audio files in `.mp3` + `.ogg` for browser compatibility
- Keep bundle size minimal — code-split by route/game

### Accessibility
- Support both portrait and landscape orientations
- Minimum contrast ratio 4.5:1 for any text
- All interactive elements have visible focus states
- Support screen readers for parent-facing UI

## Testing

- Unit tests: Vitest for game logic and utilities
- Component tests: React Testing Library
- E2E tests: Playwright for critical user flows
- Test on real mobile devices — this is primarily a touch-based game

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npx tsc --noEmit     # TypeScript check
```

Notes:
- Test scripts are not configured yet. Add Vitest/Playwright scripts before relying on `npm run test` or `npm run test:e2e`.
- `npm run lint` currently points to `next lint`, which is not available in the installed Next.js version and may open an interactive setup flow. Use `npx tsc --noEmit` and `npm run build` for verification until linting is reconfigured.
- Avoid running `npm run build` at the same time as `npm run dev`; Next.js can mutate `.next` during both commands.

## Important Notes

- **All character assets are placeholders during development.** Final art must come from licensed BebeFinn/Pinkfong assets or original illustrations matching the style.
- **Bilingual support**: Korean (primary) and English. All user-facing strings should go through an i18n system.
- **Mobile-first**: Design for phones/tablets first, desktop is secondary.
- **Offline capable**: Consider PWA support so kids can play without internet.
