/**
 * Safari Ride world builder — golden-hour savanna with articulated,
 * procedurally textured animals that wander, walk, and perform a signature
 * gesture when the jeep stops (lion rears, elephant raises its trunk,
 * giraffe bows, zebra bucks, monkey waves, hippo yawns). Real-time shadows
 * follow the jeep under a painted sky dome. Everything is generated in
 * code — no external assets, nothing copyrighted.
 */

import * as THREE from "three";
import type { RideAnimalNode, RideWorldBuild } from "./ride-engine";
import { SAFARI_RIDE } from "./ride-data";
import type { RideAnimalSpec } from "./ride-data";
import {
  createLoopCurve,
  createTrackRibbon,
  placeBesideTrack,
  seededRandom,
} from "./ride-track";
import {
  addEye,
  latheBody,
  noiseTexture,
  part,
  patchesTexture,
  radialFadeTexture,
  skyGradientTexture,
  stripesTexture,
  taperedLimb,
} from "./ride-visuals";

type Animate = (time: number, active: boolean, activeElapsed: number) => void;

interface AnimalBuild {
  group: THREE.Group;
  animate: Animate;
}

/** 0→1→0 bump over [start, start+duration] of the gesture timeline. */
function gesturePulse(elapsed: number, start: number, duration: number): number {
  const t = (elapsed - start) / duration;
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI);
}

/** Eased 0→1 ramp over the first `duration` seconds. */
function rampIn(elapsed: number, duration = 0.5): number {
  const t = Math.min(1, Math.max(0, elapsed / duration));
  return t * t * (3 - 2 * t);
}

function pivotAt(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

interface LegSpec {
  upper: number;
  lower: number;
  radius: number;
  color: number;
  hoof?: number;
  map?: THREE.Texture;
}

/** Four legs pivoted at the hip so they can swing in a walk cycle. */
function buildLegs(
  body: THREE.Object3D,
  spec: LegSpec,
  dx: number,
  dzFront: number,
  dzBack: number
): THREE.Group[] {
  const hipY = spec.upper + spec.lower + 0.08;
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    for (const dz of [dzFront, -dzBack]) {
      const leg = pivotAt(body, sx * dx, hipY, dz);
      part(
        leg,
        new THREE.CylinderGeometry(spec.radius, spec.radius * 0.7, spec.upper, 10),
        { color: spec.color, map: spec.map },
        0,
        -spec.upper / 2,
        0
      );
      part(
        leg,
        new THREE.CylinderGeometry(spec.radius * 0.68, spec.radius * 0.55, spec.lower, 10),
        { color: spec.color, map: spec.map },
        0,
        -spec.upper - spec.lower / 2,
        0
      );
      part(
        leg,
        new THREE.CylinderGeometry(spec.radius * 0.62, spec.radius * 0.7, 0.16, 10),
        { color: spec.hoof ?? 0x3d3129, roughness: 0.5 },
        0,
        -hipY + 0.08,
        0
      );
      legs.push(leg);
    }
  }
  return legs;
}

/** Diagonal-pair walk cycle; amplitude eases with `speed` 0..1. */
function swingLegs(legs: THREE.Group[], time: number, speed: number, freq = 5) {
  legs.forEach((leg, i) => {
    const phase = (i === 0 || i === 3 ? 0 : Math.PI) + (i < 2 ? 0 : Math.PI * 0.1);
    leg.rotation.x = Math.sin(time * freq + phase) * 0.55 * speed;
  });
}

/** Rounded torso capsule laid along the z axis. */
function buildTorso(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  y: number,
  options: { color?: number; map?: THREE.Texture }
): THREE.Mesh {
  const torso = part(parent, new THREE.CapsuleGeometry(radius, length, 8, 18), options, 0, y, 0);
  torso.rotation.x = Math.PI / 2;
  return torso;
}

/**
 * Shared ground-animal locomotion: amble around the home spot when idle,
 * come home and face the road when the jeep stops. Returns walk speed 0..1
 * so leg swing can match, and the gesture strength 0..1.
 */
function groundMotion(
  group: THREE.Group,
  time: number,
  active: boolean,
  seed: number,
  radius: number,
  pace: number,
  home: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null
): { walk: number; gesture: number } {
  if (!home) return { walk: 0, gesture: 0 };
  if (active) {
    // Come home and face the road for the show.
    group.position.x += (home.position.x - group.position.x) * 0.08;
    group.position.z += (home.position.z - group.position.z) * 0.08;
    group.quaternion.slerp(home.quaternion, 0.08);
    return { walk: 0, gesture: 1 };
  }
  const angle = time * pace + seed;
  const targetX = home.position.x + Math.cos(angle) * radius;
  const targetZ = home.position.z + Math.sin(angle) * radius * 0.7;
  const dx = targetX - group.position.x;
  const dz = targetZ - group.position.z;
  group.position.x = targetX;
  group.position.z = targetZ;
  const yaw = Math.atan2(dx, dz);
  const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  group.quaternion.slerp(targetQuat, 0.12);
  return { walk: 1, gesture: 0 };
}

