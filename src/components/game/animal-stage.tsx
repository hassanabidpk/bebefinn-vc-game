"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type AnimalKind =
  | "cat"
  | "dog"
  | "elephant"
  | "fish"
  | "gorilla"
  | "jellyfish"
  | "lion"
  | "turtle"
  | "whale"
  | "zebra";

interface AnimalStageProps {
  word: string;
}

const animalWords: Record<string, AnimalKind> = {
  cat: "cat",
  dog: "dog",
  elephant: "elephant",
  fish: "fish",
  gorilla: "gorilla",
  jellyfish: "jellyfish",
  lion: "lion",
  turtle: "turtle",
  whale: "whale",
  zebra: "zebra",
};

interface AnimalMood {
  gradient: string;
  glow: string;
  ring: string;
  ambient: string;
  key: string;
  fill: string;
}

const animalMoods: Record<AnimalKind, AnimalMood> = {
  cat: {
    gradient: "radial-gradient(ellipse at 30% 20%, #ffd9a8 0%, #ff9a6c 45%, #f57c5b 100%)",
    glow: "rgba(255,168,108,0.55)",
    ring: "rgba(255,210,170,0.65)",
    ambient: "#fff0e0",
    key: "#fff4d6",
    fill: "#ffb38a",
  },
  dog: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff3c4 0%, #f0c068 50%, #b88450 100%)",
    glow: "rgba(240,192,104,0.55)",
    ring: "rgba(255,236,180,0.65)",
    ambient: "#fff7e0",
    key: "#fff4d6",
    fill: "#f0c068",
  },
  lion: {
    gradient: "radial-gradient(ellipse at 30% 20%, #fff0bf 0%, #f5b841 45%, #c9742a 100%)",
    glow: "rgba(245,184,65,0.6)",
    ring: "rgba(255,224,150,0.7)",
    ambient: "#fff5d8",
    key: "#fff0bf",
    fill: "#f5b841",
  },
  zebra: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f5f7fa 0%, #c9d4e0 50%, #6f7b8e 100%)",
    glow: "rgba(201,212,224,0.55)",
    ring: "rgba(245,247,250,0.7)",
    ambient: "#ffffff",
    key: "#f5f7fa",
    fill: "#c9d4e0",
  },
  elephant: {
    gradient: "radial-gradient(ellipse at 30% 20%, #e7e2d8 0%, #b6a98e 50%, #6f5d3f 100%)",
    glow: "rgba(182,169,142,0.55)",
    ring: "rgba(231,226,216,0.65)",
    ambient: "#fbf6ec",
    key: "#fff7e0",
    fill: "#b6a98e",
  },
  gorilla: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c8d6c2 0%, #5e7a5b 45%, #2a3a2a 100%)",
    glow: "rgba(94,122,91,0.55)",
    ring: "rgba(200,214,194,0.6)",
    ambient: "#e2eedd",
    key: "#f3fbef",
    fill: "#7a9a73",
  },
  fish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b8f2ff 0%, #4ec3e0 45%, #0e6a8c 100%)",
    glow: "rgba(78,195,224,0.6)",
    ring: "rgba(184,242,255,0.7)",
    ambient: "#dbf5ff",
    key: "#eaffff",
    fill: "#4ec3e0",
  },
  jellyfish: {
    gradient: "radial-gradient(ellipse at 30% 20%, #f6c8ff 0%, #b78cf2 50%, #5a3a8c 100%)",
    glow: "rgba(183,140,242,0.6)",
    ring: "rgba(246,200,255,0.7)",
    ambient: "#f1deff",
    key: "#fff0ff",
    fill: "#b78cf2",
  },
  turtle: {
    gradient: "radial-gradient(ellipse at 30% 20%, #c5f0d6 0%, #4fae7c 50%, #1f6a47 100%)",
    glow: "rgba(79,174,124,0.55)",
    ring: "rgba(197,240,214,0.7)",
    ambient: "#e2faea",
    key: "#f1ffe8",
    fill: "#4fae7c",
  },
  whale: {
    gradient: "radial-gradient(ellipse at 30% 20%, #b6e0ff 0%, #3c8dbc 45%, #0c3b5e 100%)",
    glow: "rgba(60,141,188,0.6)",
    ring: "rgba(182,224,255,0.7)",
    ambient: "#dbf0ff",
    key: "#eaf6ff",
    fill: "#3c8dbc",
  },
};

export function getAnimalKind(word: string) {
  return animalWords[word.toLowerCase()] ?? null;
}

interface AssetState {
  status: "loading" | "model" | "video";
}

/**
 * Three.js GLB renderer with auto-fit camera, soft idle spin, drag-to-rotate,
 * and per-animal lighting moods.
 */
