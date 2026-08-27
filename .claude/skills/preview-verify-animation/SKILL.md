---
name: preview-verify-animation
description: Verify canvas/Three.js animation in the Claude in-app browser preview, where requestAnimationFrame is suspended and scenes look frozen. Use when a dance/mascot/animal stage renders one frame and never moves in the preview pane, or before concluding an animation is broken.
---

# Verifying animation in the in-app preview pane

## The symptom, and why it is not a bug

The preview pane loads pages with `document.visibilityState === "hidden"`, so Chrome suspends
`requestAnimationFrame` entirely. Any loop in this repo — `dance-mascot-stage.tsx`, `animal-stage.tsx`,
any Three.js scene — renders its **first frame and then appears permanently frozen**. Screenshots
come back byte-identical with zero console errors.

This is an environment limitation. Real, visible browser tabs are fine. Do **not** "fix" the app in
response to it. Confirm the diagnosis first:

```js
// javascript_tool
({ visibility: document.visibilityState, hidden: document.hidden })
```

`"hidden"` / `true` means you are hitting this, not an app defect. Three.js code that uses
`THREE.Timer().connect(document)` additionally zeroes its deltas while hidden, so the world renders
but nothing moves even if you only patched RAF.

## The workaround

Order matters — a full page load clears the patch, so inject on a screen where the animation is
**not yet mounted** (e.g. the home screen), then navigate *client-side* into the animated screen.

1. `preview_start` / `navigate` to `http://localhost:3000` (config `dev` in `.claude/launch.json`).
   Stay on Home.
2. Inject the shim below with `javascript_tool`.
3. Click through to the animated screen with `computer` (the Dance / Rescue chip) — client-side
   routing keeps the patch alive. Never `navigate` or reload to get there.
4. Screenshot at intervals (`computer` `screenshot`, with `wait` between) — each tick advances the
   virtual clock, so successive shots land on different animation phases.
5. **Reload the page when done** so nothing keeps running on the accelerated clock.

## The shim

```js
(() => {
  // 1. Make the document look visible (Three.js Timer + app-level guards).
  Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
  Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));

  // 2. Virtual clock — advances only when we pump it.
  let vnow = performance.now();
  const realNow = performance.now.bind(performance);
  performance.now = () => vnow;

  // 3. RAF queue pumped by setInterval (timers still fire while hidden).
  let nextId = 1;
  const queue = new Map();
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };

  const FRAME_MS = 1000 / 60;
  const FRAMES_PER_TICK = 30;   // ~0.5s of virtual time per 50ms tick
  window.__rafPump = setInterval(() => {
    for (let i = 0; i < FRAMES_PER_TICK; i++) {
      vnow += FRAME_MS;
      const due = [...queue.entries()];
      queue.clear();
      for (const [, cb] of due) { try { cb(vnow); } catch (e) { console.error(e); } }
    }
  }, 50);

  return { patched: true, realNow: realNow() };
})()
```

Stop it early with `clearInterval(window.__rafPump)`, or just reload.

Sanity check that frames are actually running:

```js
(() => { let n = 0; const t = (x) => { n++; requestAnimationFrame(t); }; requestAnimationFrame(t);
  return new Promise(r => setTimeout(() => r({ framesIn300ms: n }), 300)); })()
```

## Notes and fallbacks

- Tune `FRAMES_PER_TICK` down (e.g. 6) if you want to observe a fast animation in slower motion,
  up if you need to reach a late phase of a long choreography quickly.
- Animations gated on `prefers-reduced-motion: reduce` stay static by design (see the
  `reducedMotion` branches in `dance-mascot-stage.tsx`). Use `resize_window` with
  `colorScheme`/preset changes only for layout; to test the motion path make sure the pane is not
  emulating reduced motion.
- The pane's WebGL context can die session-wide (`BindToCurrentSequence failed`). A fresh session
  usually restores it; otherwise fall back to the `claude-in-chrome` tools against a real tab,
  where RAF works normally and no shim is needed.
- The shim is a verification aid only — never commit any part of it.