/** Capture the placed pose lazily — builders run before placeBesideTrack. */
function homeKeeper(group: THREE.Group) {
  let home: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  return () => {
    if (!home) home = { position: group.position.clone(), quaternion: group.quaternion.clone() };
    return home;
  };
}

// ---- animals ----

function buildLion(): AnimalBuild {
  const g = new THREE.Group();
  const fur = noiseTexture("#c68b4e", "#9c6a38", 700, 31);

  buildTorso(g, 1.05, 1.9, 2.35, { map: fur });
  const legs = buildLegs(g, { upper: 1, lower: 0.85, radius: 0.3, color: 0xb97f45, map: fur }, 0.62, 1.15, 1.2);

  const head = pivotAt(g, 0, 3.1, 1.5);
  for (let layer = 0; layer < 3; layer += 1) {
    const mane = part(
      head,
      new THREE.SphereGeometry(1.05 - layer * 0.16, 18, 14),
      { map: noiseTexture("#6b3e1e", "#4c2a12", 900, 41 + layer), roughness: 0.95 },
      0,
      0,
      -0.35 - layer * 0.22
    );
    mane.scale.set(1, 1, 0.55);
  }
  part(head, new THREE.SphereGeometry(0.68, 18, 14), { map: fur }, 0, 0, 0.28).scale.set(1, 0.92, 0.95);
  const muzzle = part(head, new THREE.SphereGeometry(0.34, 14, 12), { color: 0xe6c9a3, roughness: 0.8 }, 0, -0.18, 0.78);
  muzzle.scale.set(1.15, 0.8, 0.9);
  part(head, new THREE.SphereGeometry(0.13, 10, 8), { color: 0x3a2a20, roughness: 0.4 }, 0, 0.02, 1.03);
  // Open mouth, revealed when the head tips back for the roar.
  part(head, new THREE.SphereGeometry(0.18, 10, 8), { color: 0x7c2d2d, roughness: 0.6 }, 0, -0.34, 0.86).scale.set(1.2, 0.7, 0.8);
  addEye(head, -0.28, 0.16, 0.72, 0.13, 0x7a4f22);
  addEye(head, 0.28, 0.16, 0.72, 0.13, 0x7a4f22);
  for (const side of [-1, 1]) {
    const ear = part(head, new THREE.SphereGeometry(0.18, 10, 8), { map: fur }, side * 0.52, 0.62, -0.05);
    ear.scale.set(1, 1, 0.5);
  }

  const tail = pivotAt(g, 0, 2.5, -2.1);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.25, 0.4, -0.6),
    new THREE.Vector3(0.1, -0.1, -1.05),
    0.09,
    0.05,
    { color: 0xb97f45 },
    tail
  );
  part(tail, new THREE.SphereGeometry(0.17, 8, 8), { color: 0x6b3e1e }, 0.1, -0.15, -1.1);

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    const { walk } = groundMotion(g, time, active, 3.1, 1.6, 0.14, getHome());
    swingLegs(legs, time, walk * 0.9, 4.2);
    tail.rotation.y = Math.sin(time * 2.4) * 0.45;
    tail.rotation.x = Math.sin(time * 1.7) * 0.15;
    head.rotation.y = active ? 0 : Math.sin(time * 0.7 + 1) * 0.35;

    // Signature: rear up on hind legs and roar skyward.
    const rear = gesturePulse(elapsed, 0.5, 2.4) * rampIn(elapsed);
    g.rotation.x = -rear * 0.5;
    g.position.y = rear * 0.55 + (active ? 0 : Math.abs(Math.sin(time * 4.2)) * 0.05 * walk);
    head.rotation.x = -rear * 0.55;
    if (rear > 0.1) {
      legs[0].rotation.x = -0.9 * rear;
      legs[2].rotation.x = -1.1 * rear;
    }
  };
  return { group: g, animate };
}

