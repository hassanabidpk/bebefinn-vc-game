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

/** Elastic spring easing for snappy rebound */
function elasticOut(t: number) {
  const p = 0.35;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

/** Power ease-out for impacts */
function easeOutQuad(t: number) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return 1 - (1 - clamped) * (1 - clamped);
}

/** Power ease-in for accelerations */
function easeInQuad(t: number) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return clamped * clamped;
}

function rangeProgress(value: number, start: number, end: number) {
  return smoothStep((value - start) / (end - start));
}

function cycle(time: number, duration: number) {
  return (((time % duration) + duration) % duration) / duration;
}

function buildOceanBuddy(): MascotRig {
  const brown = material(0x9e5f38, 0.7);
  const darkBrown = material(0x5e321b, 0.72);
  const cream = material(0xffe6be, 0.75);
  const teal = material(0x0ebbc5, 0.55);
  const coral = material(0xff6782, 0.55);
  const white = material(0xffffff, 0.35);
  const black = material(0x181822, 0.4);

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

  const bib = mesh(new THREE.BoxGeometry(0.92, 0.74, 0.12), teal, [0, 0.05, 0.84], [1, 1, 1]);
  bib.geometry.translate(0, -0.1, 0);
  chest.add(bib);

  for (const x of [-0.31, 0.31]) {
    chest.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 10), teal, [x, 0.38, 0.7], [1, 1, 1]));
    chest.add(mesh(new THREE.SphereGeometry(0.075, 12, 8), coral, [x, 0.12, 0.92]));
  }

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

  // Snout & Cheeks
  head.add(mesh(new THREE.SphereGeometry(0.4, 22, 16), cream, [-0.25, -0.18, 0.7], [1, 0.8, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.4, 22, 16), cream, [0.25, -0.18, 0.7], [1, 0.8, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.19, 18, 12), black, [0, -0.02, 0.95], [1.18, 0.84, 0.68]));

  // Eyes
  const eyes = [-0.3, 0.3].map((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.26, 0.78);
    eye.add(mesh(new THREE.SphereGeometry(0.155, 16, 12), white, [0, 0, 0], [1, 1.2, 0.5]));
    eye.add(mesh(new THREE.SphereGeometry(0.08, 14, 10), black, [0, -0.01, 0.1], [1, 1.2, 0.55]));
    // Catchlight twinkle
    eye.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), white, [0.03, 0.05, 0.16]));
    head.add(eye);
    return eye;
  });

  // Smile
  const smile = mesh(new THREE.TorusGeometry(0.22, 0.026, 8, 24, Math.PI), black, [0, -0.32, 0.95]);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Arms with proper shoulder -> elbow -> wrist kinetic chain
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.88, 0.45, 0);

    // Shoulder cap + upper arm
    shoulder.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), brown, [0, -0.04, 0]));
    const upperArm = mesh(new THREE.CapsuleGeometry(0.17, 0.36, 6, 10), brown, [0, -0.28, 0]);
    shoulder.add(upperArm);

    // Forearm hinge
    const forearm = new THREE.Group();
    forearm.position.set(0, -0.54, 0);
    forearm.add(mesh(new THREE.SphereGeometry(0.18, 14, 10), darkBrown, [0, 0, 0]));
    const lowerArm = mesh(new THREE.CapsuleGeometry(0.16, 0.32, 6, 10), brown, [0, -0.26, 0]);
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
  tail.position.set(0.74, -0.46, -0.42);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.2, 1.1, 7, 12), darkBrown, [0, -0.52, 0]);
  tailMesh.rotation.z = -0.92;
  tail.add(tailMesh);
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
}

