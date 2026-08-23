"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { DanceMove } from "@/lib/dance-cues";

type DemonstratedMove = DanceMove | "idle";

interface DanceMascotStageProps {
  move: DemonstratedMove;
  actionKey: string;
  guide: string;
  onTap: () => void;
}

interface MascotRig {
  root: THREE.Group;
  body: THREE.Group;
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
}

interface DanceEffects {
  clapStars: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  jumpStars: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  stompRings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[];
  wiggleOrbs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  platformRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
}

function material(color: number, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
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

function smoothStep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function rangeProgress(value: number, start: number, end: number) {
  return smoothStep((value - start) / (end - start));
}

function cycle(time: number, duration: number) {
  return ((time % duration) + duration) % duration / duration;
}

function buildOceanBuddy(): MascotRig {
  const brown = material(0x9a5d39);
  const darkBrown = material(0x63351f);
  const cream = material(0xffe4b5);
  const teal = material(0x0fb5bd, 0.58);
  const coral = material(0xff657f, 0.58);
  const white = material(0xffffff, 0.38);
  const black = material(0x15151d, 0.42);

  const root = new THREE.Group();
  root.position.y = -0.18;

  const body = new THREE.Group();
  root.add(body);
  body.add(mesh(new THREE.SphereGeometry(0.9, 28, 20), brown, [0, 0, 0], [1.04, 1.2, 0.78]));
  body.add(mesh(new THREE.SphereGeometry(0.72, 24, 18), cream, [0, -0.02, 0.55], [0.78, 0.92, 0.28]));
  body.add(mesh(new THREE.SphereGeometry(0.73, 24, 18), teal, [0, -0.48, 0.4], [1.06, 0.72, 0.42]));

  const bib = mesh(new THREE.BoxGeometry(0.9, 0.72, 0.12), teal, [0, 0.1, 0.83], [1, 1, 1]);
  bib.geometry.translate(0, -0.1, 0);
  body.add(bib);
  for (const x of [-0.31, 0.31]) {
    body.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.05, 10), teal, [x, 0.45, 0.7], [1, 1, 1]));
    body.add(mesh(new THREE.SphereGeometry(0.07, 12, 8), coral, [x, 0.18, 0.91]));
  }

  const head = new THREE.Group();
  head.position.y = 1.34;
  root.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.9, 30, 22), brown, [0, 0, 0], [1.04, 0.92, 0.86]));
  head.add(mesh(new THREE.SphereGeometry(0.31, 20, 14), darkBrown, [-0.72, 0.35, 0], [1, 1, 0.68]));
  head.add(mesh(new THREE.SphereGeometry(0.31, 20, 14), darkBrown, [0.72, 0.35, 0], [1, 1, 0.68]));
  head.add(mesh(new THREE.SphereGeometry(0.24, 18, 14), cream, [-0.72, 0.35, 0.08], [1, 1, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.24, 18, 14), cream, [0.72, 0.35, 0.08], [1, 1, 0.55]));
  head.add(mesh(new THREE.SphereGeometry(0.39, 22, 16), cream, [-0.24, -0.18, 0.68], [1, 0.78, 0.54]));
  head.add(mesh(new THREE.SphereGeometry(0.39, 22, 16), cream, [0.24, -0.18, 0.68], [1, 0.78, 0.54]));
  head.add(mesh(new THREE.SphereGeometry(0.18, 18, 12), black, [0, -0.03, 0.92], [1.15, 0.82, 0.66]));
  const eyes = [-0.3, 0.3].map((x) => {
    const eye = new THREE.Group();
    eye.position.set(x, 0.25, 0.76);
    eye.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), white, [0, 0, 0], [1, 1.2, 0.5]));
    eye.add(mesh(new THREE.SphereGeometry(0.075, 14, 10), black, [0, -0.01, 0.1], [1, 1.2, 0.55]));
    head.add(eye);
    return eye;
  });
  const smile = mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24, Math.PI), black, [0, -0.32, 0.94]);
  smile.rotation.z = Math.PI;
  head.add(smile);

  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.86, 0.68, 0);
    shoulder.add(mesh(new THREE.SphereGeometry(0.22, 16, 12), brown, [0, -0.05, 0]));
    shoulder.add(mesh(new THREE.CapsuleGeometry(0.17, 0.34, 6, 10), brown, [0, -0.29, 0]));

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.56, 0);
    forearm.add(mesh(new THREE.SphereGeometry(0.18, 14, 10), darkBrown, [0, 0, 0]));
    forearm.add(mesh(new THREE.CapsuleGeometry(0.16, 0.32, 6, 10), brown, [0, -0.27, 0]));
    shoulder.add(forearm);

    const hand = new THREE.Group();
    hand.position.set(0, -0.57, 0);
    hand.add(mesh(new THREE.SphereGeometry(0.24, 18, 12), darkBrown, [0, 0, 0], [1, 0.9, 0.78]));
    forearm.add(hand);
    root.add(shoulder);
    return { shoulder, forearm, hand };
  };
  const leftArmRig = makeArm(-1);
  const rightArmRig = makeArm(1);

  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.36, -0.75, 0.04);
    hip.add(mesh(new THREE.CapsuleGeometry(0.22, 0.28, 6, 10), brown, [0, -0.25, 0]));

    const shin = new THREE.Group();
    shin.position.set(0, -0.5, 0);
    shin.add(mesh(new THREE.SphereGeometry(0.21, 14, 10), brown, [0, 0, 0]));
    shin.add(mesh(new THREE.CapsuleGeometry(0.2, 0.25, 6, 10), brown, [0, -0.24, 0]));
    hip.add(shin);

    const foot = new THREE.Group();
    foot.position.set(0, -0.51, 0.12);
    foot.add(mesh(new THREE.SphereGeometry(0.29, 18, 12), darkBrown, [0, 0, 0.06], [1.28, 0.72, 1.5]));
    shin.add(foot);
    root.add(hip);
    return { hip, shin, foot };
  };
  const leftLegRig = makeLeg(-1);
  const rightLegRig = makeLeg(1);

  const tail = new THREE.Group();
  tail.position.set(0.74, -0.46, -0.42);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.2, 1.1, 7, 12), darkBrown, [0, -0.52, 0]);
  tailMesh.rotation.z = -0.92;
  tail.add(tailMesh);
  root.add(tail);

  root.scale.setScalar(1.08);
  return {
    root,
    body,
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
  };
}