function buildElephant(): AnimalBuild {
  const g = new THREE.Group();
  const skin = noiseTexture("#8e8e96", "#6f6f78", 1200, 32);

  buildTorso(g, 1.55, 2.3, 3, { map: skin });
  const legs = buildLegs(g, { upper: 1.35, lower: 1.1, radius: 0.5, color: 0x85858d, map: skin, hoof: 0xcfc4b4 }, 0.85, 1.3, 1.35);

  const head = pivotAt(g, 0, 3.9, 1.9);
  part(head, new THREE.SphereGeometry(1.15, 20, 16), { map: skin }).scale.set(1, 1.05, 0.95);
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = part(head, new THREE.SphereGeometry(1.05, 16, 12), { map: skin }, side * 1.25, 0.15, -0.3);
    ear.scale.set(0.22, 1.15, 0.85);
    ear.rotation.y = side * 0.45;
    ears.push(ear);
  }
  addEye(head, -0.52, 0.28, 0.9, 0.12, 0x46394f);
  addEye(head, 0.52, 0.28, 0.9, 0.12, 0x46394f);
  for (const side of [-1, 1]) {
    const tusk = part(
      head,
      new THREE.TorusGeometry(0.55, 0.09, 10, 14, Math.PI * 0.55),
      { color: 0xf3ead8, roughness: 0.35 },
      side * 0.42,
      -0.7,
      0.85
    );
    tusk.rotation.set(0.4, side * 0.5, side * -1.2);
  }

  // Articulated trunk: three chained pivots that curl upward for the salute.
  const trunk1 = pivotAt(head, 0, -0.55, 0.95);
  part(trunk1, new THREE.CylinderGeometry(0.3, 0.26, 0.85, 12), { map: skin }, 0, -0.42, 0);
  const trunk2 = pivotAt(trunk1, 0, -0.85, 0);
  part(trunk2, new THREE.CylinderGeometry(0.25, 0.2, 0.75, 12), { map: skin }, 0, -0.37, 0);
  const trunk3 = pivotAt(trunk2, 0, -0.75, 0);
  part(trunk3, new THREE.CylinderGeometry(0.19, 0.14, 0.6, 12), { map: skin }, 0, -0.3, 0);
  part(trunk3, new THREE.SphereGeometry(0.16, 10, 8), { map: skin }, 0, -0.62, 0.03);
  trunk1.rotation.x = 0.35;
  trunk2.rotation.x = 0.2;
  trunk3.rotation.x = -0.25;

  const tail = pivotAt(g, 0, 3.4, -2.5);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.8, -0.35),
    new THREE.Vector3(0.05, -1.5, -0.4),
    0.09,
    0.04,
    { color: 0x85858d },
    tail
  );

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    const { walk } = groundMotion(g, time, active, 1.7, 1.3, 0.09, getHome());
    swingLegs(legs, time, walk, 3.2);
    ears.forEach((ear, i) => {
      ear.rotation.z = Math.sin(time * 1.8 + i * Math.PI) * 0.18;
    });
    tail.rotation.y = Math.sin(time * 2.1) * 0.4;

    // Signature: curl the trunk high in a trumpet salute.
    const raise = gesturePulse(elapsed, 0.5, 2.6) * rampIn(elapsed);
    const sway = Math.sin(time * 1.4) * 0.12;
    trunk1.rotation.x = 0.35 - raise * 1.5 + sway * (1 - raise);
    trunk1.rotation.z = sway * 0.6;
    trunk2.rotation.x = 0.2 - raise * 1.1;
    trunk3.rotation.x = -0.25 - raise * 0.7;
    head.rotation.x = -raise * 0.28;
    g.position.y = active ? 0 : Math.abs(Math.sin(time * 3.2)) * 0.04 * walk;
  };
  return { group: g, animate };
}

