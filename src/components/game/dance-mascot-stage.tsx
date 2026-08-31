"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { DanceMove } from "@/lib/dance-cues";

export type DemonstratedMove = DanceMove | "idle";

interface DanceMascotStageProps {
  move: DemonstratedMove;
  actionKey: string;
  guide: string;
  onTap: () => void;
}

interface MascotRig {
  root: THREE.Group;
  body: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  tail: THREE.Group;
  eyes: THREE.Group[];
  ears: THREE.Group[];
}

interface DanceEffects {
  clapStars: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  jumpStars: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  stompRings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[];
  wiggleOrbs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  platformRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  keyLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  fillLight: THREE.PointLight;
}

function material(color: number, roughness = 0.68, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(
  geometry: THREE.BufferGeometry,
  surface: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1]
) {
  const item = new THREE.Mesh(geometry, surface);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

/** Smooth Hermite interpolation */
function smoothStep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

/** Power ease-out for impacts */
function easeOutQuad(t: number) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

/** A zero-velocity pulse for contact, flight, and weight-transfer arcs. */
function sinePulse(value: number, start: number, end: number) {
  if (value <= start || value >= end) return 0;
  const progress = (value - start) / (end - start);
  return Math.sin(progress * Math.PI) ** 2;
}

function cycle(time: number, duration: number) {
  return (((time % duration) + duration) % duration) / duration;
}

function buildOceanBuddy(): MascotRig {
  // Cel-shaded look: a 4-step gradient map quantizes lighting into cartoon bands,
  // which reads as a stylized animated character instead of shaded clay balls
  const gradientData = new Uint8Array([
    120, 120, 120, 255,
    178, 178, 178, 255,
    236, 236, 236, 255,
    255, 255, 255, 255,
  ]);
  const gradientMap = new THREE.DataTexture(gradientData, 4, 1, THREE.RGBAFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  const toon = (color: number) => new THREE.MeshToonMaterial({ color, gradientMap });

  // Warm plush palette, on-model with the 2D art: green overalls + red kerchief
  const brown = toon(0xb0713d);
  const darkBrown = toon(0x84512a);
  const cream = toon(0xffe6be);
  const teal = toon(0x3fa06a);
  const coral = toon(0xff6782);
  const scarf = toon(0xe8563c);
  const sunny = toon(0xffd93d);
  const white = toon(0xffffff);
  const black = toon(0x241a2e);
  const glossWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const inkBlack = new THREE.MeshBasicMaterial({ color: 0x1c1424 });
  const mouthDark = toon(0x6e2740);

  const root = new THREE.Group();
  root.position.y = 0.14;

  // Pelvis / lower body group
  const body = new THREE.Group();
  root.add(body);

  // Main belly sphere & overalls base
  body.add(mesh(new THREE.SphereGeometry(0.92, 28, 20), brown, [0, 0, 0], [1.05, 1.2, 0.8]));
  body.add(mesh(new THREE.SphereGeometry(0.74, 24, 18), cream, [0, -0.02, 0.56], [0.8, 0.94, 0.28]));
  body.add(mesh(new THREE.SphereGeometry(0.75, 24, 18), teal, [0, -0.48, 0.4], [1.06, 0.72, 0.44]));

  // Chest / upper body group
  const chest = new THREE.Group();
  chest.position.set(0, 0.25, 0);
  body.add(chest);

  const bib = mesh(new THREE.BoxGeometry(0.92, 0.74, 0.12), teal, [0, -0.06, 0.8], [1, 1, 1]);
  bib.geometry.translate(0, -0.1, 0);
  chest.add(bib);

  // Short straps angled back over the shoulders (kept clear of the face)
  for (const x of [-0.34, 0.34]) {
    const strap = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 10), teal, [x, 0.32, 0.55], [1, 1, 1]);
    strap.rotation.x = -0.55;
    strap.rotation.z = x < 0 ? -0.18 : 0.18;
    chest.add(strap);
    chest.add(mesh(new THREE.SphereGeometry(0.075, 12, 8), coral, [x * 0.91, 0.08, 0.88]));
  }

  // Star badge on the bib
  const star = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 5), sunny, [0, -0.14, 0.92]);
  star.rotation.x = Math.PI / 2;
  chest.add(star);

  // Red kerchief around the neck with a knot tail, like the 2D art
  const kerchief = mesh(new THREE.TorusGeometry(0.52, 0.15, 12, 26), scarf, [0, 0.6, 0.08], [1, 1, 0.85]);
  kerchief.rotation.x = Math.PI / 2;
  chest.add(kerchief);
  const knot = mesh(new THREE.ConeGeometry(0.17, 0.36, 10), scarf, [0.1, 0.36, 0.62], [1, 1, 0.6]);
  knot.rotation.x = Math.PI;
  knot.rotation.z = -0.25;
  chest.add(knot);

  // Head group anchored to chest/neck
  const head = new THREE.Group();
  head.position.set(0, 1.15, 0);
  chest.add(head);

  // Head mesh
  head.add(mesh(new THREE.SphereGeometry(0.92, 30, 22), brown, [0, 0, 0], [1.04, 0.94, 0.88]));

  // Ears (grouped for expressive micro-wiggles)
  const ears: THREE.Group[] = [-0.74, 0.74].map((x) => {
    const ear = new THREE.Group();
    ear.position.set(x, 0.38, 0);
    ear.add(mesh(new THREE.SphereGeometry(0.32, 20, 14), darkBrown, [0, 0, 0], [1, 1, 0.68]));
    ear.add(mesh(new THREE.SphereGeometry(0.24, 18, 14), cream, [0, 0, 0.08], [1, 1, 0.55]));
    head.add(ear);
    return ear;
  });

  // Snout & nose
  head.add(mesh(new THREE.SphereGeometry(0.4, 22, 16), cream, [-0.25, -0.18, 0.7], [1, 0.8, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.4, 22, 16), cream, [0.25, -0.18, 0.7], [1, 0.8, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.19, 18, 12), black, [0, -0.02, 0.95], [1.18, 0.84, 0.68]));

  // Big glossy cartoon eyes: sclera, warm iris, deep pupil, twin catchlights
  const iris = toon(0x5a3620);
  const eyes = [-0.3, 0.3].map((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.26, 0.72);
    eye.add(mesh(new THREE.SphereGeometry(0.2, 20, 16), white, [0, 0, 0], [1, 1.18, 0.6]));
    eye.add(mesh(new THREE.SphereGeometry(0.125, 16, 12), iris, [0, -0.01, 0.09], [1, 1.15, 0.55]));
    eye.add(mesh(new THREE.SphereGeometry(0.075, 14, 10), inkBlack, [0, -0.01, 0.14], [1, 1.15, 0.5]));
    eye.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), glossWhite, [0.055, 0.07, 0.18]));
    eye.add(mesh(new THREE.SphereGeometry(0.024, 8, 6), glossWhite, [-0.05, -0.05, 0.19]));
    head.add(eye);
    return eye;
  });

  // Expressive eyebrows
  for (const x of [-0.3, 0.3]) {
    const brow = mesh(new THREE.CapsuleGeometry(0.035, 0.16, 6, 8), darkBrown, [x, 0.52, 0.6], [1, 1, 0.7]);
    brow.rotation.z = Math.PI / 2 + (x < 0 ? -0.22 : 0.22);
    head.add(brow);
  }

  // Open singing smile with tongue
  head.add(mesh(new THREE.SphereGeometry(0.14, 18, 12), mouthDark, [0, -0.35, 0.84], [1.4, 0.55, 0.45]));
  head.add(mesh(new THREE.SphereGeometry(0.08, 14, 10), coral, [0, -0.38, 0.9], [1.35, 0.42, 0.45]));

  // Blush circles
  for (const x of [-0.56, 0.56]) {
    const blush = mesh(new THREE.SphereGeometry(0.11, 12, 10), toon(0xff9db0), [x, -0.08, 0.58], [1, 0.68, 0.25]);
    blush.rotation.y = x < 0 ? -0.55 : 0.55;
    head.add(blush);
  }

  // Otter whiskers
  const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.75 });
  for (const side of [-1, 1]) {
    for (const [tilt, y] of [
      [0.28, -0.1],
      [0.02, -0.2],
    ] as const) {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), whiskerMat);
      whisker.position.set(side * 0.52, y, 0.66);
      whisker.rotation.z = Math.PI / 2 + side * tilt;
      whisker.rotation.y = side * 0.45;
      head.add(whisker);
    }
  }

  // Hair tuft swoosh on top
  for (const [tx, tz, lean] of [
    [-0.08, 0.16, -0.35],
    [0.08, 0.1, 0.15],
    [0.2, 0.02, 0.55],
  ] as const) {
    const tuft = mesh(new THREE.ConeGeometry(0.1, 0.3, 10), brown, [tx, 0.84, tz]);
    tuft.rotation.z = lean;
    tuft.rotation.x = -0.15;
    head.add(tuft);
  }

  // Arms with proper shoulder -> elbow -> wrist kinetic chain
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.88, 0.45, 0);

    // Shoulder cap + upper arm — joint spheres share the fur color and overlap
    // the capsules so the limb reads as one soft piece, not stacked beads
    shoulder.add(mesh(new THREE.SphereGeometry(0.24, 16, 12), brown, [0, -0.04, 0]));
    const upperArm = mesh(new THREE.CapsuleGeometry(0.19, 0.36, 6, 10), brown, [0, -0.28, 0]);
    shoulder.add(upperArm);

    // Forearm hinge
    const forearm = new THREE.Group();
    forearm.position.set(0, -0.54, 0);
    forearm.add(mesh(new THREE.SphereGeometry(0.2, 14, 10), brown, [0, 0, 0]));
    const lowerArm = mesh(new THREE.CapsuleGeometry(0.18, 0.32, 6, 10), brown, [0, -0.26, 0]);
    forearm.add(lowerArm);
    shoulder.add(forearm);

    // Hand / paw
    const hand = new THREE.Group();
    hand.position.set(0, -0.55, 0);
    hand.add(mesh(new THREE.SphereGeometry(0.24, 18, 12), darkBrown, [0, 0, 0], [1, 0.92, 0.8]));
    // Cute paw pads
    hand.add(mesh(new THREE.SphereGeometry(0.08, 12, 8), coral, [0, -0.05, 0.16], [1, 0.85, 0.4]));
    for (const px of [-0.09, 0, 0.09]) {
      hand.add(mesh(new THREE.SphereGeometry(0.045, 10, 6), coral, [px, 0.08, 0.16], [1, 0.85, 0.4]));
    }
    forearm.add(hand);

    chest.add(shoulder);
    return { shoulder, forearm, hand };
  };

  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);

  // Legs with hip -> knee -> ankle kinetic chain
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.38, -0.75, 0.04);
    hip.add(mesh(new THREE.CapsuleGeometry(0.22, 0.28, 6, 10), brown, [0, -0.25, 0]));

    const shin = new THREE.Group();
    shin.position.set(0, -0.5, 0);
    shin.add(mesh(new THREE.SphereGeometry(0.21, 14, 10), brown, [0, 0, 0]));
    shin.add(mesh(new THREE.CapsuleGeometry(0.2, 0.26, 6, 10), brown, [0, -0.24, 0]));
    hip.add(shin);

    const foot = new THREE.Group();
    foot.position.set(0, -0.51, 0.12);
    foot.add(mesh(new THREE.SphereGeometry(0.3, 18, 12), darkBrown, [0, 0, 0.06], [1.28, 0.72, 1.5]));
    // Foot pads
    foot.add(mesh(new THREE.SphereGeometry(0.12, 12, 8), coral, [0, -0.16, 0.1], [1.1, 0.3, 1.3]));
    shin.add(foot);

    root.add(hip);
    return { hip, shin, foot };
  };

  const leftLegRig = makeLeg(-1);
  const rightLegRig = makeLeg(1);

  // Tail anchored to rear pelvis
  const tail = new THREE.Group();
  tail.position.set(0.68, -0.5, -0.4);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.26, 0.62, 7, 12), darkBrown, [0, -0.34, 0]);
  tailMesh.rotation.z = -0.75;
  tail.add(tailMesh);
  // Rounded tip so the tail reads as a soft paddle, not a plank
  tail.add(mesh(new THREE.SphereGeometry(0.28, 16, 12), darkBrown, [0.3, -0.56, 0], [1.25, 0.85, 1]));
  root.add(tail);

  root.scale.setScalar(1.24);

  return {
    root,
    body,
    chest,
    head,
    leftArm: leftArmRig.shoulder,
    rightArm: rightArmRig.shoulder,
    leftForearm: leftArmRig.forearm,
    rightForearm: rightArmRig.forearm,
    leftHand: leftArmRig.hand,
    rightHand: rightArmRig.hand,
    leftLeg: leftLegRig.hip,
    rightLeg: rightLegRig.hip,
    leftShin: leftLegRig.shin,
    rightShin: rightLegRig.shin,
    leftFoot: leftLegRig.foot,
    rightFoot: rightLegRig.foot,
    tail,
    eyes,
    ears,
  };
}

