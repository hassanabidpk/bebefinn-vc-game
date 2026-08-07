/**
 * Photo → 3D figurine pipeline for the ride games.
 *
 * Takes a real animal photo shot on a plain white studio background and
 * turns it into a chunky 3D object at runtime:
 *
 *   1. key out the white background (flood fill from the borders, so white
 *      details inside the animal survive),
 *   2. trace the animal's silhouette (Moore boundary tracing on a
 *      downsampled mask, Douglas-Peucker simplified),
 *   3. extrude the silhouette with a soft bevel and texture the faces with
 *      the real photo — a thick photographic figurine, like a wooden toy
 *      cut from the picture.
 *
 * Everything happens in-browser with canvas — no external services.
 */

import * as THREE from "three";

export interface FigurineOptions {
  /** World height of the animal itself (not the whole photo). */
  height: number;
  /** World thickness of the figurine slab. */
  depth: number;
  /** Colour of the extruded sides (pick something near the animal's own). */
  sideColor: number;
}

interface FigurineAsset {
  geometry: THREE.ExtrudeGeometry;
  texture: THREE.CanvasTexture;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const KEY_SIZE = 512; // texture + keying resolution
const TRACE_SIZE = 160; // silhouette tracing resolution
const WHITE_TOLERANCE = 34; // max distance from white to count as background

const assetCache = new Map<string, Promise<FigurineAsset>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

/** Flood-fill near-white pixels connected to the border → transparent. */
function keyOutBackground(ctx: CanvasRenderingContext2D, size: number) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  const isBackgroundish = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return 255 - Math.min(r, g, b) < WHITE_TOLERANCE;
  };
  const visited = new Uint8Array(size * size);
  const queue: number[] = [];
  for (let x = 0; x < size; x += 1) {
    queue.push(x, (size - 1) * size + x);
  }
  for (let y = 0; y < size; y += 1) {
    queue.push(y * size, y * size + size - 1);
  }
  while (queue.length) {
    const p = queue.pop() as number;
    if (visited[p]) continue;
    visited[p] = 1;
    if (!isBackgroundish(p * 4)) continue;
    data[p * 4 + 3] = 0;
    const x = p % size;
    const y = (p / size) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < size - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - size);
    if (y < size - 1) queue.push(p + size);
  }
  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

/** Downsample the alpha channel into a binary mask, keep largest blob. */
function buildMask(imageData: ImageData, from: number, to: number): Uint8Array {
  const mask = new Uint8Array(to * to);
  const ratio = from / to;
  for (let y = 0; y < to; y += 1) {
    for (let x = 0; x < to; x += 1) {
      // Sample a small neighbourhood so thin legs survive downsampling.
      let hits = 0;
      for (let dy = 0; dy < ratio; dy += 2) {
        for (let dx = 0; dx < ratio; dx += 2) {
          const sx = Math.min(from - 1, (x * ratio + dx) | 0);
          const sy = Math.min(from - 1, (y * ratio + dy) | 0);
          if (imageData.data[(sy * from + sx) * 4 + 3] > 96) hits += 1;
        }
      }
      mask[y * to + x] = hits >= 2 ? 1 : 0;
    }
  }

  // Keep only the largest connected component.
  const labels = new Int32Array(to * to).fill(-1);
  let bestLabel = -1;
  let bestCount = 0;
  let label = 0;
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start] >= 0) continue;
    let count = 0;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop() as number;
      if (p < 0 || p >= mask.length || !mask[p] || labels[p] >= 0) continue;
      labels[p] = label;
      count += 1;
      const x = p % to;
      if (x > 0) stack.push(p - 1);
      if (x < to - 1) stack.push(p + 1);
      stack.push(p - to, p + to);
    }
    if (count > bestCount) {
      bestCount = count;
      bestLabel = label;
    }
    label += 1;
  }
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = labels[i] === bestLabel ? 1 : 0;
  }
  return mask;
}

