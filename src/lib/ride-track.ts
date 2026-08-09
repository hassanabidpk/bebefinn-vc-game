/** Track helpers shared by the safari and ocean world builders. */

import * as THREE from "three";

/**
 * Closed wiggly loop around the origin. `bumpiness` adds radius variation,
 * `lift` adds gentle vertical waves (used by the ocean ride).
 */
export function createLoopCurve(
  radius: number,
  bumpiness: number,
  baseY: number,
  lift = 0
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const count = 10;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + Math.sin(angle * 3) * bumpiness;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * r,
        baseY + Math.sin(angle * 2) * lift,
        Math.sin(angle) * r
      )
    );
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.5);
}

/** Flat ribbon mesh that follows the curve — the dirt road / sea trail. */
export function createTrackRibbon(
  curve: THREE.CatmullRomCurve3,
  width: number,
  color: number,
  yOffset: number
): THREE.Mesh {
  const segments = 160;
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i += 1) {
    const t = (i % segments) / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const left = point.clone().addScaledVector(side, -width / 2);
    const right = point.clone().addScaledVector(side, width / 2);
    positions.push(left.x, left.y + yOffset, left.z);
    positions.push(right.x, right.y + yOffset, right.z);
    uvs.push(0, i / segments, 1, i / segments);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

/** Deterministic pseudo-random generator so scenery layout is stable. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Position `group` beside the track at fraction `t`, facing the track. */
export function placeBesideTrack(
  group: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  t: number,
  side: -1 | 1,
  distance: number
) {
  const point = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
  group.position.copy(point).addScaledVector(normal, side * distance);
  group.position.y = 0;
  const look = point.clone();
  look.y = 0;
  group.lookAt(look);
}