function buildGiraffe(): AnimalBuild {
  const g = new THREE.Group();
  const hide = patchesTexture("#e8b372", "#8f5a2b", 61);

  buildTorso(g, 1.05, 1.6, 3.6, { map: hide });
  const legs = buildLegs(g, { upper: 1.9, lower: 1.5, radius: 0.27, color: 0xdca763, map: hide, hoof: 0x5a4633 }, 0.6, 0.95, 1.05);

  // Neck and head swing together from the shoulders.
  const neck = pivotAt(g, 0, 3.9, 1.3);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1.7, 0.6),
    new THREE.Vector3(0, 3.2, 0.95),
    0.52,
    0.3,
    { map: hide },
    neck
  );
  const head = pivotAt(neck, 0, 3.45, 1.15);
  part(head, new THREE.SphereGeometry(0.55, 16, 12), { map: hide }).scale.set(0.85, 0.8, 1.25);
  part(head, new THREE.SphereGeometry(0.34, 12, 10), { color: 0xcf9a58, roughness: 0.8 }, 0, -0.08, 0.62).scale.set(0.95, 0.7, 0.9);
  addEye(head, -0.3, 0.22, 0.32, 0.12, 0x54371c);
  addEye(head, 0.3, 0.22, 0.32, 0.12, 0x54371c);
  for (const side of [-1, 1]) {
    part(head, new THREE.CylinderGeometry(0.05, 0.05, 0.42, 8), { color: 0xb98950 }, side * 0.2, 0.55, -0.1);
    part(head, new THREE.SphereGeometry(0.1, 8, 8), { color: 0x6b4a26 }, side * 0.2, 0.8, -0.1);
    const ear = part(head, new THREE.SphereGeometry(0.16, 10, 8), { map: hide }, side * 0.5, 0.32, -0.15);
    ear.scale.set(1.4, 0.6, 0.4);
  }

  const tail = pivotAt(g, 0, 3.6, -1.9);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.1, -0.7, -0.4),
    new THREE.Vector3(0, -1.4, -0.6),
    0.07,
    0.04,
    { color: 0xdca763 },
    tail
  );
  part(tail, new THREE.SphereGeometry(0.14, 8, 8), { color: 0x4c3319 }, 0, -1.5, -0.65);

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    const { walk } = groundMotion(g, time, active, 5.4, 1.8, 0.11, getHome());
    swingLegs(legs, time, walk * 0.8, 3.6);
    tail.rotation.y = Math.sin(time * 2.2) * 0.35;

    // Signature: a graceful bow — the long neck sweeps down to say hello.
    const bow = gesturePulse(elapsed, 0.5, 2.8) * rampIn(elapsed);
    const idleSway = active ? 0 : Math.sin(time * 0.9) * 0.08;
    neck.rotation.x = bow * 0.85 + idleSway;
    neck.rotation.z = Math.sin(time * 0.6) * 0.05 * (1 - bow);
    head.rotation.x = -bow * 0.5 + (active ? 0 : Math.sin(time * 1.3) * 0.1);
    g.position.y = active ? 0 : Math.abs(Math.sin(time * 3.4)) * 0.05 * walk;
  };
  return { group: g, animate };
}

function buildZebra(): AnimalBuild {
  const g = new THREE.Group();
  const coat = stripesTexture("#f2efe9", "#2a2c30", 10, 71);

  const body = pivotAt(g, 0, 0, 0);
  buildTorso(body, 0.95, 1.5, 2.5, { map: coat });
  const legs = buildLegs(body, { upper: 1.15, lower: 0.95, radius: 0.24, color: 0xe9e4da, map: coat, hoof: 0x2f2b28 }, 0.55, 0.9, 1);
  const neck = pivotAt(body, 0, 2.7, 0.95);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.8, 0.5),
    new THREE.Vector3(0, 1.4, 0.8),
    0.42,
    0.3,
    { map: coat },
    neck
  );
  const head = pivotAt(neck, 0, 1.55, 1);
  part(head, new THREE.SphereGeometry(0.5, 16, 12), { map: coat }).scale.set(0.78, 0.78, 1.3);
  part(head, new THREE.SphereGeometry(0.3, 12, 10), { color: 0x2a2c30, roughness: 0.6 }, 0, -0.1, 0.6).scale.set(0.9, 0.72, 0.8);
  addEye(head, -0.26, 0.2, 0.3, 0.11, 0x3b2c1c);
  addEye(head, 0.26, 0.2, 0.3, 0.11, 0x3b2c1c);
  for (const side of [-1, 1]) {
    const ear = part(head, new THREE.ConeGeometry(0.12, 0.38, 10), { color: 0xe9e4da }, side * 0.24, 0.55, -0.12);
    ear.rotation.x = -0.2;
  }
  for (let i = 0; i < 5; i += 1) {
    const tuft = part(neck, new THREE.ConeGeometry(0.09, 0.4, 8), { color: 0x2a2c30 }, 0, 0.25 + i * 0.3, -0.12 + i * 0.1);
    tuft.rotation.x = -0.5;
  }
  const tail = pivotAt(body, 0, 2.6, -1.55);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, -0.5, -0.35),
    new THREE.Vector3(0, -1, -0.45),
    0.06,
    0.04,
    { color: 0xe9e4da },
    tail
  );
  part(tail, new THREE.SphereGeometry(0.12, 8, 8), { color: 0x2a2c30 }, 0, -1.1, -0.5);

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    const { walk } = groundMotion(g, time, active, 7.9, 2, 0.16, getHome());
    swingLegs(legs, time, walk, 5);
    tail.rotation.y = Math.sin(time * 3.1) * 0.5;

    // Signature: a happy buck — front dips, hind legs kick, head tosses.
    const buck = gesturePulse(elapsed, 0.5, 1.6) + gesturePulse(elapsed, 2.6, 1.6);
    const kick = buck * rampIn(elapsed);
    body.rotation.x = -kick * 0.3;
    body.position.y = kick * 0.35;
    legs[1].rotation.x = kick * 1.1;
    legs[3].rotation.x = kick * 1.25;
    head.rotation.z = active ? Math.sin(time * 9) * 0.16 * kick : Math.sin(time * 1.1) * 0.08;
    neck.rotation.x = -kick * 0.25 + (active ? 0 : Math.sin(time * 0.8) * 0.06);
    g.position.y = active ? 0 : Math.abs(Math.sin(time * 4.6)) * 0.06 * walk;
  };
  return { group: g, animate };
}