function poseEffects(effects: DanceEffects, move: DemonstratedMove, time: number) {
  resetEffects(effects);
  const platformPulse = 1 + Math.sin(time * 6.28) * 0.02;
  effects.platformRing.scale.setScalar(platformPulse);

  if (move === "clap") {
    // 120 BPM sync (1.0s cycle, 2 claps per second on beats 0.25 and 0.75)
    const phase = cycle(time, 0.5);
    const impact = phase < 0.35 ? easeOutQuad(phase / 0.35) : Math.max(0, 1 - (phase - 0.35) / 0.3);
    const sparkle = impact;

    effects.clapStars.forEach((item, index) => {
      const angle = item.userData.angle as number;
      const speed = item.userData.speed as number;
      item.visible = sparkle > 0.05;
      const radius = 0.25 + sparkle * 0.65 * speed;
      item.position.set(
        Math.cos(angle) * radius,
        0.48 + Math.sin(angle) * radius * 0.8,
        1.15 + sparkle * 0.2
      );
      item.rotation.set(time * 4 + index, time * 3, time * 5);
      item.scale.setScalar(0.5 + sparkle * 0.9);
      item.material.opacity = sparkle * 0.95;
    });

    effects.platformRing.material.emissiveIntensity = 0.35 + sparkle * 1.5;
    effects.fillLight.intensity = 1.0 + sparkle * 2.5;
  } else if (move === "jump") {
    // 1.25s jump cycle
    const phase = cycle(time, 1.25);
    const flight =
      phase >= 0.2 && phase <= 0.68
        ? Math.sin(((phase - 0.2) / 0.48) * Math.PI)
        : 0;
    const landing = phase >= 0.68 && phase < 0.85 ? Math.sin(((phase - 0.68) / 0.17) * Math.PI) : 0;

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
    // 1.0s stomp cycle (left at 0.0, right at 0.5)
    const phase = cycle(time, 1.0);
    effects.stompRings.forEach((item, index) => {
      const start = index === 0 ? 0.2 : 0.7;
      const progress = (phase - start + 1) % 1;
      const active = progress < 0.25;
      item.visible = active;
      item.scale.setScalar(0.4 + progress * 6.5);
      item.material.opacity = active ? (1 - progress / 0.25) * 0.9 : 0;
    });

    const impact = Math.pow(Math.abs(Math.cos(phase * Math.PI * 2)), 12);
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
    // REALISTIC CLAPPING KINEMATICS (120 BPM: 0.5s per clap)
    // ----------------------------------------------------
    const clapCycle = 0.5;
    const phase = cycle(time, clapCycle);

    // Phase: 0.0 -> 0.65: Windup / Opening arc; 0.65 -> 0.78: Snapping impact; 0.78 -> 1.0: Elastic rebound
    let armOpen: number;
    let impactSquash = 0;
    let chestPuff = 0;

    if (phase < 0.65) {
      // Windup: arms swing wide, chest expands
      const p = phase / 0.65;
      armOpen = easeOutQuad(p);
      chestPuff = armOpen * 0.08;
    } else if (phase < 0.8) {
      // Fast strike: arms snap inward with power!
      const p = (phase - 0.65) / 0.15;
      armOpen = 1 - easeInQuad(p);
      if (p > 0.85) {
        impactSquash = 1.0;
      }
    } else {
      // Elastic rebound bounce
      const p = (phase - 0.8) / 0.2;
      armOpen = elasticOut(p) * 0.22;
      impactSquash = 1 - easeOutQuad(p);
    }

    const clapContact = 1 - armOpen;

    // Every other clap leans the opposite way — breaks metronome symmetry
    const alt = Math.floor(time / clapCycle) % 2 === 0 ? 1 : -1;
    rig.root.rotation.z = alt * clapContact * 0.05;
    rig.root.rotation.y = alt * clapContact * 0.09;
    rig.head.rotation.z = alt * clapContact * 0.12;

    // Body squash and stretch on clap beat impact
    rig.body.scale.y = 1 - impactSquash * 0.08 + chestPuff * 0.04;
    rig.body.scale.x = 1 + impactSquash * 0.06;
    rig.body.scale.z = 1 + impactSquash * 0.06;

    // Torso flexion & knee rhythm dip on clap impact
    rig.root.position.y += clapContact * 0.06 - impactSquash * 0.08;
    rig.chest.rotation.x = -0.06 + clapContact * 0.14;
    rig.head.rotation.x = -0.08 + clapContact * 0.18;
    rig.head.position.y += clapContact * 0.03;

    // Arms kinetic chain: Shoulders adduct -> Forearms swing inward -> Wrists meet flat
    rig.leftArm.rotation.x = -0.35 * clapContact;
    rig.rightArm.rotation.x = -0.35 * clapContact;
    rig.leftArm.rotation.y = 0.45 * clapContact;
    rig.rightArm.rotation.y = -0.45 * clapContact;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.65, 0.98, clapContact);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.65, -0.98, clapContact);

    // Elbows flexion
    rig.leftForearm.rotation.z = THREE.MathUtils.lerp(0.35, 0.88, clapContact);
    rig.rightForearm.rotation.z = THREE.MathUtils.lerp(-0.35, -0.88, clapContact);
    rig.leftForearm.position.z = clapContact * 0.38;
    rig.rightForearm.position.z = clapContact * 0.38;

    // Wrists & hands clapping together at chest center
    rig.leftHand.position.z = clapContact * 0.22;
    rig.rightHand.position.z = clapContact * 0.22;
    rig.leftHand.rotation.y = -0.52 * clapContact;
    rig.rightHand.rotation.y = 0.52 * clapContact;

    // Legs rhythm bounce
    rig.leftLeg.rotation.x = impactSquash * 0.15;
    rig.rightLeg.rotation.x = impactSquash * 0.15;
    rig.leftShin.rotation.x = -impactSquash * 0.2;
    rig.rightShin.rotation.x = -impactSquash * 0.2;

    // Tail dynamic follow-through whip
    rig.tail.rotation.z = Math.sin(time * 12.56) * 0.28;
  } else if (move === "jump") {
    // ----------------------------------------------------
    // REALISTIC 6-PHASE JUMP DANCE KINEMATICS (1.25s cycle)
    // ----------------------------------------------------
    const jumpCycle = 1.25;
    const phase = cycle(time, jumpCycle);

    // Phase 1: Deep Anticipation Crouch (0.0 -> 0.20)
    // Phase 2: Explosive Launch (0.20 -> 0.34)
    // Phase 3: Airborne Flight & Tuck (0.34 -> 0.68)
    // Phase 4: Downward Glide (0.68 -> 0.74)
    // Phase 5: Landing Shock Absorption Cushion (0.74 -> 0.88)
    // Phase 6: Recovery to Stance (0.88 -> 1.0)

    let yOffset = 0;
    let squashY = 1.0;
    let crouch = 0;
    let flight = 0;
    let armsUp = 0;
    let kneeBend = 0;
    let anklePoint = 0;

    if (phase < 0.2) {
      // Deep anticipation crouch
      const p = phase / 0.2;
      crouch = easeInQuad(p);
      yOffset = -crouch * 0.42;
      squashY = 1 - crouch * 0.24;
      kneeBend = crouch * 1.1;
      // Arms swing back to gather momentum
      rig.leftArm.rotation.x = crouch * 0.85;
      rig.rightArm.rotation.x = crouch * 0.85;
      rig.leftArm.rotation.z = -0.3;
      rig.rightArm.rotation.z = 0.3;
      rig.chest.rotation.x = crouch * 0.38;
      rig.head.rotation.x = -crouch * 0.22;
    } else if (phase < 0.34) {
      // Explosive push-off
      const p = (phase - 0.2) / 0.14;
      const launch = easeOutQuad(p);
      yOffset = -0.42 + launch * 1.08;
      squashY = THREE.MathUtils.lerp(0.76, 1.22, launch); // Vertical stretch!
      armsUp = launch;
      anklePoint = 0.7 * launch;
      kneeBend = 1.1 * (1 - launch);
      rig.chest.rotation.x = THREE.MathUtils.lerp(0.38, -0.15, launch);
      rig.head.rotation.x = THREE.MathUtils.lerp(-0.22, 0.25, launch);
    } else if (phase < 0.68) {
      // Parabolic flight & mid-air tuck
      const p = (phase - 0.34) / 0.34;
      flight = Math.sin(p * Math.PI);
      yOffset = 0.66 + flight * 0.44;
      squashY = 1.0 + flight * 0.04;
      armsUp = 1.0;
      kneeBend = 0.4 + flight * 0.45; // Joyful mid-air knee tuck!
      rig.leftLeg.rotation.z = flight * 0.22;
      rig.rightLeg.rotation.z = -flight * 0.22;
      rig.chest.rotation.x = -0.1 + Math.sin(p * Math.PI * 2) * 0.08;
      rig.head.rotation.x = 0.2;
      // Excited arm wave in the air
      rig.leftArm.rotation.x = -0.2 + Math.sin(time * 16) * 0.12;
      rig.rightArm.rotation.x = -0.2 + Math.sin(time * 16) * 0.12;
    } else if (phase < 0.88) {
      // Landing impact & deep shock absorption
      const p = (phase - 0.68) / 0.2;
      const impact = Math.sin(p * Math.PI);
      crouch = impact;
      yOffset = -impact * 0.38;
      squashY = 1 - impact * 0.26; // Massive landing squash
      kneeBend = impact * 1.2;
      armsUp = 1 - easeOutQuad(p);
      rig.chest.rotation.x = impact * 0.32;
      rig.head.rotation.x = -impact * 0.18;
      rig.leftArm.rotation.z = THREE.MathUtils.lerp(2.8, -0.75, p);
      rig.rightArm.rotation.z = THREE.MathUtils.lerp(-2.8, 0.75, p);
    } else {
      // Elastic spring recovery to dance stance
      const p = (phase - 0.88) / 0.12;
      const recovery = elasticOut(p);
      yOffset = -0.15 * (1 - recovery);
      squashY = 1.0;
    }

    // Apply root & volume preservation; each jump twists a different way
    const jumpTwist = Math.sin(Math.floor(time / jumpCycle) * 1.7 + 0.6) * 0.2;
    rig.root.rotation.y = jumpTwist * flight;
    rig.root.position.y += yOffset;
    rig.body.scale.y = squashY;
    const invScale = Math.sqrt(1 / Math.max(0.2, squashY));
    rig.body.scale.x = invScale;
    rig.body.scale.z = invScale;

    // Apply arms reaching high during flight
    if (armsUp > 0.01 && phase >= 0.2 && phase < 0.7) {
      rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.12, 2.78, armsUp);
      rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.12, -2.78, armsUp);
      rig.leftArm.position.z = armsUp * 0.22;
      rig.rightArm.position.z = armsUp * 0.22;
      rig.leftForearm.rotation.z = -0.25 * armsUp;
      rig.rightForearm.rotation.z = 0.25 * armsUp;
    }

    // Legs articulation
    rig.leftLeg.rotation.x = -kneeBend * 0.85;
    rig.rightLeg.rotation.x = -kneeBend * 0.85;
    rig.leftShin.rotation.x = kneeBend * 1.45;
    rig.rightShin.rotation.x = kneeBend * 1.45;
    rig.leftFoot.rotation.x = -kneeBend * 0.4 + anklePoint;
    rig.rightFoot.rotation.x = -kneeBend * 0.4 + anklePoint;

    // Tail dynamic inertial whip
    rig.tail.rotation.z = Math.sin(time * 10) * 0.45;
  } else if (move === "stomp") {
    // ----------------------------------------------------
    // REALISTIC TAP / STOMP DANCE WITH LATERAL WEIGHT SHIFT
    // (120 BPM: 1.0s full measure = Left stomp at 0.25s, Right stomp at 0.75s)
    // ----------------------------------------------------
    const stompCycle = 1.0;
    const phase = cycle(time, stompCycle);

    // Left stomp active during 0.0 -> 0.5; Right stomp active during 0.5 -> 1.0
    const isLeft = phase < 0.5;
    const stepPhase = (phase % 0.5) / 0.5; // 0.0 -> 1.0 inside this half-step

    // Phase: 0.0 -> 0.45: Weight shift & knee lift; 0.45 -> 0.65: Downward strike; 0.65 -> 1.0: Impact cushion & rebound
    let lift = 0;
    let impact = 0;

    if (stepPhase < 0.45) {
      lift = easeOutQuad(stepPhase / 0.45);
    } else if (stepPhase < 0.65) {
      const p = (stepPhase - 0.45) / 0.2;
      lift = 1 - easeInQuad(p);
      if (p > 0.8) impact = 1.0;
    } else {
      const p = (stepPhase - 0.65) / 0.35;
      impact = 1 - easeOutQuad(p);
      lift = 0;
    }

    const sideSign = isLeft ? -1 : 1;
    // Weight shift: Root shifts sideways toward supporting foot
    const weightShift = -sideSign * (0.16 + lift * 0.08);
    rig.root.position.x = weightShift;
    rig.root.position.y += lift * 0.06 - impact * 0.08;

    // Pelvic tilt & torso counter-lean
    rig.root.rotation.z = sideSign * (0.08 + lift * 0.08);
    rig.body.rotation.z = -sideSign * (0.06 + lift * 0.06);
    rig.body.rotation.y = sideSign * (lift * 0.24);

    // Torso impact squash
    rig.body.scale.y = 1 - impact * 0.06;
    rig.body.scale.x = 1 + impact * 0.04;
    rig.body.scale.z = 1 + impact * 0.04;

    // Active stomping leg vs Supporting leg
    if (isLeft) {
      // Left leg lifts high with dorsiflexed ankle
      rig.leftLeg.position.y += lift * 0.42;
      rig.leftLeg.position.z += lift * 0.28;
      rig.leftLeg.rotation.x = -lift * 0.95;
      rig.leftShin.rotation.x = lift * 1.45;
      rig.leftFoot.rotation.x = -lift * 0.42 + impact * 0.1;

      // Supporting right leg absorbs weight
      rig.rightLeg.rotation.x = 0.12 + impact * 0.15;
      rig.rightShin.rotation.x = -0.12 - impact * 0.15;

      // Marching arm opposition: Right arm swings forward, Left arm swings back
      rig.rightArm.rotation.x = -0.85 * lift;
      rig.rightArm.rotation.z = 0.35;
      rig.rightForearm.rotation.z = -0.45;
      rig.leftArm.rotation.x = 0.65 * lift;
      rig.leftArm.rotation.z = -0.35;
    } else {
      // Right leg lifts high with dorsiflexed ankle
      rig.rightLeg.position.y += lift * 0.42;
      rig.rightLeg.position.z += lift * 0.28;
      rig.rightLeg.rotation.x = -lift * 0.95;
      rig.rightShin.rotation.x = lift * 1.45;
      rig.rightFoot.rotation.x = -lift * 0.42 + impact * 0.1;

      // Supporting left leg absorbs weight
      rig.leftLeg.rotation.x = 0.12 + impact * 0.15;
      rig.leftShin.rotation.x = -0.12 - impact * 0.15;

      // Marching arm opposition: Left arm swings forward, Right arm swings back
      rig.leftArm.rotation.x = -0.85 * lift;
      rig.leftArm.rotation.z = -0.35;
      rig.leftForearm.rotation.z = 0.45;
      rig.rightArm.rotation.x = 0.65 * lift;
      rig.rightArm.rotation.z = 0.35;
    }

    // Head tilts with the groove & nods on impact
    rig.head.rotation.z = -sideSign * 0.08;
    rig.head.rotation.x = -0.05 + impact * 0.12;

    // Tail swings in counter-balance
    rig.tail.rotation.z = -sideSign * 0.45;
  } else if (move === "wiggle") {
    // ----------------------------------------------------
    // REALISTIC HULA / GROOVE WIGGLE WITH SPINAL S-CURVE
    // & DANCE WAVE ARMS (1.0s fluid orbital cycle)
    // ----------------------------------------------------
    const wiggleCycle = 1.0;
    const phase = cycle(time, wiggleCycle) * Math.PI * 2;

    const swayX = Math.sin(phase);
    const swayZ = Math.sin(phase * 2) * 0.5; // Figure-8 orbit
    const counterSway = Math.sin(phase + Math.PI * 0.6);

    // Dynamic hip orbital sway
    rig.root.position.x = swayX * 0.24;
    rig.root.position.z = swayZ * 0.12;
    rig.root.position.y += Math.abs(Math.sin(phase)) * 0.04;
    rig.root.rotation.z = swayX * 0.18; // Pelvic roll
    rig.root.rotation.y = swayX * 0.32; // Pelvic yaw

    // Spine S-Curve Counter-Undulation
    rig.body.rotation.y = -swayX * 0.36;
    rig.body.rotation.z = -swayX * 0.12;
    rig.chest.rotation.y = -swayX * 0.18;
    rig.chest.rotation.z = counterSway * 0.14;

    // Head groove & delayed tilt
    rig.head.rotation.z = -counterSway * 0.16;
    rig.head.rotation.y = counterSway * 0.14;
    rig.head.rotation.x = Math.sin(phase * 2) * 0.06;

    // Undulating Hula / Dance Wave Arms (Shoulder -> Elbow -> Wrist phase delay)
    const armWaveL = Math.sin(phase);
    const armWaveR = Math.sin(phase + Math.PI);
    const forearmWaveL = Math.sin(phase - Math.PI / 3);
    const forearmWaveR = Math.sin(phase + Math.PI - Math.PI / 3);
    const wristWaveL = Math.sin(phase - (Math.PI * 2) / 3);
    const wristWaveR = Math.sin(phase + Math.PI - (Math.PI * 2) / 3);

    rig.leftArm.rotation.z = -0.55 + armWaveL * 0.42;
    rig.rightArm.rotation.z = 0.55 + armWaveR * 0.42;
    rig.leftArm.rotation.x = 0.25 + forearmWaveL * 0.35;
    rig.rightArm.rotation.x = 0.25 + forearmWaveR * 0.35;

    rig.leftForearm.rotation.z = 0.62 + forearmWaveL * 0.38;
    rig.rightForearm.rotation.z = -0.62 - forearmWaveR * 0.38;
    rig.leftForearm.position.z = 0.15 + armWaveL * 0.18;
    rig.rightForearm.position.z = 0.15 + armWaveR * 0.18;

    rig.leftHand.rotation.y = wristWaveL * 0.45;
    rig.rightHand.rotation.y = wristWaveR * 0.45;
    rig.leftHand.rotation.z = wristWaveL * 0.35;
    rig.rightHand.rotation.z = wristWaveR * 0.35;

    // Alternating knee flexion (soft dance knees)
    rig.leftLeg.rotation.z = Math.max(0, swayX) * 0.16;
    rig.rightLeg.rotation.z = -Math.max(0, -swayX) * 0.16;
    rig.leftFoot.rotation.z = -Math.max(0, swayX) * 0.25;
    rig.rightFoot.rotation.z = Math.max(0, -swayX) * 0.25;

    // Fluid secondary tail pendulum whip
    rig.tail.rotation.z = -swayX * 0.72;
    rig.tail.rotation.y = swayZ * 0.45;
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
    renderer.toneMappingExposure = 1.15;
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
    scene.add(new THREE.HemisphereLight(0xe8fbff, 0x244b70, 2.6));

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 3.8);
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
        materials.forEach((item) => item.dispose());
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
