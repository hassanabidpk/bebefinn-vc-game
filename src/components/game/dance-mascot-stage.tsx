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
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tail: THREE.Group;
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
  for (const x of [-0.3, 0.3]) {
    head.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), white, [x, 0.25, 0.76], [1, 1.2, 0.5]));
    head.add(mesh(new THREE.SphereGeometry(0.075, 14, 10), black, [x, 0.24, 0.85], [1, 1.2, 0.55]));
  }
  const smile = mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24, Math.PI), black, [0, -0.32, 0.94]);
  smile.rotation.z = Math.PI;
  head.add(smile);

  const makeArm = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.86, 0.65, 0);
    pivot.add(mesh(new THREE.CapsuleGeometry(0.19, 0.72, 7, 12), brown, [0, -0.47, 0]));
    pivot.add(mesh(new THREE.SphereGeometry(0.25, 18, 12), darkBrown, [0, -0.98, 0], [1, 0.9, 0.8]));
    root.add(pivot);
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  const makeLeg = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, -0.78, 0.04);
    pivot.add(mesh(new THREE.CapsuleGeometry(0.23, 0.54, 7, 12), brown, [0, -0.43, 0]));
    pivot.add(mesh(new THREE.SphereGeometry(0.3, 18, 12), darkBrown, [0, -0.85, 0.13], [1.25, 0.72, 1.4]));
    root.add(pivot);
    return pivot;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const tail = new THREE.Group();
  tail.position.set(0.74, -0.46, -0.42);
  const tailMesh = mesh(new THREE.CapsuleGeometry(0.2, 1.1, 7, 12), darkBrown, [0, -0.52, 0]);
  tailMesh.rotation.z = -0.92;
  tail.add(tailMesh);
  root.add(tail);

  root.scale.setScalar(1.08);
  return { root, body, head, leftArm, rightArm, leftLeg, rightLeg, tail };
}

function resetPose(rig: MascotRig) {
  rig.root.position.set(0, -0.18, 0);
  rig.root.rotation.set(0, 0, 0);
  rig.body.position.set(0, 0, 0);
  rig.body.rotation.set(0, 0, 0);
  rig.body.scale.set(1, 1, 1);
  rig.head.position.set(0, 1.34, 0);
  rig.head.rotation.set(0, 0, 0);
  rig.leftArm.position.set(-0.86, 0.65, 0);
  rig.rightArm.position.set(0.86, 0.65, 0);
  rig.leftArm.rotation.set(0, 0, -0.12);
  rig.rightArm.rotation.set(0, 0, 0.12);
  rig.leftLeg.position.set(-0.36, -0.78, 0.04);
  rig.rightLeg.position.set(0.36, -0.78, 0.04);
  rig.leftLeg.rotation.set(0, 0, 0);
  rig.rightLeg.rotation.set(0, 0, 0);
  rig.tail.rotation.set(0, 0, 0);
}

function poseMascot(rig: MascotRig, move: DemonstratedMove, elapsed: number, reducedMotion: boolean) {
  resetPose(rig);
  const time = reducedMotion ? 0.7 : elapsed;
  const idle = Math.sin(time * 2.6);
  rig.root.position.y += idle * 0.035;
  rig.head.rotation.z = idle * 0.025;
  rig.tail.rotation.z = Math.sin(time * 3.2) * 0.16;

  if (move === "clap") {
    const close = (Math.sin(time * 7 - Math.PI / 2) + 1) / 2;
    rig.leftArm.rotation.x = -0.72 * close;
    rig.rightArm.rotation.x = -0.72 * close;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.2, 1.2, close);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.2, -1.2, close);
    rig.root.position.y += close * 0.08;
    rig.head.rotation.z = (close - 0.5) * 0.08;
  } else if (move === "jump") {
    const wave = Math.sin(time * 3.3);
    const jump = Math.max(0, wave);
    const crouch = Math.max(0, -wave) * 0.16;
    rig.root.position.y += jump * 0.9 - crouch;
    rig.leftArm.rotation.z = THREE.MathUtils.lerp(-0.12, 2.72, jump);
    rig.rightArm.rotation.z = THREE.MathUtils.lerp(0.12, -2.72, jump);
    rig.leftLeg.rotation.x = jump * 0.42;
    rig.rightLeg.rotation.x = jump * 0.42;
    rig.leftLeg.rotation.z = jump * 0.18;
    rig.rightLeg.rotation.z = -jump * 0.18;
    rig.body.scale.y = 1 - crouch * 0.22;
  } else if (move === "stomp") {
    const step = Math.sin(time * 5.4);
    const leftLift = Math.max(0, step);
    const rightLift = Math.max(0, -step);
    rig.root.position.y += Math.abs(step) * 0.08;
    rig.root.rotation.z = step * 0.055;
    rig.leftLeg.position.y += leftLift * 0.38;
    rig.leftLeg.position.z += leftLift * 0.34;
    rig.leftLeg.rotation.x = -leftLift * 0.72;
    rig.rightLeg.position.y += rightLift * 0.38;
    rig.rightLeg.position.z += rightLift * 0.34;
    rig.rightLeg.rotation.x = -rightLift * 0.72;
    rig.leftArm.rotation.z = -0.22 - step * 0.34;
    rig.rightArm.rotation.z = 0.22 - step * 0.34;
  } else if (move === "wiggle") {
    const sway = Math.sin(time * 5.2);
    rig.root.position.x = sway * 0.2;
    rig.root.rotation.z = sway * 0.14;
    rig.body.rotation.y = sway * 0.28;
    rig.head.rotation.z = -sway * 0.11;
    rig.leftArm.rotation.z = -0.35 + sway * 0.42;
    rig.rightArm.rotation.z = 0.35 + sway * 0.42;
  }
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
    );
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    const rig = buildOceanBuddy();
    scene.add(rig.root);
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
      poseMascot(rig, moveRef.current, now - startedAtRef.current, reducedMotion);
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