function buildDanceEffects(
  scene: THREE.Scene,
  platformRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>,
  lights: { keyLight: THREE.DirectionalLight; rimLight: THREE.DirectionalLight; fillLight: THREE.PointLight }
): DanceEffects {
  const effectMesh = (geometry: THREE.BufferGeometry, color: number) => {
    const item = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
    );
    item.visible = false;
    item.renderOrder = 5;
    scene.add(item);
    return item;
  };

  const colors = [0xffea5c, 0xff5a86, 0x5ee8ff, 0xa374ff, 0xffffff];

  // Clapping Sparkles & Floating Musical Star-Bursts
  const clapStars = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2;
    const item = effectMesh(new THREE.OctahedronGeometry(0.12 + (index % 3) * 0.03, 0), colors[index % colors.length]);
    item.userData.angle = angle;
    item.userData.speed = 1.2 + (index % 4) * 0.3;
    return item;
  });

  // Jump Energy Crystals & Speed Rings
  const jumpStars = Array.from({ length: 12 }, (_, index) => {
    const item = effectMesh(new THREE.TetrahedronGeometry(0.1 + (index % 2) * 0.04, 0), colors[(index + 1) % colors.length]);
    item.userData.side = index % 2 === 0 ? -1 : 1;
    item.userData.offset = index / 12;
    item.userData.speed = 0.8 + (index % 3) * 0.4;
    return item;
  });

  // Stomp Shockwave Ripple Rings
  const stompRings = [-1, 1].map((side) => {
    const item = effectMesh(new THREE.TorusGeometry(0.38, 0.05, 8, 36), side < 0 ? 0xffd93d : 0x5ee8ff) as
      THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    item.rotation.x = Math.PI / 2;
    item.position.set(side * 0.4, -2.05, 0.12);
    return item;
  });

  // Wiggle Spiral Melody Orbs
  const wiggleOrbs = Array.from({ length: 8 }, (_, index) => {
    const item = effectMesh(new THREE.SphereGeometry(0.09 + (index % 2) * 0.04, 14, 10), colors[index % colors.length]);
    item.userData.offset = index / 8;
    return item;
  });

  return {
    clapStars,
    jumpStars,
    stompRings,
    wiggleOrbs,
    platformRing,
    keyLight: lights.keyLight,
    rimLight: lights.rimLight,
    fillLight: lights.fillLight,
  };
}