function buildDanceEffects(
  scene: THREE.Scene,
  platformRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>
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

  const colors = [0xffe45c, 0xff6f91, 0x75ecff, 0xffffff];
  const clapStars = Array.from({ length: 7 }, (_, index) => {
    const angle = (index / 7) * Math.PI * 2;
    const item = effectMesh(new THREE.OctahedronGeometry(0.11, 0), colors[index % colors.length]);
    item.userData.angle = angle;
    return item;
  });
  const jumpStars = Array.from({ length: 8 }, (_, index) => {
    const item = effectMesh(new THREE.TetrahedronGeometry(0.09, 0), colors[(index + 1) % colors.length]);
    item.userData.side = index % 2 === 0 ? -1 : 1;
    item.userData.offset = index / 8;
    return item;
  });
  const stompRings = [-1, 1].map((side) => {
    const item = effectMesh(new THREE.TorusGeometry(0.36, 0.045, 8, 32), side < 0 ? 0xffd93d : 0x75ecff) as
      THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    item.rotation.x = Math.PI / 2;
    item.position.set(side * 0.38, -2.05, 0.12);
    return item;
  });
  const wiggleOrbs = Array.from({ length: 6 }, (_, index) => {
    const item = effectMesh(new THREE.SphereGeometry(0.08 + (index % 2) * 0.035, 12, 8), colors[index % colors.length]);
    item.userData.offset = index / 6;
    return item;
  });
  return { clapStars, jumpStars, stompRings, wiggleOrbs, platformRing };
}