function ModelView({ kind, mood }: { kind: AnimalKind; mood: AnimalMood }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    const scene = new THREE.Scene();
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
    camera.position.set(0, 0.4, 3.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);

    // Lighting tuned per-animal
    const ambient = new THREE.AmbientLight(mood.ambient, 1.4);
    const key = new THREE.DirectionalLight(mood.key, 2.6);
    key.position.set(2.2, 3.2, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0008;
    const fill = new THREE.DirectionalLight(mood.fill, 0.9);
    fill.position.set(-3, 1, 2);
    const rim = new THREE.DirectionalLight("#ffffff", 0.85);
    rim.position.set(0, 2.6, -3);
    scene.add(ambient, key, fill, rim);

    // Soft ground shadow disc
    const shadowGeo = new THREE.CircleGeometry(1.0, 48);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -0.001;
    scene.add(shadowDisc);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 0.6, 0);

    // Pause auto-rotate while user is dragging
    renderer.domElement.addEventListener("pointerdown", () => {
      controls.autoRotate = false;
      renderer.domElement.style.cursor = "grabbing";
    });
    renderer.domElement.addEventListener("pointerup", () => {
      controls.autoRotate = true;
      renderer.domElement.style.cursor = "grab";
    });

    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    const loader = new GLTFLoader();
    loader.load(
      `/models/${kind}.glb`,
      (gltf) => {
        if (disposed) return;
        const root = gltf.scene;
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            const mat = obj.material;
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.envMapIntensity = 0.9;
            }
          }
        });

        // Auto-fit: scale + recenter, then position camera based on FOV so
        // the model comfortably fills ~75% of the viewport.
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 2.0;
        const scale = targetSize / maxDim;
        root.scale.setScalar(scale);

        box.setFromObject(root);
        const center = new THREE.Vector3();
        box.getCenter(center);
        root.position.x -= center.x;
        root.position.z -= center.z;
        root.position.y -= box.min.y; // sit on ground

        pivot.add(root);

        // Distance based on the largest visible extent + FOV
        box.setFromObject(root);
        box.getSize(size);
        const fitH = size.y / (2 * Math.tan((Math.PI * camera.fov) / 360));
        const fitW = size.x / (2 * Math.tan((Math.PI * camera.fov) / 360)) / camera.aspect;
        const distance = Math.max(fitH, fitW) * 1.45;
        const yMid = box.min.y + size.y / 2;
        camera.position.set(0, yMid + size.y * 0.15, distance);
        controls.target.set(0, yMid, 0);
        controls.minDistance = distance * 0.7;
        controls.maxDistance = distance * 1.6;
        controls.update();

        // Ground shadow disc to model footprint
        const footprint = Math.max(size.x, size.z) * 0.65;
        shadowDisc.scale.setScalar(Math.max(footprint, 0.8));

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(root);
          // Prefer idle/walk anim if present, otherwise the first
          const idle =
            gltf.animations.find((a) => /idle|stand|breath/i.test(a.name)) ??
            gltf.animations.find((a) => /walk|swim|fly/i.test(a.name)) ??
            gltf.animations[0];
          const action = mixer.clipAction(idle);
          action.play();
        }
      },
      undefined,
      (err) => {
        // Loader error — silent: parent will swap to video on probe failure,
        // but if we somehow reach here without a probe, log for debugging.
        console.warn(`[animal-stage] failed to load /models/${kind}.glb`, err);
      }
    );

    let frame = 0;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      const w = Math.max(width, 1);
      const h = Math.max(height, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const animate = () => {
      if (disposed) return;
      const dt = clock.getDelta();
      mixer?.update(dt);
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.domElement.remove();
    };
  }, [kind, mood]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

function VideoView({ kind }: { kind: AnimalKind }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [kind]);

  return (
    <video
      ref={videoRef}
      key={kind}
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src={`/videos/${kind}.webm`} type="video/webm" />
      <source src={`/videos/${kind}.mp4`} type="video/mp4" />
    </video>
  );
}

export function AnimalStage({ word }: AnimalStageProps) {
  const kind = getAnimalKind(word);
  const [asset, setAsset] = useState<AssetState>({ status: "loading" });

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setAsset({ status: "loading" });

    // Probe for a GLB model — fall back to the video pipeline if missing
    fetch(`/models/${kind}.glb`, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setAsset({ status: r.ok ? "model" : "video" });
      })
      .catch(() => {
        if (!cancelled) setAsset({ status: "video" });
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (!kind) return null;

  const mood = animalMoods[kind];

  return (
    <div className="relative h-full w-full" data-animal-stage={kind}>
      {/* Glow halo behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] blur-2xl"
        style={{ background: mood.glow }}
      />

      {/* Glassmorphic frame */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[1.6rem]"
        style={{
          background: mood.gradient,
          boxShadow: `0 18px 38px rgba(14,82,116,0.32), inset 0 0 0 2px ${mood.ring}, inset 0 4px 12px rgba(255,255,255,0.5)`,
        }}
      >
        {/* Mood backdrop subtle moving sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-soft-light"
          style={{
            background:
              "radial-gradient(circle at 70% 80%, rgba(255,255,255,0.55) 0%, transparent 55%)",
          }}
        />

        {/* Asset (model or video) */}
        {asset.status === "model" ? (
          <ModelView kind={kind} mood={mood} />
        ) : asset.status === "video" ? (
          <VideoView kind={kind} />
        ) : null}

        {/* Top-edge gloss */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 opacity-50"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, transparent 100%)",
          }}
        />

        {/* Bottom soft vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