function resetPose(rig: MascotRig) {
  rig.root.position.set(0, 0.14, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.root.scale.setScalar(1.24);

  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.body.scale.set(1, 1, 1);

  rig.chest.position.set(0, 0.25, 0);
  rig.chest.rotation.set(0, 0, 0);

  rig.head.position.set(0, 1.15, 0);
  rig.head.rotation.set(0, 0, 0);

  rig.leftArm.position.set(-0.88, 0.45, 0);
  rig.rightArm.position.set(0.88, 0.45, 0);
  rig.leftArm.rotation.set(0, 0, -0.12);
  rig.rightArm.rotation.set(0, 0, 0.12);

  rig.leftForearm.position.set(0, -0.54, 0);
  rig.rightForearm.position.set(0, -0.54, 0);
  rig.leftForearm.rotation.set(0, 0, 0);
  rig.rightForearm.rotation.set(0, 0, 0);

  rig.leftHand.position.set(0, -0.55, 0);
  rig.rightHand.position.set(0, -0.55, 0);
  rig.leftHand.rotation.set(0, 0, 0);
  rig.rightHand.rotation.set(0, 0, 0);

  rig.leftLeg.position.set(-0.38, -0.75, 0.04);
  rig.rightLeg.position.set(0.38, -0.75, 0.04);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);

  rig.leftShin.position.set(0, -0.5, 0);
  rig.rightShin.position.set(0, -0.5, 0);
  rig.leftShin.rotation.set(0, 0, 0);
  rig.rightShin.rotation.set(0, 0, 0);

  rig.leftFoot.position.set(0, -0.51, 0.12);
  rig.rightFoot.position.set(0, -0.51, 0.12);
  rig.leftFoot.rotation.set(0, 0, 0);
  rig.rightFoot.rotation.set(0, 0, 0);

  rig.tail.rotation.set(0, 0, 0);
  rig.eyes.forEach((eye) => eye.scale.set(1, 1, 1));
  rig.ears.forEach((ear) => ear.rotation.set(0, 0, 0));
}

function resetEffects(effects: DanceEffects) {
  [...effects.clapStars, ...effects.jumpStars, ...effects.stompRings, ...effects.wiggleOrbs].forEach((item) => {
    item.visible = false;
    item.scale.setScalar(1);
    const surface = item.material as THREE.MeshBasicMaterial;
    surface.opacity = 0;
  });
  effects.platformRing.scale.set(1, 1, 1);
  effects.platformRing.material.emissiveIntensity = 0.25;
  effects.keyLight.intensity = 3.0;
  effects.rimLight.intensity = 2.2;
  effects.fillLight.intensity = 1.2;
}

