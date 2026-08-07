/**
 * Photo → 3D figurine pipeline for the ride games.
 *
 * Takes a real animal photo shot on a plain white studio background and
 * turns it into a rounded, genuinely 3D object at runtime:
 *
 *   1. key out the white background (flood fill from the borders, so white
 *      details inside the animal survive),
 *   2. build a distance field over the animal's silhouette (how far each
 *      pixel sits from the nearest edge),
 *   3. inflate: a front and back sheet of a subdivided grid are displaced
 *      by the square root of the distance field — fat through the belly,
 *      tapering to nothing at the outline, exactly like a plush toy sewn
 *      from the photograph — then normals are computed so lighting shades
 *      the curvature as a real rounded body.
 *
 * Everything happens in-browser with canvas — no external services.
 */

import * as THREE from "three";

export interface FigurineOptions {
  /** World height of the animal itself (not the whole photo). */
  height: number;
  /** World thickness of the animal through its fattest part. */
  depth: number;
}

interface FigurineAsset {
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture;
  scale: number;
}

const KEY_SIZE = 768; // texture + keying resolution
const FIELD_SIZE = 160; // distance-field resolution
const DEPTH_SIZE = 96; // depth-map sampling resolution
const GRID = 80; // inflation mesh resolution across the animal's bbox
const WHITE_TOLERANCE = 34; // max distance from white to count as background
/** How much of the relief comes from the AI depth map vs pure inflation. */
const DEPTH_WEIGHT = 0.5;

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
function keyOutBackground(ctx: CanvasRenderingContext2D, size: number): ImageData {
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

  // Second pass: white background trapped in enclosed pockets (e.g. the
  // gap under a belly, fenced in by legs) never touches the border, so the
  // flood fill misses it. Clear any LARGE remaining near-white region —
  // genuine white details like tusks and eyes are tiny and survive.
  const seen = new Uint8Array(size * size);
  const pocketLimit = size * size * 0.001; // ~260px at 512
  const region: number[] = [];
  for (let start = 0; start < size * size; start += 1) {
    if (seen[start] || data[start * 4 + 3] === 0 || !isBackgroundish(start * 4)) continue;
    region.length = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop() as number;
      region.push(p);
      const x = p % size;
      const y = (p / size) | 0;
      for (const n of [x > 0 ? p - 1 : -1, x < size - 1 ? p + 1 : -1, y > 0 ? p - size : -1, y < size - 1 ? p + size : -1]) {
        if (n >= 0 && !seen[n] && data[n * 4 + 3] > 0 && isBackgroundish(n * 4)) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (region.length > pocketLimit) {
      for (const p of region) data[p * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

/** Downsample the alpha channel into a binary mask, keep the largest blob. */
function buildMask(imageData: ImageData, from: number, to: number): Uint8Array {
  const mask = new Uint8Array(to * to);
  const ratio = from / to;
  for (let y = 0; y < to; y += 1) {
    for (let x = 0; x < to; x += 1) {
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

/** Multi-source BFS: distance (in field pixels) from the nearest edge. */
function distanceField(mask: Uint8Array, size: number): Float32Array {
  const dist = new Float32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  for (let p = 0; p < mask.length; p += 1) {
    if (!mask[p]) {
      dist[p] = 0;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % size;
    const y = (p / size) | 0;
    const d = dist[p];
    if (x > 0 && dist[p - 1] < 0) { dist[p - 1] = d + 1; queue[tail++] = p - 1; }
    if (x < size - 1 && dist[p + 1] < 0) { dist[p + 1] = d + 1; queue[tail++] = p + 1; }
    if (y > 0 && dist[p - size] < 0) { dist[p - size] = d + 1; queue[tail++] = p - size; }
    if (y < size - 1 && dist[p + size] < 0) { dist[p + size] = d + 1; queue[tail++] = p + size; }
  }
  return dist;
}

/**
 * Load the AI-estimated depth map (white = near, black = far) as a small
 * blurred luminance grid. The generated maps keep skin texture and are not
 * pixel-aligned with the photo, so we sample at low resolution and blur
 * hard — leaving only the broad depth structure (head forward, far legs
 * back). Returns null when no depth map exists.
 */
async function loadDepthGrid(url: string): Promise<Float32Array | null> {
  let image: HTMLImageElement;
  try {
    image = await loadImage(url);
  } catch {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = DEPTH_SIZE;
  canvas.height = DEPTH_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0, DEPTH_SIZE, DEPTH_SIZE);
  const { data } = ctx.getImageData(0, 0, DEPTH_SIZE, DEPTH_SIZE);
  let grid = new Float32Array(DEPTH_SIZE * DEPTH_SIZE);
  for (let i = 0; i < grid.length; i += 1) {
    grid[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / (3 * 255);
  }
  // Two box-blur passes wash out wrinkles and misalignment.
  for (let pass = 0; pass < 2; pass += 1) {
    const blurred = new Float32Array(grid.length);
    for (let y = 0; y < DEPTH_SIZE; y += 1) {
      for (let x = 0; x < DEPTH_SIZE; x += 1) {
        let sum = 0;
        let n = 0;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            const sx = x + dx;
            const sy = y + dy;
            if (sx < 0 || sy < 0 || sx >= DEPTH_SIZE || sy >= DEPTH_SIZE) continue;
            sum += grid[sy * DEPTH_SIZE + sx];
            n += 1;
          }
        }
        blurred[y * DEPTH_SIZE + x] = sum / n;
      }
    }
    grid = blurred;
  }
  return grid;
}

/** Bilinear sample of the distance field at mask coordinates. */
function sampleField(field: Float32Array, size: number, fx: number, fy: number): number {
  const x = Math.min(size - 1.001, Math.max(0, fx));
  const y = Math.min(size - 1.001, Math.max(0, fy));
  const x0 = x | 0;
  const y0 = y | 0;
  const tx = x - x0;
  const ty = y - y0;
  const a = field[y0 * size + x0];
  const b = field[y0 * size + x0 + 1];
  const c = field[(y0 + 1) * size + x0];
  const d = field[(y0 + 1) * size + x0 + 1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

async function buildAsset(
  url: string,
  depthUrl: string,
  depthPerHeight: number
): Promise<FigurineAsset> {
  const [image, depthGrid] = await Promise.all([loadImage(url), loadDepthGrid(depthUrl)]);
  const canvas = document.createElement("canvas");
  canvas.width = KEY_SIZE;
  canvas.height = KEY_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.drawImage(image, 0, 0, KEY_SIZE, KEY_SIZE);
  const keyed = keyOutBackground(ctx, KEY_SIZE);

  const mask = buildMask(keyed, KEY_SIZE, FIELD_SIZE);
  const field = distanceField(mask, FIELD_SIZE);

  // Animal bbox in the field (also gives us the height for scaling).
  let minX = FIELD_SIZE;
  let maxX = 0;
  let minY = FIELD_SIZE;
  let maxY = 0;
  let maxDist = 0;
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      const p = y * FIELD_SIZE + x;
      if (!mask[p]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      maxDist = Math.max(maxDist, field[p]);
    }
  }
  if (maxX <= minX || maxY <= minY || maxDist <= 0) {
    throw new Error(`silhouette missing for ${url}`);
  }
  // Pad a touch so the mesh reaches past the anti-aliased edge.
  minX = Math.max(0, minX - 2);
  maxX = Math.min(FIELD_SIZE - 1, maxX + 2);
  minY = Math.max(0, minY - 2);
  maxY = Math.min(FIELD_SIZE - 1, maxY + 2);

  const animalHeightNorm = (maxY - minY) / FIELD_SIZE;
  const scale = 1 / animalHeightNorm;
  // Half-thickness through the fattest point, in image-normalized units.
  const halfDepth = (depthPerHeight * animalHeightNorm) / 2;

  // Normalise the AI depth map over the animal's own pixels.
  const sampleDepth = (fx: number, fy: number) =>
    depthGrid
      ? sampleField(depthGrid, DEPTH_SIZE, (fx / FIELD_SIZE) * DEPTH_SIZE, (fy / FIELD_SIZE) * DEPTH_SIZE)
      : 0;
  let depthMin = 1;
  let depthMax = 0;
  if (depthGrid) {
    for (let y = minY; y <= maxY; y += 2) {
      for (let x = minX; x <= maxX; x += 2) {
        if (!mask[y * FIELD_SIZE + x]) continue;
        const d = sampleDepth(x, y);
        depthMin = Math.min(depthMin, d);
        depthMax = Math.max(depthMax, d);
      }
    }
  }
  const depthRange = Math.max(0.001, depthMax - depthMin);

  // Two displaced sheets (front +z, back −z) over the bbox grid. Depth
  // follows sqrt(edge distance): round through the body, feathering to
  // zero right at the outline so front and back meet seamlessly.
  const cols = GRID + 1;
  const vertsPerSheet = cols * cols;
  const positions = new Float32Array(vertsPerSheet * 2 * 3);
  const uvs = new Float32Array(vertsPerSheet * 2 * 2);
  const indices: number[] = [];

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const zSign = sheet === 0 ? 1 : -1;
    for (let iy = 0; iy <= GRID; iy += 1) {
      for (let ix = 0; ix <= GRID; ix += 1) {
        const fx = minX + (ix / GRID) * (maxX - minX);
        const fy = minY + (iy / GRID) * (maxY - minY);
        const raw = Math.max(0, sampleField(field, FIELD_SIZE, fx, fy));
        const inflate = Math.sqrt(raw / maxDist);
        // Front sheet: blend the balloon inflation with real estimated
        // depth (head and near limbs push out, far side recedes). The
        // edge fade pins the outline to zero so the sheets still meet.
        let relief = inflate;
        if (sheet === 0 && depthGrid) {
          const depthN = (sampleDepth(fx, fy) - depthMin) / depthRange;
          const edgeFade = Math.min(1, inflate * 2.2);
          relief = inflate * (1 - DEPTH_WEIGHT) + depthN * edgeFade * DEPTH_WEIGHT;
        }
        const u = fx / FIELD_SIZE;
        const v = 1 - fy / FIELD_SIZE;
        const index = sheet * vertsPerSheet + iy * cols + ix;
        positions[index * 3] = u;
        positions[index * 3 + 1] = v;
        positions[index * 3 + 2] = zSign * halfDepth * (sheet === 0 ? relief : inflate * 0.85);
        uvs[index * 2] = u;
        uvs[index * 2 + 1] = v;
      }
    }
    for (let iy = 0; iy < GRID; iy += 1) {
      for (let ix = 0; ix < GRID; ix += 1) {
        const a = sheet * vertsPerSheet + iy * cols + ix;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        // Reverse winding on the back sheet so it faces outward.
        if (sheet === 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Ground the animal and centre it on its own footprint.
  const centerX = ((minX + maxX) / 2) / FIELD_SIZE;
  const bottomY = 1 - maxY / FIELD_SIZE;
  geometry.translate(-centerX, -bottomY, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  return { geometry, texture, scale };
}

/**
 * Build (and cache) the figurine for a photo. Returns a fresh group each
 * call; geometry and texture are shared between instances.
 */
export async function loadFigurine(url: string, options: FigurineOptions): Promise<THREE.Group> {
  const cacheKey = `${url}|${options.depth}|${options.height}`;
  let pending = assetCache.get(cacheKey);
  if (!pending) {
    const depthUrl = url.replace(/\.(jpe?g|png)$/i, "-depth.jpeg");
    pending = buildAsset(url, depthUrl, options.depth / options.height);
    assetCache.set(cacheKey, pending);
  }
  const asset = await pending;

  const material = new THREE.MeshStandardMaterial({
    map: asset.texture,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.6,
    metalness: 0.02,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(asset.geometry, material);
  mesh.scale.setScalar(asset.scale * options.height);
  mesh.castShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  return group;
}