function resetPose(rig: MascotRig) {
  rig.root.position.set(0, -0.18, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.body.scale.set(1, 1, 1);
  rig.head.position.set(0, 1.34, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftArm.position.set(-0.86, 0.68, 0);
  rig.rightArm.position.set(0.86, 0.68, 0);
  rig.leftArm.rotation.set(0, 0, -0.12);
  rig.rightArm.rotation.set(0, 0, 0.12);
  rig.leftForearm.position.set(0, -0.56, 0);
  rig.rightForearm.position.set(0, -0.56, 0);
  rig.leftForearm.rotation.set(0, 0, 0);
  rig.rightForearm.rotation.set(0, 0, 0);
  rig.leftHand.position.set(0, -0.57, 0);
  rig.rightHand.position.set(0, -0.57, 0);
  rig.leftHand.rotation.set(0, 0, 0);
  rig.rightHand.rotation.set(0, 0, 0);
  rig.leftLeg.position.set(-0.36, -0.75, 0.04);
  rig.rightLeg.position.set(0.36, -0.75, 0.04);
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
  const platformPulse = 1 + Math.sin(time * 4) * 0.025;
  effects.platformRing.scale.setScalar(platformPulse);

  if (move === "clap") {
    const phase = cycle(time, 0.92);
    const contact = phase < 0.48
      ? rangeProgress(phase, 0.3, 0.43)
      : 1 - rangeProgress(phase, 0.48, 0.7);
    const sparkle = smoothStep(contact);
    effects.clapStars.forEach((item, index) => {
      const angle = item.userData.angle as number;
      item.visible = sparkle > 0.04;
      item.position.set(Math.cos(angle) * (0.28 + sparkle * 0.48), 0.42 + Math.sin(angle) * (0.2 + sparkle * 0.38), 1.2);
      item.rotation.z = time * 3 + index;
      item.scale.setScalar(0.45 + sparkle * 0.9);
      item.material.opacity = sparkle * 0.9;
    });
    effects.platformRing.material.emissiveIntensity = 0.35 + sparkle * 1.4;
  } else if (move === "jump") {
    const phase = cycle(time, 1.55);
    const flight = phase >= 0.22 && phase <= 0.68
      ? Math.sin(((phase - 0.22) / 0.46) * Math.PI) ** 2
      : 0;
    effects.jumpStars.forEach((item, index) => {
      const side = item.userData.side as number;
      const offset = item.userData.offset as number;
      item.visible = flight > 0.04;
      item.position.set(side * (1.05 + offset * 0.45), -1.3 + offset * 3 + flight * 0.35, 0.45);
      item.rotation.set(time * 2 + index, time * 1.4, time * 2.6);
      item.scale.setScalar(0.6 + flight * 0.7);
      item.material.opacity = flight * 0.85;
    });
    effects.platformRing.material.emissiveIntensity = 0.4 + flight * 1.2;
  } else if (move === "stomp") {
    const phase = cycle(time, 1.25);
    effects.stompRings.forEach((item, index) => {
      const start = index === 0 ? 0.48 : 0.98;
      const progress = (phase - start + 1) % 1;
      const active = progress < 0.2;
      item.visible = active;
      item.scale.setScalar(0.45 + progress * 7);
      item.material.opacity = active ? (1 - progress / 0.2) * 0.8 : 0;
    });
    const impact = Math.pow(Math.abs(Math.cos(phase * Math.PI * 2)), 12);
    effects.platformRing.material.emissiveIntensity = 0.35 + impact * 1.8;
  } else if (move === "wiggle") {
    effects.wiggleOrbs.forEach((item, index) => {
      const offset = item.userData.offset as number;
      const angle = time * 2.4 + offset * Math.PI * 2;
      item.visible = true;
      item.position.set(Math.cos(angle) * (1.25 + (index % 2) * 0.25), -0.1 + offset * 2.4 + Math.sin(angle * 1.7) * 0.18, 0.3);
      item.scale.setScalar(0.75 + Math.sin(angle * 2) * 0.18);
      item.material.opacity = 0.58 + Math.sin(angle) * 0.2;
    });
    effects.platformRing.material.emissiveIntensity = 0.55 + Math.sin(time * 5.7) * 0.28;
  }
}

function poseMascot(
  rig: MascotRig,
  effects: DanceEffects,
  move: DemonstratedMove,
  elapsed: number,
  reducedMotion: boolean
) {
  resetPose(rig);
  const time = reducedMotion ? 0.36 : elapsed;
  const idle = Math.sin(time * 2.6);
  rig.root.position.y += idle * 0.035;
  rig.head.rotation.z = idle * 0.025;
  rig.tail.rotation.z = Math.sin(time * 3.2) * 0.16;
  rig.body.scale.y = 1 + idle * 0.012;
  if (!reducedMotion) {
    const blink = Math.pow(Math.max(0, Math.sin(time * 1.37)), 34);
    rig.eyes.forEach((eye) => eye.scale.y = 1 - blink * 0.86);
  }

  if (move === "clap") {
    const phase = cycle(time, 0.92);
    const close = phase < 0.43
      ? rangeProgress(phase, 0.08, 0.38)
      : 1 - rangeProgress(phase, 0.52, 0.84);
    const contact = close;
    rig.leftArm.rotation.x = -0.68 * close;
    rig.rightArm.rotation.x = -0.68 * close;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.24, 0.94, close);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.24, -0.94, close);
    rig.leftForearm.rotation.z = 0.55 * close;
    rig.rightForearm.rotation.z = -0.55 * close;
    rig.leftForearm.position.z = 0.34 * close;
    rig.rightForearm.position.z = 0.34 * close;
    rig.leftHand.position.z = 0.16 * close;
    rig.rightHand.position.z = 0.16 * close;
    rig.leftHand.rotation.y = -0.35 * close;
    rig.rightHand.rotation.y = 0.35 * close;
    rig.root.position.y += contact * 0.07;
    rig.body.rotation.z = (contact - 0.5) * 0.035;
    rig.head.rotation.z += (contact - 0.5) * 0.07;
  } else if (move === "jump") {
    const phase = cycle(time, 1.55);
    const anticipation = phase < 0.22
      ? rangeProgress(phase, 0.04, 0.2)
      : 1 - rangeProgress(phase, 0.22, 0.34);
    const flight = phase >= 0.22 && phase <= 0.68
      ? Math.sin(((phase - 0.22) / 0.46) * Math.PI) ** 2
      : 0;
    const landing = phase >= 0.68 && phase < 0.88
      ? Math.sin(((phase - 0.68) / 0.2) * Math.PI) ** 2
      : 0;
    const crouch = anticipation * 0.25 + landing * 0.2;
    const armsUp = rangeProgress(phase, 0.12, 0.32) * (1 - rangeProgress(phase, 0.7, 0.92));
    rig.root.position.y += flight * 1.03 - crouch;
    rig.body.scale.y = 1 - crouch * 0.35 + flight * 0.04;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.12, 2.72, armsUp);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.12, -2.72, armsUp);
    rig.leftArm.position.z = armsUp * 0.2;
    rig.rightArm.position.z = armsUp * 0.2;
    rig.leftForearm.rotation.z = -0.22 * armsUp;
    rig.rightForearm.rotation.z = 0.22 * armsUp;
    rig.leftLeg.rotation.x = -crouch * 1.25 + flight * 0.2;
    rig.rightLeg.rotation.x = -crouch * 1.25 + flight * 0.2;
    rig.leftShin.rotation.x = crouch * 2.2 - flight * 0.45;
    rig.rightShin.rotation.x = crouch * 2.2 - flight * 0.45;
    rig.leftLeg.rotation.z = flight * 0.16;
    rig.rightLeg.rotation.z = -flight * 0.16;
    rig.head.position.y -= crouch * 0.1;
  } else if (move === "stomp") {
    const phase = cycle(time, 1.25) * Math.PI * 2;
    const step = Math.sin(phase);
    const leftLift = Math.pow(Math.max(0, step), 0.82);
    const rightLift = Math.pow(Math.max(0, -step), 0.82);
    const impact = Math.pow(Math.abs(Math.cos(phase)), 10);
    rig.root.position.y += Math.abs(step) * 0.06 - impact * 0.035;
    rig.root.rotation.z = step * 0.07;
    rig.body.rotation.y = -step * 0.09;
    rig.leftLeg.position.y += leftLift * 0.4;
    rig.leftLeg.position.z += leftLift * 0.26;
    rig.leftLeg.rotation.x = -leftLift * 0.78;
    rig.leftShin.rotation.x = leftLift * 1.18;
    rig.leftFoot.rotation.x = -leftLift * 0.3;
    rig.rightLeg.position.y += rightLift * 0.4;
    rig.rightLeg.position.z += rightLift * 0.26;
    rig.rightLeg.rotation.x = -rightLift * 0.78;
    rig.rightShin.rotation.x = rightLift * 1.18;
    rig.rightFoot.rotation.x = -rightLift * 0.3;
    rig.leftArm.rotation.z = -0.3 - step * 0.33;
    rig.rightArm.rotation.z = 0.3 - step * 0.33;
    rig.leftForearm.rotation.z = 0.25;
    rig.rightForearm.rotation.z = -0.25;
    rig.head.rotation.z -= step * 0.045;
  } else if (move === "wiggle") {
    const phase = cycle(time, 1.1) * Math.PI * 2;
    const sway = Math.sin(phase);
    const counter = Math.sin(phase + Math.PI / 3);
    rig.root.position.x = sway * 0.19;
    rig.root.rotation.z = sway * 0.13;
    rig.body.rotation.y = sway * 0.32;
    rig.body.rotation.z = -sway * 0.07;
    rig.head.rotation.z = -counter * 0.12;
    rig.leftArm.rotation.z = -0.52 + counter * 0.4;
    rig.rightArm.rotation.z = 0.52 + counter * 0.4;
    rig.leftForearm.rotation.z = 0.58;
    rig.rightForearm.rotation.z = -0.58;
    rig.leftLeg.rotation.z = Math.max(0, sway) * 0.12;
    rig.rightLeg.rotation.z = -Math.max(0, -sway) * 0.12;
    rig.leftFoot.rotation.z = -Math.max(0, sway) * 0.22;
    rig.rightFoot.rotation.z = Math.max(0, -sway) * 0.22;
    rig.tail.rotation.z = -sway * 0.42;
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
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3, 3, 2.8, -2.8, 0.1, 30);
    camera.position.set(0, 0.18, 9);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xe8fbff, 0x264d72, 2.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
    keyLight.position.set(-4, 7, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x79e8ff, 1.8);
    rimLight.position.set(5, 2, 3);
    scene.add(rimLight);

    const platform = mesh(
      new THREE.CylinderGeometry(1.7, 1.9, 0.18, 48),
      material(0xffdc58, 0.64),
      [0, -2.18, 0]
    );
    platform.receiveShadow = true;
    scene.add(platform);
    const ring = mesh(
      new THREE.TorusGeometry(1.72, 0.08, 10, 48),
      material(0xffffff, 0.42),
      [0, -2.08, 0]
    ) as THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
    ring.rotation.x = Math.PI / 2;
    ring.material.emissive.set(0xffd93d);
    ring.material.emissiveIntensity = 0.25;
    scene.add(ring);

    const rig = buildOceanBuddy();
    scene.add(rig.root);
    const effects = buildDanceEffects(scene, ring);
    setReady(true);

    let requestRender = () => undefined;
    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      const bounds = container.getBoundingClientRect();
      const visualScale = Math.sqrt((bounds.width * bounds.height) / (width * height)) || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * visualScale, 2));
      renderer.setSize(width, height, false);
      const halfHeight = 2.85;
      const halfWidth = halfHeight * (width / height);
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      if (reducedMotion) requestRender();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);

    let frame = 0;
    const render = () => {
      frame = 0;
      const now = performance.now() / 1000;
      poseMascot(rig, effects, moveRef.current, now - startedAtRef.current, reducedMotion);
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
    <button className={`dance-mascot-stage ${ready ? "ready" : ""}`} onClick={onTap} aria-label="Ocean Buddy — tap to wiggle">
      {guide ? <span className="dance-motion-guide" aria-hidden="true">{guide}</span> : null}
      <span className="dance-mascot-fallback" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/images/ocean-buddy.png" alt="" draggable={false} />
      </span>
      <span ref={containerRef} className="dance-mascot-canvas" aria-hidden="true" />
    </button>
  );
}