function poseEffects(effects: DanceEffects, move: DemonstratedMove, time: number) {
  resetEffects(effects);
  const platformPulse = 1 + Math.sin(time * 6.28) * 0.02;
  effects.platformRing.scale.setScalar(platformPulse);

  if (move === "clap") {
    // The burst starts at palm contact, then travels away from the hands.
    const phase = cycle(time, 0.8);
    const burstAge = phase >= 0.56 && phase <= 0.9 ? (phase - 0.56) / 0.34 : -1;
    const sparkle = burstAge >= 0 ? 1 - smoothStep(burstAge) : 0;

    effects.clapStars.forEach((item, index) => {
      const angle = item.userData.angle as number;
      const speed = item.userData.speed as number;
      item.visible = sparkle > 0.05;
      const travel = burstAge >= 0 ? easeOutQuad(burstAge) : 0;
      const radius = 0.18 + travel * 0.72 * speed;
      item.position.set(
        Math.cos(angle) * radius,
        0.54 + Math.sin(angle) * radius * 0.8,
        1.15 + travel * 0.2
      );
      item.rotation.set(time * 4 + index, time * 3, time * 5);
      item.scale.setScalar(0.5 + sparkle * 0.9);
      item.material.opacity = sparkle * 0.95;
    });

    effects.platformRing.material.emissiveIntensity = 0.35 + sparkle * 1.5;
    effects.fillLight.intensity = 1.0 + sparkle * 2.5;
  } else if (move === "jump") {
    // Flight and landing use zero-velocity curves, so no frame can snap at
    // take-off or contact when this loops or changes moves.
    const phase = cycle(time, 1.25);
    const flight = sinePulse(phase, 0.31, 0.7);
    const landing = sinePulse(phase, 0.7, 0.9);

    effects.jumpStars.forEach((item, index) => {
      const side = item.userData.side as number;
      const offset = item.userData.offset as number;
      const speed = item.userData.speed as number;
      item.visible = flight > 0.05;
      item.position.set(
        side * (1.1 + offset * 0.5 + Math.sin(time * 8 + index) * 0.15),
        -1.4 + offset * 3.2 + flight * 0.4 * speed,
        0.4
      );
      item.rotation.set(time * 3 + index, time * 2, time * 4);
      item.scale.setScalar(0.6 + flight * 0.8);
      item.material.opacity = flight * 0.9;
    });

    effects.platformRing.material.emissiveIntensity = 0.4 + flight * 1.2 + landing * 1.8;
    effects.keyLight.intensity = 3.6 + flight * 1.2;
    effects.fillLight.intensity = 1.0 + landing * 3.0;
  } else if (move === "stomp") {
    // One planted, readable stomp on each half-beat. Rings appear only after
    // the raised foot reaches the floor.
    const phase = cycle(time, 1.0);
    effects.stompRings.forEach((item, index) => {
      const halfStart = index * 0.5;
      const local = (phase - halfStart) / 0.5;
      const progress = (local - 0.7) / 0.26;
      const active = local >= 0.7 && local <= 0.96;
      item.visible = active;
      item.scale.setScalar(0.45 + Math.max(progress, 0) * 4.8);
      item.material.opacity = active ? (1 - smoothStep(progress)) * 0.9 : 0;
    });

    const halfPhase = (phase % 0.5) / 0.5;
    const impact = sinePulse(halfPhase, 0.7, 0.96);
    effects.platformRing.material.emissiveIntensity = 0.35 + impact * 2.0;
    effects.fillLight.intensity = 1.0 + impact * 2.0;
  } else if (move === "wiggle") {
    // 1.0s groove cycle
    effects.wiggleOrbs.forEach((item, index) => {
      const offset = item.userData.offset as number;
      const angle = time * 3.14 + offset * Math.PI * 2;
      item.visible = true;
      item.position.set(
        Math.cos(angle) * (1.3 + (index % 2) * 0.28),
        -0.1 + offset * 2.5 + Math.sin(angle * 1.8) * 0.22,
        0.35 + Math.sin(angle) * 0.3
      );
      item.scale.setScalar(0.8 + Math.sin(angle * 2.5) * 0.25);
      item.material.opacity = 0.65 + Math.sin(angle) * 0.25;
    });

    effects.platformRing.material.emissiveIntensity = 0.55 + Math.sin(time * 6.28) * 0.35;
    effects.rimLight.intensity = 2.0 + Math.sin(time * 6.28) * 0.8;
  }
}

/**
 * High-realism anatomical kinematics incorporating the 12 Principles of Animation:
 * - Squash and stretch volume preservation
 * - Kinetic chains with joint limits
 * - Overlapping action and secondary inertia (tail, ears, spine)
 * - 120 BPM musical rhythm alignment
 */