function buildMonkey(): AnimalBuild {
  const g = new THREE.Group();
  const fur = noiseTexture("#7a4a2b", "#5c3620", 900, 51);
  const skinTone = 0xdfb890;

  const body = part(g, new THREE.CapsuleGeometry(0.62, 0.7, 8, 16), { map: fur }, 0, 1.35, 0);
  body.rotation.x = 0.15;
  part(g, new THREE.SphereGeometry(0.45, 14, 12), { color: skinTone, roughness: 0.75 }, 0, 1.25, 0.4).scale.set(0.8, 1, 0.5);

  const head = pivotAt(g, 0, 2.45, 0.15);
  part(head, new THREE.SphereGeometry(0.55, 18, 14), { map: fur });
  const face = part(head, new THREE.SphereGeometry(0.42, 16, 12), { color: skinTone, roughness: 0.7 }, 0, -0.05, 0.28);
  face.scale.set(0.95, 0.85, 0.7);
  part(head, new THREE.SphereGeometry(0.1, 8, 8), { color: 0x54371f, roughness: 0.5 }, 0, -0.16, 0.62);
  addEye(head, -0.18, 0.08, 0.48, 0.1, 0x3f2a16);
  addEye(head, 0.18, 0.08, 0.48, 0.1, 0x3f2a16);
  for (const side of [-1, 1]) {
    const ear = part(head, new THREE.SphereGeometry(0.16, 10, 8), { color: skinTone }, side * 0.55, 0.05, 0);
    ear.scale.set(0.5, 1, 0.8);
  }

  // Left arm rests; right arm is a shoulder pivot built to wave hello.
  taperedLimb(
    new THREE.Vector3(-0.5, 1.9, 0.15),
    new THREE.Vector3(-0.85, 1.3, 0.35),
    new THREE.Vector3(-0.7, 0.35, 0.45),
    0.14,
    0.09,
    { map: fur },
    g
  );
  part(g, new THREE.SphereGeometry(0.14, 8, 8), { color: skinTone }, -0.7, 0.28, 0.5);
  const arm = pivotAt(g, 0.5, 1.9, 0.15);
  part(arm, new THREE.CylinderGeometry(0.13, 0.11, 0.8, 10), { map: fur }, 0.08, -0.4, 0.1).rotation.z = -0.25;
  part(arm, new THREE.CylinderGeometry(0.1, 0.09, 0.7, 10), { map: fur }, 0.22, -0.95, 0.22).rotation.z = -0.35;
  part(arm, new THREE.SphereGeometry(0.14, 8, 8), { color: skinTone }, 0.34, -1.3, 0.3);

  for (const side of [-1, 1]) {
    part(g, new THREE.SphereGeometry(0.34, 12, 10), { map: fur }, side * 0.42, 0.5, 0).scale.set(0.9, 1, 1.1);
    part(g, new THREE.SphereGeometry(0.15, 8, 8), { color: skinTone }, side * 0.5, 0.22, 0.35).scale.set(1, 0.5, 1.4);
  }
  const tail = pivotAt(g, 0, 0.9, -0.5);
  taperedLimb(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.4, 0.6, -0.6),
    new THREE.Vector3(-0.1, 1.2, -0.8),
    0.09,
    0.04,
    { map: fur },
    tail
  );

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    getHome();
    // Monkeys bounce in place rather than amble.
    const excitement = active ? rampIn(elapsed) : 0;
    g.position.y = Math.abs(Math.sin(time * (active ? 7 : 2.6))) * (0.12 + excitement * 0.45);
    tail.rotation.y = Math.sin(time * 3.4) * 0.6;
    tail.rotation.x = Math.sin(time * 2.2) * 0.25;
    head.rotation.z = Math.sin(time * (active ? 6 : 1.4)) * (active ? 0.14 : 0.08);

    // Signature: big arm wave hello.
    const wave = active ? rampIn(elapsed, 0.6) : 0;
    arm.rotation.z = -wave * 2.3 + Math.sin(time * 8) * 0.45 * wave;
    arm.rotation.x = wave * 0.2;
  };
  return { group: g, animate };
}