/** Moore boundary tracing — returns the outer contour, clockwise-ish. */
function traceContour(mask: Uint8Array, size: number): Array<[number, number]> {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size ? mask[y * size + x] : 0;

  let startX = -1;
  let startY = -1;
  outer: for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (at(x, y)) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }
  if (startX < 0) return [];

  // 8-neighbour offsets, clockwise starting from west.
  const offsets: Array<[number, number]> = [
    [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1],
  ];
  const contour: Array<[number, number]> = [[startX, startY]];
  let cx = startX;
  let cy = startY;
  let backtrack = 0; // came from the west
  const maxSteps = size * size * 4;
  for (let step = 0; step < maxSteps; step += 1) {
    let found = false;
    for (let i = 0; i < 8; i += 1) {
      const dir = (backtrack + 1 + i) % 8;
      const nx = cx + offsets[dir][0];
      const ny = cy + offsets[dir][1];
      if (at(nx, ny)) {
        // Remember where we came from relative to the new pixel.
        backtrack = (dir + 4) % 8;
        cx = nx;
        cy = ny;
        contour.push([cx, cy]);
        found = true;
        break;
      }
    }
    if (!found) break; // isolated pixel
    if (cx === startX && cy === startY && contour.length > 3) break;
  }
  return contour;
}

/**
 * Iterative Douglas-Peucker simplification. The contour is a closed loop
 * (first point ≈ last point), so a plain first-to-last pass would measure
 * distances against a degenerate zero-length chord and collapse the whole
 * shape — anchor a third point mid-loop and simplify the two halves.
 */
function simplifyContour(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length < 6) return points;
  const keep = new Uint8Array(points.length);
  const mid = points.length >> 1;
  keep[0] = 1;
  keep[mid] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, mid], [mid, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop() as [number, number];
    const [x1, y1] = points[first];
    const [x2, y2] = points[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const norm = Math.hypot(dx, dy) || 1;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = points[i];
      const dist = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm;
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > epsilon && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i] === 1);
}

async function buildAsset(url: string, depthWorldPerHeight: number): Promise<FigurineAsset> {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = KEY_SIZE;
  canvas.height = KEY_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  // Cover the square canvas; generated photos are square already.
  ctx.drawImage(image, 0, 0, KEY_SIZE, KEY_SIZE);
  const keyed = keyOutBackground(ctx, KEY_SIZE);

  const mask = buildMask(keyed, KEY_SIZE, TRACE_SIZE);
  const contour = simplifyContour(traceContour(mask, TRACE_SIZE), 1.35);
  if (contour.length < 8) throw new Error(`silhouette trace failed for ${url}`);

  // Shape in image-UV space (0..1, y up) so extrude UVs sample the photo 1:1.
  const shape = new THREE.Shape();
  contour.forEach(([x, y], i) => {
    const u = x / TRACE_SIZE;
    const v = 1 - y / TRACE_SIZE;
    if (i === 0) shape.moveTo(u, v);
    else shape.lineTo(u, v);
  });
  shape.closePath();

  // Animal bounding box inside the photo, for scaling and grounding.
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const [x, y] of contour) {
    const u = x / TRACE_SIZE;
    const v = 1 - y / TRACE_SIZE;
    minX = Math.min(minX, u);
    maxX = Math.max(maxX, u);
    minY = Math.min(minY, v);
    maxY = Math.max(maxY, v);
  }
  const animalHeight = Math.max(0.05, maxY - minY);
  const scale = 1 / animalHeight; // multiply by world height later
  const depth = depthWorldPerHeight * animalHeight;

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.18,
    bevelSize: 0.008,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.translate(-(minX + maxX) / 2, -minY, -depth / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return { geometry, texture, scale, offsetX: 0, offsetY: 0 };
}

/**
 * Build (and cache) the figurine for a photo. Returns a fresh group each
 * call; geometry and texture are shared between instances.
 */
export async function loadFigurine(url: string, options: FigurineOptions): Promise<THREE.Group> {
  const cacheKey = `${url}|${options.depth}`;
  let pending = assetCache.get(cacheKey);
  if (!pending) {
    pending = buildAsset(url, options.depth / options.height);
    assetCache.set(cacheKey, pending);
  }
  const asset = await pending;

  const photoMaterial = new THREE.MeshStandardMaterial({
    map: asset.texture,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.62,
    metalness: 0.02,
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    color: options.sideColor,
    roughness: 0.8,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(asset.geometry, [photoMaterial, sideMaterial]);
  const worldScale = asset.scale * options.height;
  mesh.scale.setScalar(worldScale);
  mesh.castShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  return group;
}