function poseMascot(
  rig: MascotRig,
  effects: DanceEffects,
  move: DemonstratedMove,
  elapsed: number,
  reducedMotion: boolean
) {
  resetPose(rig);
  const time = reducedMotion ? 0.36 : elapsed;

  // Base 120 BPM musical rhythm groove (2 beats per second = 1.0s measure)
  const bpmFreq = Math.PI * 2 * 2; // 2 beats/sec = 120 BPM
  const musicBeat = Math.sin(time * bpmFreq);
  const musicBar = Math.sin(time * (bpmFreq / 2));

  // Natural breathing & lively head/tail idle micro-groove
  const breath = Math.sin(time * 2.4);
  rig.chest.scale.set(1 + breath * 0.02, 1 + breath * 0.025, 1 + breath * 0.02);
  rig.tail.rotation.z = Math.sin(time * 3.5) * 0.18;
  rig.ears.forEach((ear, i) => {
    ear.rotation.z = (i === 0 ? -1 : 1) * Math.sin(time * 4.2 + i * 0.9) * 0.09;
    ear.rotation.x = Math.sin(time * 3.1 + i * 1.3) * 0.05;
  });

  // Natural lively eye blinks
  if (!reducedMotion) {
    const blink = Math.pow(Math.max(0, Math.sin(time * 1.45)), 38);
    rig.eyes.forEach((eye) => (eye.scale.y = 1 - blink * 0.88));
  }

  if (move === "idle") {
    // Upbeat dance idle groove: bouncing on balls of feet, gentle shoulder sway, head nodding
    const bounce = Math.abs(musicBeat);
    rig.root.position.y += bounce * 0.05;
    rig.body.scale.y = 1 - bounce * 0.03;
    rig.body.scale.x = 1 + bounce * 0.02;
    rig.body.scale.z = 1 + bounce * 0.02;

    // Head nod & shoulder sway
    rig.head.rotation.x = -bounce * 0.08;
    rig.head.rotation.z = musicBar * 0.05;
    rig.body.rotation.z = -musicBar * 0.04;

    // Relaxed arms with subtle rhythmic swing — right side trails slightly
    const musicBarLag = Math.sin(time * (bpmFreq / 2) - 0.55);
    rig.leftArm.rotation.z = -0.25 - musicBar * 0.12;
    rig.rightArm.rotation.z = 0.25 - musicBarLag * 0.12;
    rig.leftForearm.rotation.z = 0.35 + bounce * 0.1;
    rig.rightForearm.rotation.z = -0.35 - Math.abs(musicBarLag) * 0.1;

    // Gentle knee flexion
    rig.leftLeg.rotation.x = bounce * 0.08;
    rig.rightLeg.rotation.x = bounce * 0.08;
    rig.leftShin.rotation.x = -bounce * 0.08;
    rig.rightShin.rotation.x = -bounce * 0.08;
  } else if (move === "clap") {
    // ----------------------------------------------------
    // CLAP: prepare -> open -> strike -> rebound -> settle
    // ----------------------------------------------------
    const clapCycle = 0.8;
    const phase = cycle(time, clapCycle);
    const ready = phase < 0.18
      ? smoothStep(phase / 0.18)
      : phase > 0.9
        ? 1 - smoothStep((phase - 0.9) / 0.1)
        : 1;
    const clapContact = sinePulse(phase, 0.43, 0.71);
    const rebound = sinePulse(phase, 0.68, 0.9);

    // Alternating torso accents make the repeated clap feel danced rather than
    // mechanically mirrored. The accent is zero at the loop boundary.
    const alt = Math.floor(time / clapCycle) % 2 === 0 ? 1 : -1;
    rig.root.rotation.z = alt * ready * 0.035;
    rig.root.rotation.y = alt * ready * 0.055;
    rig.head.rotation.z = alt * ready * 0.09;

    // The hands lead the contact; knees and torso answer a fraction later.
    const bodyAccent = sinePulse(phase, 0.53, 0.78);
    rig.body.scale.y = 1 - bodyAccent * 0.055 + ready * 0.018;
    rig.body.scale.x = 1 + bodyAccent * 0.035;
    rig.body.scale.z = 1 + bodyAccent * 0.035;

    rig.root.position.y += ready * 0.035 - bodyAccent * 0.07;
    rig.chest.rotation.x = -ready * 0.055 + bodyAccent * 0.13;
    rig.head.rotation.x = -ready * 0.04 + bodyAccent * 0.1;

    // Shoulder -> elbow -> wrist sequencing. The open pose keeps the hands in
    // front of the chest; contact rotates both palms onto the same plane.
    const leftOpen = THREE.MathUtils.lerp(-0.12, -0.64, ready);
    const rightOpen = THREE.MathUtils.lerp(0.12, 0.64, ready);
    rig.leftArm.rotation.x = -ready * 0.16 - clapContact * 0.2;
    rig.rightArm.rotation.x = -ready * 0.16 - clapContact * 0.2;
    rig.leftArm.rotation.y = clapContact * 0.38;
    rig.rightArm.rotation.y = -clapContact * 0.38;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(leftOpen, 0.98, clapContact);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(rightOpen, -0.98, clapContact);

    rig.leftForearm.rotation.z = ready * 0.38 + clapContact * 0.5 - rebound * 0.08;
    rig.rightForearm.rotation.z = -ready * 0.38 - clapContact * 0.5 + rebound * 0.08;
    rig.leftForearm.position.z = ready * 0.18 + clapContact * 0.2;
    rig.rightForearm.position.z = ready * 0.18 + clapContact * 0.2;

    rig.leftHand.position.z = clapContact * 0.18;
    rig.rightHand.position.z = clapContact * 0.18;
    rig.leftHand.rotation.y = -0.6 * clapContact;
    rig.rightHand.rotation.y = 0.6 * clapContact;
    rig.leftHand.rotation.z = -rebound * 0.08;
    rig.rightHand.rotation.z = rebound * 0.08;

    rig.leftLeg.rotation.x = bodyAccent * 0.13;
    rig.rightLeg.rotation.x = bodyAccent * 0.13;
    rig.leftShin.rotation.x = -bodyAccent * 0.18;
    rig.rightShin.rotation.x = -bodyAccent * 0.18;

    rig.tail.rotation.z = alt * ready * 0.22 - rebound * alt * 0.18;
  } else if (move === "jump") {
    // ----------------------------------------------------
    // JUMP: anticipation -> push -> flight -> absorb -> recover
    // ----------------------------------------------------
    const jumpCycle = 1.25;
    const phase = cycle(time, jumpCycle);

    let crouch = 0;
    let flight = 0;
    let armsUp = 0;
    let landing = 0;
    let launch = 0;
    let yOffset = 0;

    if (phase < 0.2) {
      const p = phase / 0.2;
      crouch = smoothStep(p);
      yOffset = -0.34 * crouch;
    } else if (phase < 0.31) {
      const p = smoothStep((phase - 0.2) / 0.11);
      launch = p;
      crouch = 1 - p;
      armsUp = p;
      yOffset = THREE.MathUtils.lerp(-0.34, 0, p);
    } else if (phase < 0.7) {
      const p = (phase - 0.31) / 0.39;
      // Carry the take-off stretch into early flight instead of dropping the
      // launch pose on the boundary. The smooth decay also preserves velocity.
      launch = 1 - smoothStep(Math.min(p / 0.35, 1));
      flight = Math.sin(p * Math.PI) ** 2;
      armsUp = 1;
      yOffset = flight * 0.96;
    } else if (phase < 0.9) {
      const p = (phase - 0.7) / 0.2;
      landing = Math.sin(p * Math.PI) ** 2;
      armsUp = 1 - smoothStep(p);
      yOffset = -landing * 0.31;
    }

    // Every positional curve reaches zero with zero velocity at a boundary.
    // This keeps the take-off, landing, and loop transition visually seamless.
    const squashY = 1 - crouch * 0.18 - landing * 0.2 + launch * 0.08 + flight * 0.035;
    const jumpTwist = Math.sin(Math.floor(time / jumpCycle) * 1.7 + 0.6) * 0.2;
    rig.root.rotation.y = jumpTwist * flight;
    rig.root.rotation.z = jumpTwist * flight * 0.22;
    rig.root.position.y += yOffset;
    rig.body.scale.y = squashY;
    const invScale = Math.sqrt(1 / Math.max(0.2, squashY));
    rig.body.scale.x = invScale;
    rig.body.scale.z = invScale;

    // The torso initiates the jump and the head counter-rotates to keep the
    // face readable. Arms swing back before rising overhead.
    rig.chest.rotation.x = crouch * 0.3 - launch * 0.12 - flight * 0.08 + landing * 0.26;
    rig.head.rotation.x = -crouch * 0.16 + launch * 0.14 + flight * 0.16 - landing * 0.12;
    rig.leftArm.rotation.x = crouch * 0.72 - armsUp * 0.14;
    rig.rightArm.rotation.x = crouch * 0.72 - armsUp * 0.14;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.22, 2.72, armsUp);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.22, -2.72, armsUp);
    rig.leftArm.position.z = armsUp * 0.18;
    rig.rightArm.position.z = armsUp * 0.18;
    rig.leftForearm.rotation.z = -armsUp * 0.22 + landing * 0.42;
    rig.rightForearm.rotation.z = armsUp * 0.22 - landing * 0.42;

    // Straight legs at take-off, a compact tuck around the apex, then a deep
    // two-foot landing. Feet point in flight and flatten before contact.
    const kneeBend = crouch * 1.05 + flight * 0.72 + landing * 1.12;
    const anklePoint = launch * 0.62 + flight * 0.42 - landing * 0.28;
    rig.leftLeg.rotation.x = -kneeBend * 0.85;
    rig.rightLeg.rotation.x = -kneeBend * 0.85;
    rig.leftShin.rotation.x = kneeBend * 1.45;
    rig.rightShin.rotation.x = kneeBend * 1.45;
    rig.leftFoot.rotation.x = -kneeBend * 0.4 + anklePoint;
    rig.rightFoot.rotation.x = -kneeBend * 0.4 + anklePoint;
    rig.leftLeg.rotation.z = flight * 0.16;
    rig.rightLeg.rotation.z = -flight * 0.16;

    rig.tail.rotation.z = crouch * 0.28 - launch * 0.42 - flight * 0.34 + landing * 0.24;
  } else if (move === "stomp") {
    // ----------------------------------------------------
    // STOMP: transfer weight -> lift -> strike -> absorb, alternating feet
    // ----------------------------------------------------
    const stompCycle = 1.0;
    const phase = cycle(time, stompCycle);

    const isLeft = phase < 0.5;
    const stepPhase = (phase % 0.5) / 0.5;
    const lift = sinePulse(stepPhase, 0.04, 0.7);
    const impact = sinePulse(stepPhase, 0.7, 0.96);

    const sideSign = isLeft ? -1 : 1;
    // Shift over the planted foot before the other foot leaves the floor.
    // Multiplying by lift returns the pelvis to center before sides switch.
    const weightShift = -sideSign * lift * 0.22;
    rig.root.position.x = weightShift;
    rig.root.position.y += lift * 0.045 - impact * 0.075;

    // Pelvic tilt & torso counter-lean
    rig.root.rotation.z = sideSign * lift * 0.12;
    rig.body.rotation.z = -sideSign * lift * 0.1;
    rig.body.rotation.y = sideSign * lift * 0.2;

    // Torso impact squash
    rig.body.scale.y = 1 - impact * 0.06;
    rig.body.scale.x = 1 + impact * 0.04;
    rig.body.scale.z = 1 + impact * 0.04;

    // Active stomping leg vs Supporting leg
    if (isLeft) {
      // A lifted thigh, relaxed shin, and flexed ankle create a clear march
      // silhouette before the sole flattens into the stomp.
      rig.leftLeg.position.y += lift * 0.38;
      rig.leftLeg.position.z += lift * 0.24;
      rig.leftLeg.rotation.x = -lift * 0.88;
      rig.leftShin.rotation.x = lift * 1.32;
      rig.leftFoot.rotation.x = -lift * 0.48 + impact * 0.08;

      // Supporting right leg absorbs weight
      rig.rightLeg.rotation.x = lift * 0.1 + impact * 0.14;
      rig.rightShin.rotation.x = -lift * 0.1 - impact * 0.14;

      // Marching arm opposition: Right arm swings forward, Left arm swings back
      rig.rightArm.rotation.x = -0.74 * lift;
      rig.rightArm.rotation.z = 0.12 + lift * 0.24;
      rig.rightForearm.rotation.z = -lift * 0.42;
      rig.leftArm.rotation.x = 0.58 * lift;
      rig.leftArm.rotation.z = -0.12 - lift * 0.24;
    } else {
      // Right leg lifts high with dorsiflexed ankle
      rig.rightLeg.position.y += lift * 0.38;
      rig.rightLeg.position.z += lift * 0.24;
      rig.rightLeg.rotation.x = -lift * 0.88;
      rig.rightShin.rotation.x = lift * 1.32;
      rig.rightFoot.rotation.x = -lift * 0.48 + impact * 0.08;

      // Supporting left leg absorbs weight
      rig.leftLeg.rotation.x = lift * 0.1 + impact * 0.14;
      rig.leftShin.rotation.x = -lift * 0.1 - impact * 0.14;

      // Marching arm opposition: Left arm swings forward, Right arm swings back
      rig.leftArm.rotation.x = -0.74 * lift;
      rig.leftArm.rotation.z = -0.12 - lift * 0.24;
      rig.leftForearm.rotation.z = lift * 0.42;
      rig.rightArm.rotation.x = 0.58 * lift;
      rig.rightArm.rotation.z = 0.12 + lift * 0.24;
    }

    // Head tilts with the groove & nods on impact
    rig.head.rotation.z = -sideSign * lift * 0.08;
    rig.head.rotation.x = -lift * 0.04 + impact * 0.1;

    // Tail swings in counter-balance
    rig.tail.rotation.z = -sideSign * lift * 0.52 + sideSign * impact * 0.16;
  } else if (move === "wiggle") {
    // ----------------------------------------------------
    // WIGGLE: planted hips, counter-rotating spine, delayed arm wave
    // ----------------------------------------------------
    const wiggleCycle = 1.0;
    const phase = cycle(time, wiggleCycle) * Math.PI * 2;

    const swayX = Math.sin(phase);
    const swayZ = Math.sin(phase * 2) * 0.5;
    const counterSway = Math.sin(phase + Math.PI * 0.6);
    const leftWeight = (1 + swayX) * 0.5;
    const rightWeight = 1 - leftWeight;

    // The pelvis travels less than the shoulders, keeping both feet visually
    // planted while weight rolls from one leg to the other.
    rig.root.position.x = swayX * 0.18;
    rig.root.position.z = swayZ * 0.09;
    rig.root.position.y -= (0.5 + swayZ * 0.5) * 0.045;
    rig.root.rotation.z = swayX * 0.14;
    rig.root.rotation.y = swayX * 0.24;

    // Pelvis, rib cage, and head counter-rotate in a natural S-curve.
    rig.body.rotation.y = -swayX * 0.28;
    rig.body.rotation.z = -swayX * 0.1;
    rig.chest.rotation.y = -swayX * 0.16;
    rig.chest.rotation.z = counterSway * 0.12;

    // Head groove & delayed tilt
    rig.head.rotation.z = -counterSway * 0.13;
    rig.head.rotation.y = counterSway * 0.1;
    rig.head.rotation.x = Math.sin(phase * 2) * 0.045;

    // Undulating Hula / Dance Wave Arms (Shoulder -> Elbow -> Wrist phase delay)
    const armWaveL = Math.sin(phase);
    const armWaveR = Math.sin(phase + Math.PI);
    const forearmWaveL = Math.sin(phase - Math.PI / 3);
    const forearmWaveR = Math.sin(phase + Math.PI - Math.PI / 3);
    const wristWaveL = Math.sin(phase - (Math.PI * 2) / 3);
    const wristWaveR = Math.sin(phase + Math.PI - (Math.PI * 2) / 3);

    rig.leftArm.rotation.z = -0.48 + armWaveL * 0.34;
    rig.rightArm.rotation.z = 0.48 + armWaveR * 0.34;
    rig.leftArm.rotation.x = 0.16 + forearmWaveL * 0.28;
    rig.rightArm.rotation.x = 0.16 + forearmWaveR * 0.28;

    rig.leftForearm.rotation.z = 0.55 + forearmWaveL * 0.32;
    rig.rightForearm.rotation.z = -0.55 - forearmWaveR * 0.32;
    rig.leftForearm.position.z = 0.12 + armWaveL * 0.14;
    rig.rightForearm.position.z = 0.12 + armWaveR * 0.14;

    rig.leftHand.rotation.y = wristWaveL * 0.38;
    rig.rightHand.rotation.y = wristWaveR * 0.38;
    rig.leftHand.rotation.z = wristWaveL * 0.28;
    rig.rightHand.rotation.z = wristWaveR * 0.28;

    // The unloaded heel lifts while the supporting knee softens. This small
    // foot action is what makes the upper-body wiggle feel grounded.
    rig.leftLeg.rotation.x = rightWeight * 0.1;
    rig.rightLeg.rotation.x = leftWeight * 0.1;
    rig.leftShin.rotation.x = -rightWeight * 0.12;
    rig.rightShin.rotation.x = -leftWeight * 0.12;
    rig.leftLeg.rotation.z = Math.max(0, swayX) * 0.11;
    rig.rightLeg.rotation.z = -Math.max(0, -swayX) * 0.11;
    rig.leftFoot.rotation.x = rightWeight * 0.13;
    rig.rightFoot.rotation.x = leftWeight * 0.13;
    rig.leftFoot.rotation.z = -Math.max(0, swayX) * 0.18;
    rig.rightFoot.rotation.z = Math.max(0, -swayX) * 0.18;

    rig.tail.rotation.z = -swayX * 0.62;
    rig.tail.rotation.y = swayZ * 0.38;
  }

  // Slow incommensurate drift so the pose never freezes into an exact loop
  if (!reducedMotion) {
    const drift = Math.sin(time * 0.7) * 0.6 + Math.sin(time * 1.13 + 1.7) * 0.4;
    const drift2 = Math.sin(time * 0.53 + 0.9);
    rig.head.rotation.y += drift * 0.07;
    rig.head.rotation.z += drift2 * 0.04;
    rig.chest.rotation.y += drift2 * 0.035;
    rig.root.rotation.y += drift * 0.03;
  }

  poseEffects(effects, move, time);
}