function buildHippo(): AnimalBuild {
  const g = new THREE.Group();
  const skin = noiseTexture("#8a8593", "#6d6878", 1000, 81);

  buildTorso(g, 1.45, 2.1, 2.15, { map: skin });
  const legs = buildLegs(g, { upper: 0.8, lower: 0.6, radius: 0.45, color: 0x817c8b, map: skin, hoof: 0xd8cfc4 }, 0.8, 1.15, 1.2);

  const head = pivotAt(g, 0, 2.55, 1.75);
  part(head, new THREE.SphereGeometry(0.95, 18, 14), { map: skin }).scale.set(1, 0.9, 1);
  const upperSnout = part(head, new THREE.SphereGeometry(0.8, 16, 12), { color: 0x9b93a6, roughness: 0.85 }, 0, -0.2, 0.85);
  upperSnout.scale.set(1.08, 0.52, 1);
  for (const side of [-1, 1]) {
    part(upperSnout, new THREE.SphereGeometry(0.1, 8, 8), { color: 0x4f4859 }, side * 0.32, 0.5, 0.72);
    part(head, new THREE.SphereGeometry(0.14, 8, 8), { color: 0x817c8b }, side * 0.62, 0.72, -0.1);
  }
  addEye(head, -0.4, 0.42, 0.62, 0.11, 0x463a52);
  addEye(head, 0.4, 0.42, 0.62, 0.11, 0x463a52);
  // Hinged jaw for the huge friendly yawn.
  const jaw = pivotAt(head, 0, -0.5, 0.35);
  const lowerJaw = part(jaw, new THREE.SphereGeometry(0.72, 16, 12), { color: 0x8d8598, roughness: 0.85 }, 0, -0.18, 0.52);
  lowerJaw.scale.set(1, 0.45, 1);
  part(jaw, new THREE.SphereGeometry(0.5, 12, 10), { color: 0xc4788e, roughness: 0.7 }, 0, -0.02, 0.55).scale.set(0.85, 0.3, 0.85);
  for (const side of [-1, 1]) {
    part(jaw, new THREE.BoxGeometry(0.14, 0.22, 0.1), { color: 0xf6efe2, roughness: 0.3 }, side * 0.42, 0.08, 0.9);
  }

  const getHome = homeKeeper(g);
  const animate: Animate = (time, active, elapsed) => {
    const { walk } = groundMotion(g, time, active, 9.2, 1.1, 0.07, getHome());
    swingLegs(legs, time, walk * 0.7, 2.8);

    // Signature: tip the head back and open wide — the famous hippo yawn.
    const yawn = gesturePulse(elapsed, 0.6, 3) * rampIn(elapsed);
    jaw.rotation.x = yawn * 0.95;
    head.rotation.x = -yawn * 0.4 + (active ? 0 : Math.sin(time * 0.9) * 0.06);
    head.rotation.y = active ? 0 : Math.sin(time * 0.6) * 0.15;
    g.position.y = active ? 0 : Math.abs(Math.sin(time * 2.6)) * 0.04 * walk;
  };
  return { group: g, animate };
}

const ANIMAL_BUILDERS: Record<string, () => AnimalBuild> = {
  Lion: buildLion,
  Elephant: buildElephant,
  Giraffe: buildGiraffe,
  Zebra: buildZebra,
  Monkey: buildMonkey,
  Hippo: buildHippo,
};

// ---- vehicle ----

