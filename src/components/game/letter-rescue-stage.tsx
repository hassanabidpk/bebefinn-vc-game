"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { LetterRescueOption } from "@/lib/letter-rescue-data";

export interface LetterRescueFeedback {
  index: number;
  correct: boolean;
  nonce: number;
}

interface LetterRescueStageProps {
  options: LetterRescueOption[];
  roundKey: number;
  feedback: LetterRescueFeedback | null;
}

function letterTexture(letter: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(190, 150, 30, 256, 256, 250);
  gradient.addColorStop(0, "rgba(255,255,255,0.98)");
  gradient.addColorStop(1, "rgba(225,249,255,0.82)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(256, 256, 218, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 24;
  context.strokeStyle = color;
  context.stroke();
  context.font = "900 300px Fredoka, Arial Rounded MT Bold, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(0,35,64,0.18)";
  context.lineWidth = 28;
  context.strokeText(letter, 256, 280);
  context.fillStyle = color;
  context.fillText(letter, 256, 280);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function LetterRescueStage({
  options,
  roundKey,
  feedback,
}: LetterRescueStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef(options);
  const bubbleGroupsRef = useRef<THREE.Group[]>([]);
  const feedbackRef = useRef<LetterRescueFeedback | null>(feedback);
  const feedbackStartedAt = useRef(0);

  useEffect(() => {
    feedbackRef.current = feedback;
    feedbackStartedAt.current = performance.now() / 1000;
  }, [feedback]);

  useEffect(() => {
    optionsRef.current = options;
    bubbleGroupsRef.current.forEach((group, index) => {
      const option = options[index];
      if (!option) return;

      const bubble = group.children[0] as THREE.Mesh<
        THREE.SphereGeometry,
        THREE.MeshPhysicalMaterial
      >;
      bubble.material.color.copy(
        new THREE.Color(option.color).lerp(new THREE.Color(0xffffff), 0.72)
      );

      const ring = group.children[1] as THREE.Mesh<
        THREE.TorusGeometry,
        THREE.MeshStandardMaterial
      >;
      ring.material.color.set(option.color);
      ring.material.emissive.set(option.color);

      const letter = group.children[2] as THREE.Mesh<
        THREE.PlaneGeometry,
        THREE.MeshBasicMaterial
      >;
      letter.material.map?.dispose();
      letter.material.map = letterTexture(option.letter, option.color);
      letter.material.needsUpdate = true;

      group.position.set((index - 1) * 4.7, -0.35, 0);
      group.rotation.set(0, 0, 0);
      group.scale.setScalar(1);
      group.userData.baseX = group.position.x;
      group.userData.baseY = group.position.y;
      group.userData.baseZ = group.position.z;
    });
  }, [options, roundKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x087eb1);
    scene.fog = new THREE.FogExp2(0x087eb1, 0.026);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    camera.position.set(0, 1.1, 14);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xcaf6ff, 0x06435d, 2.3));
    const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunlight.position.set(-7, 12, 9);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    scene.add(sunlight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(42, 28, 20, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c981, roughness: 0.96 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -4.4;
    ground.position.z = -4;
    ground.receiveShadow = true;
    scene.add(ground);

    const rand = (seed: number) => {
      const value = Math.sin(seed * 999.1) * 43758.5453;
      return value - Math.floor(value);
    };

    for (let index = 0; index < 34; index += 1) {
      const x = (rand(index + 1) - 0.5) * 31;
      const z = -2 - rand(index + 50) * 20;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + rand(index + 90) * 0.55, 0),
        new THREE.MeshStandardMaterial({
          color: index % 3 === 0 ? 0x8a796b : 0x9e9279,
          roughness: 1,
        })
      );
      rock.position.set(x, -4.15, z);
      rock.scale.y = 0.55;
      rock.rotation.set(rand(index) * 2, rand(index + 4) * 2, 0);
      rock.receiveShadow = true;
      scene.add(rock);
    }

    const coralColors = [0xff6f91, 0xffa85c, 0x6bcb77, 0xb984e8];
    for (let index = 0; index < 16; index += 1) {
      const coral = new THREE.Group();
      const color = coralColors[index % coralColors.length];
      for (let branch = 0; branch < 3; branch += 1) {
        const stem = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.09, 0.7 + rand(index * 7 + branch) * 0.8, 5, 8),
          new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
        );
        stem.position.set((branch - 1) * 0.26, branch * 0.18, 0);
        stem.rotation.z = (branch - 1) * 0.3;
        stem.castShadow = true;
        coral.add(stem);
      }
      coral.position.set((rand(index + 200) - 0.5) * 30, -3.8, -4 - rand(index + 240) * 18);
      scene.add(coral);
    }

    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8f5ff,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let index = 0; index < 5; index += 1) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 24), rayMaterial.clone());
      ray.rotation.z = 0.16 + index * 0.035;
      ray.position.set(-8 + index * 4.2, 5, -8 - index);
      scene.add(ray);
    }

    const gate = new THREE.Group();
    const gateRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.15, 0.2, 16, 64),
      new THREE.MeshStandardMaterial({
        color: 0xffd93d,
        emissive: 0xffa900,
        emissiveIntensity: 0.7,
        roughness: 0.34,
      })
    );
    gate.add(gateRing);
    gate.position.set(0, 4.7, -6);
    scene.add(gate);

    const bubbleGroups = optionsRef.current.map((option, index) => {
      const group = new THREE.Group();
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(1.62, 36, 28),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(option.color).lerp(new THREE.Color(0xffffff), 0.72),
          transparent: true,
          opacity: 0.38,
          roughness: 0.08,
          metalness: 0.02,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          side: THREE.DoubleSide,
        })
      );
      bubble.castShadow = true;
      group.add(bubble);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.48, 0.08, 12, 64),
        new THREE.MeshStandardMaterial({
          color: option.color,
          emissive: option.color,
          emissiveIntensity: 0.32,
          roughness: 0.42,
        })
      );
      group.add(ring);

      const letter = new THREE.Mesh(
        new THREE.PlaneGeometry(2.34, 2.34),
        new THREE.MeshBasicMaterial({
          map: letterTexture(option.letter, option.color),
          transparent: true,
          depthWrite: false,
        })
      );
      letter.position.z = 1.48;
      group.add(letter);
      group.position.set((index - 1) * 4.7, -0.35, 0);
      group.userData.baseX = group.position.x;
      group.userData.baseY = group.position.y;
      group.userData.baseZ = group.position.z;
      scene.add(group);
      return group;
    });
    bubbleGroupsRef.current = bubbleGroups;

    const bubbleGeometry = new THREE.SphereGeometry(0.07, 8, 6);
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8f8ff,
      transparent: true,
      opacity: 0.45,
    });
    const backgroundBubbles: THREE.Mesh[] = [];
    for (let index = 0; index < 38; index += 1) {
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      bubble.position.set((rand(index + 400) - 0.5) * 24, -4 + rand(index + 440) * 12, -2 - rand(index + 480) * 20);
      const scale = 0.5 + rand(index + 520) * 2.4;
      bubble.scale.setScalar(scale);
      scene.add(bubble);
      backgroundBubbles.push(bubble);
    }

    const timer = new THREE.Timer();
    timer.connect(document);
    const restingScale = new THREE.Vector3(1, 1, 1);
    let frame = 0;
    let disposed = false;
    const animate = (timestamp: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.1);
      const time = timer.getElapsed();
      const currentFeedback = feedbackRef.current;
      const feedbackElapsed = timestamp / 1000 - feedbackStartedAt.current;

      bubbleGroups.forEach((group, index) => {
        const baseY = group.userData.baseY as number;
        group.position.y = baseY + (reducedMotion ? 0 : Math.sin(time * 1.25 + index * 1.7) * 0.24);
        group.position.z = group.userData.baseZ as number;
        group.rotation.y = reducedMotion ? 0 : Math.sin(time * 0.7 + index) * 0.08;
        group.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.9 + index) * 0.025;
        group.scale.lerp(restingScale, reducedMotion ? 1 : 1 - Math.exp(-5 * delta));

        if (currentFeedback?.index === index) {
          if (currentFeedback.correct && !reducedMotion) {
            const lift = Math.min(1, Math.max(0, feedbackElapsed / 1.5));
            group.position.y += lift * 4.2;
            group.position.z -= lift * 4.5;
            group.scale.setScalar(1 + Math.sin(time * 8) * 0.07 + lift * 0.18);
          } else if (!currentFeedback.correct && !reducedMotion) {
            group.position.x = (group.userData.baseX as number) + Math.sin(feedbackElapsed * 18) * 0.18;
          }
        } else {
          group.position.x += ((group.userData.baseX as number) - group.position.x) * 0.12;
        }
      });

      gate.rotation.z = reducedMotion ? 0 : time * 0.25;
      gateRing.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(time * 2.2) * 0.05);
      if (!reducedMotion) {
        backgroundBubbles.forEach((bubble, index) => {
          bubble.position.y += (0.36 + (index % 5) * 0.09) * delta;
          if (bubble.position.y > 8) bubble.position.y = -4.5;
        });
      }
      camera.position.x = reducedMotion ? 0 : Math.sin(time * 0.18) * 0.18;
      camera.lookAt(0, 0.1, 0);
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      const visibleBounds = container.getBoundingClientRect();
      // Area ratio remains correct when the portrait shell rotates 90°, while
      // comparing width/height independently would swap the axes.
      const visibleArea = visibleBounds.width * visibleBounds.height;
      const visibleScale = visibleArea > 0
        ? Math.sqrt(visibleArea / (width * height))
        : 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * visibleScale, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timer.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      bubbleGroupsRef.current = [];
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (!material) return;
          const withMap = material as THREE.Material & { map?: THREE.Texture | null };
          withMap.map?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="letter-rescue-stage" />;
}