export function DanceMascotStage({ move, actionKey, guide, onTap }: DanceMascotStageProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const moveRef = useRef<DemonstratedMove>(move);
  const startedAtRef = useRef(0);
  const requestRenderRef = useRef<() => void>(() => undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    moveRef.current = move;
    startedAtRef.current = performance.now() / 1000;
    requestRenderRef.current();
  }, [actionKey, move]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3, 3, 3.3, -2.6, 0.1, 30);
    camera.position.set(0, 0.18, 9);
    camera.lookAt(0, 0, 0);

    // Enhanced Stage Lighting
    scene.add(new THREE.HemisphereLight(0xe8fbff, 0x244b70, 1.9));

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 3.0);
    keyLight.position.set(-4, 7, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6ee8ff, 2.2);
    rimLight.position.set(5, 2.5, 3.5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xff75a0, 1.2, 12);
    fillLight.position.set(0, -1.2, 3.5);
    scene.add(fillLight);

    // Multi-Layer 3D Dance Platform with Glowing Ring
    const platform = mesh(
      new THREE.CylinderGeometry(1.75, 1.95, 0.2, 48),
      material(0xffdc58, 0.6),
      [0, -2.18, 0]
    );
    platform.receiveShadow = true;
    scene.add(platform);

    const ring = mesh(
      new THREE.TorusGeometry(1.76, 0.09, 12, 48),
      material(0xffffff, 0.38),
      [0, -2.08, 0]
    ) as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
    ring.rotation.x = Math.PI / 2;
    ring.material.emissive.set(0xffd93d);
    ring.material.emissiveIntensity = 0.3;
    scene.add(ring);

    // Soft radial glow behind the mascot + concert spotlight cone from above
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const glowCtx = glowCanvas.getContext("2d");
    let glowTexture: THREE.CanvasTexture | null = null;
    if (glowCtx) {
      const grad = glowCtx.createRadialGradient(128, 128, 12, 128, 128, 128);
      grad.addColorStop(0, "rgba(255, 250, 235, 0.9)");
      grad.addColorStop(0.45, "rgba(255, 205, 240, 0.35)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      glowCtx.fillStyle = grad;
      glowCtx.fillRect(0, 0, 256, 256);
      glowTexture = new THREE.CanvasTexture(glowCanvas);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 6.4),
        new THREE.MeshBasicMaterial({
          map: glowTexture,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      glow.position.set(0, 0.5, -1.8);
      glow.renderOrder = -1;
      scene.add(glow);
    }

    const spotCone = new THREE.Mesh(
      new THREE.ConeGeometry(2.35, 6.6, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff3c4,
        transparent: true,
        opacity: 0.09,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    spotCone.position.set(0, 1.1, -0.7);
    scene.add(spotCone);

    const rig = buildOceanBuddy();
    scene.add(rig.root);
    const effects = buildDanceEffects(scene, ring, { keyLight, rimLight, fillLight });
    setReady(true);

    // Per-joint lag smoothing: poseMascot writes the target pose, then each joint
    // eases toward it at its own response rate. Snappy joints (hands, feet) keep
    // beat impacts crisp; floppy parts (tail, ears, head) trail behind for natural
    // follow-through, and move changes crossfade instead of snapping.
    const jointLags: [THREE.Object3D, number][] = [
      [rig.root, 16],
      [rig.body, 12],
      [rig.chest, 9],
      [rig.head, 7],
      [rig.leftArm, 16],
      [rig.rightArm, 16],
      [rig.leftForearm, 14],
      [rig.rightForearm, 14],
      [rig.leftHand, 18],
      [rig.rightHand, 18],
      [rig.leftLeg, 15],
      [rig.rightLeg, 15],
      [rig.leftShin, 13],
      [rig.rightShin, 13],
      [rig.leftFoot, 18],
      [rig.rightFoot, 18],
      [rig.tail, 5],
      [rig.ears[0], 6],
      [rig.ears[1], 6],
    ];
    const jointStates = new Map<
      THREE.Object3D,
      { pos: THREE.Vector3; quat: THREE.Quaternion; scl: THREE.Vector3 }
    >();
    const smoothJoints = (dt: number) => {
      for (const [joint, response] of jointLags) {
        const state = jointStates.get(joint);
        if (!state) {
          jointStates.set(joint, {
            pos: joint.position.clone(),
            quat: joint.quaternion.clone(),
            scl: joint.scale.clone(),
          });
          continue;
        }
        const blend = 1 - Math.exp(-response * dt);
        state.pos.lerp(joint.position, blend);
        state.quat.slerp(joint.quaternion, blend);
        state.scl.lerp(joint.scale, blend);
        joint.position.copy(state.pos);
        joint.quaternion.copy(state.quat);
        joint.scale.copy(state.scl);
      }
    };

    let requestRender = () => undefined;
    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      const bounds = container.getBoundingClientRect();
      const visualScale = Math.sqrt((bounds.width * bounds.height) / (width * height)) || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * visualScale, 2));
      renderer.setSize(width, height, false);
      // Asymmetric frame: platform sits low, head near top, minimal dead space
      const frameTop = 3.3;
      const frameBottom = -2.6;
      const halfWidth = ((frameTop - frameBottom) / 2) * (width / height);
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = frameTop;
      camera.bottom = frameBottom;
      camera.updateProjectionMatrix();
      if (reducedMotion) requestRender();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);

    let frame = 0;
    let lastFrameAt = 0;
    const render = () => {
      frame = 0;
      const now = performance.now() / 1000;
      const dt = lastFrameAt ? Math.min(now - lastFrameAt, 0.05) : 1 / 60;
      lastFrameAt = now;
      poseMascot(rig, effects, moveRef.current, now - startedAtRef.current, reducedMotion);
      if (!reducedMotion) smoothJoints(dt);
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    requestRender = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      startedAtRef.current = performance.now() / 1000;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      requestRender();
    };
    requestRenderRef.current = requestRender;
    motionQuery.addEventListener("change", onMotionChange);
    requestRender();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", onMotionChange);
      requestRenderRef.current = () => undefined;
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((item) => {
          if (item instanceof THREE.MeshToonMaterial) item.gradientMap?.dispose();
          if ("map" in item && item.map instanceof THREE.Texture) item.map.dispose();
          item.dispose();
        });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <button
      className={`dance-mascot-stage ${ready ? "ready" : ""}`}
      onClick={onTap}
      aria-label="Ocean Buddy — tap to wiggle"
    >
      {guide ? (
        <span className="dance-motion-guide" aria-hidden="true">
          {guide}
        </span>
      ) : null}
      <span className="dance-mascot-fallback" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/images/ocean-buddy.png" alt="" draggable={false} />
      </span>
      <span ref={containerRef} className="dance-mascot-canvas" aria-hidden="true" />
    </button>
  );
}