function buildJeep(): THREE.Group {
  const g = new THREE.Group();
  const paint = { color: 0xd96f2b, roughness: 0.35, metalness: 0.25 };

  const body = part(g, new THREE.BoxGeometry(2.2, 0.8, 3.7), paint, 0, 1.05, 0);
  body.name = "jeep-body";
  part(g, new THREE.BoxGeometry(2.24, 0.3, 3.74), { color: 0x8f4415, roughness: 0.5 }, 0, 0.62, 0);
  part(g, new THREE.BoxGeometry(1.95, 0.55, 1.75), { color: 0xe8853f, roughness: 0.4, metalness: 0.2 }, 0, 1.72, -0.5);
  for (const sz of [-1.15, 1.15]) {
    const fender = part(g, new THREE.CylinderGeometry(0.62, 0.62, 2.36, 16, 1, false, 0, Math.PI), { color: 0x8f4415, roughness: 0.5 }, 0, 0.85, sz);
    fender.rotation.z = Math.PI / 2;
  }
  part(g, new THREE.BoxGeometry(1.8, 0.72, 0.08), { color: 0xcfeefc, roughness: 0.05, metalness: 0.4, opacity: 0.4 }, 0, 2.05, 0.78);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      part(g, new THREE.CylinderGeometry(0.05, 0.05, 1.35, 8), { color: 0xd9d2c2, roughness: 0.4, metalness: 0.6 }, sx * 0.85, 2.15, sz * 1.35);
    }
  }
  part(g, new THREE.BoxGeometry(2.15, 0.1, 3.25), { map: noiseTexture("#efe1bd", "#d8c79d", 500, 91), roughness: 0.9 }, 0, 2.9, 0);
  for (const sx of [-1, 1]) {
    part(g, new THREE.SphereGeometry(0.14, 10, 8), { color: 0xfff3c4, emissive: 0xfff3c4, emissiveIntensity: 0.9, roughness: 0.2 }, sx * 0.7, 1.15, 1.9);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Group();
      part(wheel, new THREE.CylinderGeometry(0.58, 0.58, 0.42, 20), { map: noiseTexture("#26282c", "#101214", 600, 95), roughness: 0.95 });
      part(wheel, new THREE.CylinderGeometry(0.26, 0.26, 0.44, 12), { color: 0xcfc8b8, roughness: 0.3, metalness: 0.7 });
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 1.16, 0.58, sz * 1.15);
      g.add(wheel);
    }
  }
  const spare = part(g, new THREE.CylinderGeometry(0.5, 0.5, 0.3, 18), { color: 0x26282c, roughness: 0.95 }, 0, 1.3, -1.95);
  spare.rotation.x = Math.PI / 2;

  const driver = new THREE.Group();
  part(driver, new THREE.CapsuleGeometry(0.3, 0.35, 6, 12), { map: noiseTexture("#8b5a3c", "#6d4227", 500, 97) }, 0, 0.2, 0);
  const otterHead = part(driver, new THREE.SphereGeometry(0.3, 14, 12), { map: noiseTexture("#8b5a3c", "#6d4227", 500, 98) }, 0, 0.75, 0);
  part(otterHead, new THREE.SphereGeometry(0.2, 10, 8), { color: 0xe6c6a3, roughness: 0.7 }, 0, -0.08, 0.2).scale.set(1, 0.75, 0.6);
  part(otterHead, new THREE.SphereGeometry(0.06, 8, 6), { color: 0x2f2119 }, 0, -0.02, 0.31);
  addEye(otterHead, -0.12, 0.08, 0.24, 0.06, 0x2f2119);
  addEye(otterHead, 0.12, 0.08, 0.24, 0.06, 0x2f2119);
  for (const side of [-1, 1]) {
    part(otterHead, new THREE.SphereGeometry(0.07, 8, 6), { color: 0x6d4227 }, side * 0.22, 0.2, 0);
  }
  part(driver, new THREE.TorusGeometry(0.2, 0.06, 8, 16), { color: 0xd9534f, roughness: 0.7 }, 0, 0.52, 0);
  driver.position.set(0, 1.55, -0.5);
  g.add(driver);

  g.traverse((object) => {
    object.castShadow = true;
  });
  return g;
}

// ---- world ----

