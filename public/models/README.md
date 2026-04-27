# 3D Model Drop-in

Drop CC0 / CC-BY GLB models here using the exact filename `<animal>.glb`:

```
public/models/
├── cat.glb
├── dog.glb
├── elephant.glb
├── fish.glb
├── gorilla.glb
├── jellyfish.glb
├── lion.glb
├── turtle.glb
├── whale.glb
└── zebra.glb
```

## Behavior

`<AnimalStage>` chains assets per animal:

1. **GLB model** — if `/models/<animal>.glb` returns 200, render with Three.js `GLTFLoader`. Auto-fits via bounding box, plays first matching `idle` / `walk` / `swim` animation, supports drag-to-rotate, auto-spins idle, applies per-animal lighting and ground shadow.
2. **Video** — if no model is found, falls back to `/videos/<animal>.webm` (with `.mp4` fallback for Safari).
3. **Emoji** — if neither is available, the parent card falls back to the entry's emoji.

You can populate models incrementally; missing animals keep using video.

## Recommended free CC0 sources

- **Quaternius** — https://quaternius.com/ → "Ultimate Animated Animals" pack (CC0). Free download via Patreon login, no payment needed.
- **Quaternius itch.io** — https://quaternius.itch.io/lowpoly-animated-animals
- **Kenney** — https://kenney.nl/assets (search "animal", some 3D packs)
- **Sketchfab** — https://sketchfab.com/3d-models?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b (CC0 filter)
- **Poly Pizza** — https://poly.pizza/

## Format requirements

- **Format**: `.glb` (binary glTF 2.0). Convert `.gltf`/`.fbx`/`.obj` with `gltf-transform` or Blender export.
- **Size**: aim for < 2 MB per animal so first paint stays fast on mobile.
- **Animations**: optional but encouraged. The loader picks the first clip whose name matches `idle` → `walk|swim|fly` → first available.
- **Orientation**: face the model toward `+Z` (camera at `+Z`); the auto-fit centers and scales for you.
- **Up axis**: `+Y` up. Models with `+Z` up should be re-exported.

## Compressing big models

```bash
# Install once
npm i -g @gltf-transform/cli

# Drop-in optimize: dedupe meshes, prune unused, draco-compress geometry
gltf-transform optimize input.glb output.glb \
  --texture-compress webp \
  --texture-resize 1024
```
