/**
 * Shared visual helpers for the ride worlds: procedural canvas textures
 * (stripes, spots, skin noise, gradients), PBR mesh parts, realistic-cute
 * eyes, and soft blob shadows. Everything is generated in code — no
 * external assets, so the games stay offline-safe and license-safe.
 */

import * as THREE from "three";
import { seededRandom } from "./ride-track";

// ---- procedural textures ----

function makeCanvas(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas.getContext("2d") as CanvasRenderingContext2D;
}

function toTexture(ctx: CanvasRenderingContext2D, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

/** Speckled skin/fur — subtle tonal noise over a base color. */
export function noiseTexture(base: string, speckle: string, amount = 900, seed = 3): THREE.CanvasTexture {
  const ctx = makeCanvas(256);
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = speckle;
  for (let i = 0; i < amount; i += 1) {
    ctx.globalAlpha = 0.05 + rand() * 0.1;
    const r = 1 + rand() * 3;
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return toTexture(ctx);
}

/** Vertical zebra stripes that wrap around a sphere/cylinder body. */
export function stripesTexture(base: string, stripe: string, count = 9, seed = 4): THREE.CanvasTexture {
  const ctx = makeCanvas(512);
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = stripe;
  const step = 512 / count;
  for (let i = 0; i < count; i += 1) {
    const x = i * step + step * 0.2;
    ctx.beginPath();
    // Wavy, hand-drawn stripe — straight bars read as plastic.
    ctx.moveTo(x, -10);
    for (let y = 0; y <= 512; y += 32) {
      ctx.lineTo(x + Math.sin(y * 0.02 + i) * 14 + rand() * 6, y);
    }
    ctx.lineTo(x + step * (0.34 + rand() * 0.18), 522);
    for (let y = 512; y >= 0; y -= 32) {
      ctx.lineTo(x + step * 0.42 + Math.sin(y * 0.02 + i) * 14, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(ctx);
}

/** Giraffe patches — irregular polygons with sandy seams. */
export function patchesTexture(base: string, patch: string, seed = 6): THREE.CanvasTexture {
  const ctx = makeCanvas(512);
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = patch;
  const cols = 6;
  const rows = 6;
  for (let cx = 0; cx < cols; cx += 1) {
    for (let cy = 0; cy < rows; cy += 1) {
      const centerX = (cx + 0.5) * (512 / cols) + (rand() - 0.5) * 26;
      const centerY = (cy + 0.5) * (512 / rows) + (rand() - 0.5) * 26;
      const radius = 30 + rand() * 14;
      const sides = 5 + Math.floor(rand() * 3);
      ctx.beginPath();
      for (let s = 0; s <= sides; s += 1) {
        const angle = (s / sides) * Math.PI * 2;
        const r = radius * (0.75 + rand() * 0.35);
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  return toTexture(ctx);
}

/** Two-tone sea-creature gradient: dark back fading to pale belly. */
export function bellyGradientTexture(back: string, belly: string): THREE.CanvasTexture {
  const ctx = makeCanvas(256);
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, back);
  gradient.addColorStop(0.55, back);
  gradient.addColorStop(0.78, belly);
  gradient.addColorStop(1, belly);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return toTexture(ctx);
}

/** Turtle shell — scute polygons over a dome-toned base. */
export function shellTexture(base: string, seam: string, seed = 8): THREE.CanvasTexture {
  const ctx = makeCanvas(512);
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = seam;
  ctx.lineWidth = 10;
  for (let cx = 0; cx < 5; cx += 1) {
    for (let cy = 0; cy < 4; cy += 1) {
      const centerX = (cx + 0.5) * 102 + (rand() - 0.5) * 16;
      const centerY = (cy + 0.5) * 128 + (rand() - 0.5) * 16;
      ctx.beginPath();
      for (let s = 0; s <= 6; s += 1) {
        const angle = (s / 6) * Math.PI * 2 + 0.3;
        const px = centerX + Math.cos(angle) * 52;
        const py = centerY + Math.sin(angle) * 58;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  return toTexture(ctx);
}

/** Vertical sky/water gradient for a background dome. */
export function skyGradientTexture(top: string, middle: string, bottom: string): THREE.CanvasTexture {
  const ctx = makeCanvas(256);
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.55, middle);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return toTexture(ctx);
}

/** Soft radial blob used for fake contact shadows and light shafts. */
export function radialFadeTexture(inner: string, outer: string): THREE.CanvasTexture {
  const ctx = makeCanvas(128);
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(ctx);
}

// ---- mesh helpers ----

export interface PartOptions {
  color?: number;
  map?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  emissive?: number;
  emissiveIntensity?: number;
  shadows?: boolean;
}

/** Add a PBR-shaded primitive to `parent` and return it. */
export function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  options: PartOptions,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: options.color ?? 0xffffff,
    map: options.map ?? null,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0.02,
  });
  if (options.opacity !== undefined && options.opacity < 1) {
    material.transparent = true;
    material.opacity = options.opacity;
  }
  if (options.emissive !== undefined) {
    material.emissive = new THREE.Color(options.emissive);
    material.emissiveIntensity = options.emissiveIntensity ?? 0.5;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  const shadows = options.shadows ?? true;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

/** Realistic-cute eye: white sclera, colored iris, pupil, sparkle. */
export function addEye(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  size: number,
  iris = 0x5a3b1e
): THREE.Group {
  const eye = new THREE.Group();
  part(eye, new THREE.SphereGeometry(size, 14, 12), { color: 0xffffff, roughness: 0.25, shadows: false });
  part(eye, new THREE.SphereGeometry(size * 0.62, 12, 10), { color: iris, roughness: 0.3, shadows: false }, 0, 0, size * 0.48);
  part(eye, new THREE.SphereGeometry(size * 0.34, 10, 8), { color: 0x14100c, roughness: 0.2, shadows: false }, 0, 0, size * 0.78);
  part(
    eye,
    new THREE.SphereGeometry(size * 0.12, 8, 6),
    { color: 0xffffff, roughness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.6, shadows: false },
    size * 0.16,
    size * 0.2,
    size * 0.95
  );
  eye.position.set(x, y, z);
  parent.add(eye);
  return eye;
}

/** Soft round contact shadow lying on the ground. */
export function blobShadow(parent: THREE.Object3D, radius: number, y = 0.06, opacity = 0.32): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 28),
    new THREE.MeshBasicMaterial({
      map: radialFadeTexture("rgba(8,12,16,0.85)", "rgba(8,12,16,0)"),
      transparent: true,
      opacity,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

/**
 * Smooth lathe body from a silhouette of [radius, height] pairs — gives
 * whales/subs/shells a sculpted profile instead of a scaled ball.
 */
export function latheBody(profile: [number, number][], segments = 24): THREE.BufferGeometry {
  const points = profile.map(([radius, height]) => new THREE.Vector2(Math.max(0.001, radius), height));
  return new THREE.LatheGeometry(points, segments);
}

/** Tapered limb/tentacle along a gentle curve. */
export function taperedLimb(
  from: THREE.Vector3,
  mid: THREE.Vector3,
  to: THREE.Vector3,
  startRadius: number,
  endRadius: number,
  material: PartOptions,
  parent: THREE.Object3D
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const geometry = new THREE.TubeGeometry(curve, 12, startRadius, 8, false);
  // Taper the tube towards the tip by scaling vertices along the curve.
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 1) {
    const t = Math.floor(i / (8 + 1)) / 12;
    const scale = 1 + (endRadius / startRadius - 1) * Math.min(1, t);
    point.fromBufferAttribute(positions, i);
    curve.getPointAt(Math.min(1, t), center);
    point.sub(center).multiplyScalar(scale).add(center);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeVertexNormals();
  return part(parent, geometry, material);
}