export function buildSafariWorld(scene: THREE.Scene): RideWorldBuild {
  scene.fog = new THREE.Fog(0xc9e6f2, 55, 150);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(260, 24, 16),
    new THREE.MeshBasicMaterial({
      map: skyGradientTexture("#3f9bd8", "#a5d8f0", "#f6e3b8"),
      side: THREE.BackSide,
      fog: false,
    })
  );
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xfff2d8, 0xb08d52, 1.05));
  const fill = new THREE.DirectionalLight(0xfff6e6, 0.5);
  fill.position.set(-14, 20, -18);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffedc4, 2.1);
  sun.position.set(18, 32, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const groundTexture = noiseTexture("#9dbb59", "#7fa348", 1400, 12);
  groundTexture.repeat.set(48, 48);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(200, 48),
    new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const curve = createLoopCurve(40, 6, 0);
  const road = createTrackRibbon(curve, 7, 0xc9a05e, 0.05);
  road.receiveShadow = true;
  scene.add(road);

  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(7, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xfff0a8, fog: false })
  );
  sunDisc.position.set(-70, 62, -95);
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({
      map: radialFadeTexture("rgba(255,240,168,0.8)", "rgba(255,240,168,0)"),
      transparent: true,
      depthWrite: false,
      fog: false,
    })
  );
  sunGlow.position.copy(sunDisc.position);
  scene.add(sunGlow);

  const rand = seededRandom(11);
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 7; i += 1) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j += 1) {
      const puff = part(
        cloud,
        new THREE.SphereGeometry(2.6 + rand() * 2.4, 12, 10),
        { color: 0xffffff, roughness: 1, opacity: 0.92, shadows: false },
        j * 3 - 4.5,
        rand() * 1.4,
        rand() * 1.5
      );
      puff.scale.y = 0.6;
    }
    const angle = rand() * Math.PI * 2;
    cloud.position.set(Math.cos(angle) * 100, 34 + rand() * 16, Math.sin(angle) * 100);
    scene.add(cloud);
    clouds.push(cloud);
  }

  for (let i = 0; i < 30; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() < 0.5 ? 12 + rand() * 15 : 58 + rand() * 60;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const kind = rand();
    if (kind < 0.42) {
      const tree = new THREE.Group();
      const lean = (rand() - 0.5) * 0.25;
      const trunk = part(tree, new THREE.CylinderGeometry(0.32, 0.62, 5.4, 10), { map: noiseTexture("#7d5433", "#5d3d24", 700, 100 + i), roughness: 1 }, 0, 2.7, 0);
      trunk.rotation.z = lean;
      part(tree, new THREE.SphereGeometry(3.6, 14, 10), { map: noiseTexture("#5d9c46", "#487d36", 900, 130 + i), roughness: 1 }, lean * 5, 5.7, 0).scale.set(1.4, 0.42, 1.4);
      part(tree, new THREE.SphereGeometry(2.5, 12, 10), { map: noiseTexture("#6cae52", "#528c3e", 700, 160 + i), roughness: 1 }, lean * 5 + 0.6, 6.4, 0.4).scale.set(1.2, 0.4, 1.2);
      tree.position.set(x, 0, z);
      scene.add(tree);
    } else if (kind < 0.62) {
      const bush = part(scene, new THREE.SphereGeometry(1.3 + rand() * 0.6, 12, 9), { map: noiseTexture("#6fae52", "#55893c", 600, 200 + i), roughness: 1 }, x, 0.7, z);
      bush.scale.set(1.25, 0.7, 1.25);
    } else if (kind < 0.82) {
      const rock = part(scene, new THREE.DodecahedronGeometry(0.9 + rand() * 0.9, 0), { map: noiseTexture("#b1a893", "#8e8672", 500, 240 + i), roughness: 1 }, x, 0.55, z);
      rock.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
    } else {
      part(scene, latheBody([[0.9, 0], [0.65, 1.1], [0.3, 2.2], [0.05, 2.9]], 12), { map: noiseTexture("#b3763f", "#8f5c2e", 600, 280 + i), roughness: 1 }, x, 0, z);
    }
  }

  const tuftGeometry = new THREE.ConeGeometry(0.16, 0.9, 6);
  const tuftMaterial = new THREE.MeshStandardMaterial({ color: 0xc9c26a, roughness: 1 });
  const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, 240);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 240; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 9 + rand() * 85;
    matrix.makeRotationY(rand() * Math.PI);
    matrix.setPosition(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
    tufts.setMatrixAt(i, matrix);
  }
  scene.add(tufts);

  const vehicle = buildJeep();
  scene.add(vehicle);

  const animals: RideAnimalNode[] = SAFARI_RIDE.animals.map((spec: RideAnimalSpec) => {
    const built = ANIMAL_BUILDERS[spec.word]();
    built.group.traverse((object) => {
      object.castShadow = true;
    });
    placeBesideTrack(built.group, curve, spec.t, spec.side, 8.5);
    scene.add(built.group);
    return { spec, group: built.group, animate: built.animate };
  });

  return {
    curve,
    vehicle,
    animals,
    laneHalfWidth: 2.2,
    cameraDistance: 9,
    cameraHeight: 4.2,
    update: (time: number, vehiclePosition: THREE.Vector3) => {
      sun.position.set(vehiclePosition.x + 18, 32, vehiclePosition.z + 8);
      sun.target.position.copy(vehiclePosition);
      clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(time * 0.04 + index) * 0.012;
      });
    },
  };
}
