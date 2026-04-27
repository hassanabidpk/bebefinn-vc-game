"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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

interface AnimalRig {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

interface StageDecor {
  group: THREE.Group;
  bubbles: THREE.Mesh[];
  stars: THREE.Mesh[];
  spout: THREE.Points | null;
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

const animalEmojis: Record<AnimalKind, string> = {
  cat: "🐱",
  dog: "🐶",
  elephant: "🐘",
  fish: "🐠",
  gorilla: "🦍",
  jellyfish: "🪼",
  lion: "🦁",
  turtle: "🐢",
  whale: "🐳",
  zebra: "🦓",
};

const animalAnimations: Record<AnimalKind, { animation: string; aura?: string; auraColor?: string; spout?: boolean; ground?: boolean }> = {
  cat: { animation: "cat-prowl 2.4s ease-in-out infinite", ground: true },
  dog: { animation: "dog-wag 0.9s ease-in-out infinite", ground: true },
  lion: { animation: "lion-roar 2.6s ease-in-out infinite", aura: "mane-sway 2.6s ease-in-out infinite", auraColor: "rgba(255,170,40,0.55)", ground: true },
  zebra: { animation: "zebra-gallop 0.7s linear infinite", ground: true },
  elephant: { animation: "elephant-trumpet 2.2s ease-in-out infinite", ground: true },
  gorilla: { animation: "gorilla-pound 1.4s ease-in-out infinite", ground: true },
  fish: { animation: "fish-swim 2.8s ease-in-out infinite" },
  jellyfish: { animation: "jelly-pulse 2.2s ease-in-out infinite", aura: "mane-sway 2.2s ease-in-out infinite", auraColor: "rgba(214,140,255,0.55)" },
  turtle: { animation: "turtle-bob 2.8s ease-in-out infinite", ground: true },
  whale: { animation: "whale-spout 3.2s ease-in-out infinite", spout: true },
};

function material(color: string, opts: { emissive?: number; rough?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opts.emissive ?? 0.16,
    roughness: opts.rough ?? 0.32,
    metalness: 0,
  });
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
  rotation: [number, number, number] = [0, 0, 0]
) {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(
  parent: THREE.Object3D,
  color: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1]
) {
  return addMesh(parent, new THREE.SphereGeometry(0.5, 32, 20), color, position, scale);
}

function cylinder(
  parent: THREE.Object3D,
  color: string,
  position: [number, number, number],
  scale: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
) {
  return addMesh(
    parent,
    new THREE.CylinderGeometry(0.28, 0.28, 1, 24),
    color,
    position,
    scale,
    rotation
  );
}

function cone(
  parent: THREE.Object3D,
  color: string,
  position: [number, number, number],
  scale: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
) {
  return addMesh(parent, new THREE.ConeGeometry(0.35, 0.8, 24), color, position, scale, rotation);
}

function box(
  parent: THREE.Object3D,
  color: string,
  position: [number, number, number],
  scale: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
) {
  return addMesh(parent, new THREE.BoxGeometry(1, 1, 1), color, position, scale, rotation);
}

function eye(parent: THREE.Object3D, x: number, y: number, z: number, size = 0.11) {
  const white = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 18, 14),
    new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 })
  );
  white.position.set(x - 0.01, y, z);
  white.scale.set(size * 1.2, size * 1.2, size * 0.6);
  parent.add(white);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 18, 14),
    new THREE.MeshStandardMaterial({ color: "#0a1830", roughness: 0.2 })
  );
  pupil.position.set(x, y, z);
  pupil.scale.set(size, size, size);
  parent.add(pupil);

  const lid = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 18, 14),
    new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.5 })
  );
  lid.position.set(x, y + size * 1.2, z);
  lid.scale.set(size * 1.25, 0.001, size * 0.65);
  parent.add(lid);
  return { white, pupil, lid, baseY: y, size };
}

function blink(eyes: ReturnType<typeof eye>[], elapsed: number) {
  const cycle = elapsed % 3.4;
  const blinking = cycle < 0.16 ? Math.sin((cycle / 0.16) * Math.PI) : 0;
  eyes.forEach((e) => {
    const closeY = e.baseY;
    const openY = e.baseY + e.size * 1.2;
    e.lid.position.y = openY + (closeY - openY) * blinking;
    e.lid.scale.y = 0.001 + blinking * e.size * 1.4;
  });
}

function buildCat(): AnimalRig {
  const group = new THREE.Group();
  sphere(group, "#ffb36b", [0, -0.1, 0], [1.35, 0.78, 0.76]);

  const head = new THREE.Group();
  head.position.set(0.85, 0.35, 0);
  group.add(head);
  sphere(head, "#ffd1a1", [0, 0, 0], [0.78, 0.72, 0.72]);
  cone(head, "#ff9657", [-0.1, 0.62, 0.28], [0.46, 0.52, 0.46], [0, 0, -0.25]);
  cone(head, "#ff9657", [-0.1, 0.62, -0.28], [0.46, 0.52, 0.46], [0, 0, -0.25]);
  const eyes = [eye(head, 0.35, 0.12, 0.24, 0.1), eye(head, 0.35, 0.12, -0.24, 0.1)];
  sphere(head, "#ff7a9a", [0.55, -0.1, 0], [0.1, 0.08, 0.08]);
  // whiskers
  [-0.18, 0, 0.18].forEach((dz) => {
    cylinder(head, "#ffffff", [0.5, -0.18, dz], [0.012, 0.18, 0.012], [0, 0, Math.PI / 2]);
  });

  [-0.58, 0.48].forEach((x) => {
    [-0.28, 0.28].forEach((z) => {
      cylinder(group, "#ffd1a1", [x, -0.68, z], [0.36, 0.36, 0.36]);
    });
  });

  const tail = cylinder(group, "#ffd1a1", [-0.96, 0.18, 0], [0.16, 0.9, 0.16], [0, 0, 1.28]);
  tail.geometry.translate(0, 0.5, 0);
  tail.position.y = -0.2;

  return {
    group,
    update: (t) => {
      head.rotation.y = Math.sin(t * 1.6) * 0.32;
      head.rotation.z = Math.sin(t * 1.1) * 0.06;
      tail.rotation.z = 1.28 + Math.sin(t * 5.2) * 0.5;
      tail.rotation.x = Math.sin(t * 5.2 + 1) * 0.18;
      blink(eyes, t);
    },
  };
}

function buildDog(): AnimalRig {
  const group = new THREE.Group();
  sphere(group, "#b87842", [0, -0.1, 0], [1.35, 0.78, 0.76]);

  const head = new THREE.Group();
  head.position.set(0.85, 0.35, 0);
  group.add(head);
  sphere(head, "#dca36f", [0, 0, 0], [0.82, 0.74, 0.72]);
  // floppy ears
  const earL = sphere(head, "#7a4728", [0, 0.32, 0.42], [0.18, 0.42, 0.12]);
  const earR = sphere(head, "#7a4728", [0, 0.32, -0.42], [0.18, 0.42, 0.12]);
  // snout
  sphere(head, "#dca36f", [0.42, -0.05, 0], [0.36, 0.32, 0.4]);
  sphere(head, "#1a1a1a", [0.62, 0.04, 0], [0.16, 0.12, 0.13]);
  // open jaw / tongue
  const jaw = new THREE.Group();
  jaw.position.set(0.42, -0.12, 0);
  head.add(jaw);
  sphere(jaw, "#ff7a8a", [0.05, -0.02, 0], [0.18, 0.05, 0.18]);
  const eyes = [eye(head, 0.42, 0.18, 0.2, 0.09), eye(head, 0.42, 0.18, -0.2, 0.09)];

  [-0.58, 0.48].forEach((x) => {
    [-0.28, 0.28].forEach((z) => {
      cylinder(group, "#dca36f", [x, -0.68, z], [0.36, 0.36, 0.36]);
    });
  });

  const tail = cylinder(group, "#dca36f", [-0.96, 0.28, 0], [0.16, 0.7, 0.16], [0, 0, 1.0]);
  tail.geometry.translate(0, 0.5, 0);
  tail.position.y = -0.05;

  return {
    group,
    update: (t) => {
      group.position.y += Math.sin(t * 4.2) * 0.005;
      head.rotation.z = Math.sin(t * 2.6) * 0.08;
      head.rotation.y = Math.sin(t * 1.4) * 0.18;
      tail.rotation.z = 1.0 + Math.sin(t * 12) * 0.7;
      jaw.rotation.z = -Math.abs(Math.sin(t * 6)) * 0.35;
      const flap = Math.sin(t * 5.6) * 0.18;
      earL.rotation.x = flap;
      earR.rotation.x = -flap;
      blink(eyes, t);
    },
  };
}

function buildLion(): AnimalRig {
  const group = new THREE.Group();
  sphere(group, "#d89531", [0, -0.1, 0], [1.35, 0.78, 0.76]);

  const head = new THREE.Group();
  head.position.set(0.85, 0.35, 0);
  group.add(head);
  // mane
  const mane = sphere(head, "#9a5424", [-0.05, 0, 0], [1.05, 0.95, 0.95]);
  sphere(head, "#f3bf5a", [0.05, 0, 0], [0.78, 0.72, 0.72]);
  cone(head, "#e0a23d", [-0.1, 0.6, 0.28], [0.42, 0.48, 0.42], [0, 0, -0.25]);
  cone(head, "#e0a23d", [-0.1, 0.6, -0.28], [0.42, 0.48, 0.42], [0, 0, -0.25]);
  const eyes = [eye(head, 0.4, 0.12, 0.22, 0.1), eye(head, 0.4, 0.12, -0.22, 0.1)];
  sphere(head, "#3b2010", [0.58, -0.1, 0], [0.14, 0.11, 0.14]);
  // jaw for roar
  const jaw = new THREE.Group();
  jaw.position.set(0.4, -0.18, 0);
  head.add(jaw);
  sphere(jaw, "#3b2010", [0.05, 0, 0], [0.22, 0.06, 0.22]);

  [-0.58, 0.48].forEach((x) => {
    [-0.28, 0.28].forEach((z) => {
      cylinder(group, "#f3bf5a", [x, -0.68, z], [0.36, 0.36, 0.36]);
    });
  });

  const tail = cylinder(group, "#f3bf5a", [-0.96, 0.18, 0], [0.13, 0.85, 0.13], [0, 0, 1.28]);
  tail.geometry.translate(0, 0.5, 0);
  tail.position.y = -0.2;
  const tuft = sphere(group, "#9a5424", [-1.18, 0.6, 0], [0.18, 0.18, 0.18]);

  return {
    group,
    update: (t) => {
      const roar = Math.max(0, Math.sin(t * 0.8));
      head.rotation.y = Math.sin(t * 1.2) * 0.18;
      head.position.y = roar * 0.06;
      jaw.rotation.z = -roar * 0.38;
      mane.scale.setScalar(0.95 + roar * 0.12 + Math.sin(t * 3) * 0.02);
      tail.rotation.z = 1.28 + Math.sin(t * 3.4) * 0.32;
      tuft.position.x = -1.18 + Math.sin(t * 3.4) * 0.12;
      tuft.position.y = 0.6 + Math.cos(t * 3.4) * 0.05;
      blink(eyes, t);
    },
  };
}

function buildZebra(): AnimalRig {
  const group = new THREE.Group();
  sphere(group, "#f4f4f4", [0, -0.1, 0], [1.35, 0.78, 0.76]);

  const head = new THREE.Group();
  head.position.set(0.85, 0.35, 0);
  group.add(head);
  sphere(head, "#ffffff", [0, 0, 0], [0.6, 0.62, 0.62]);
  sphere(head, "#ffffff", [0.42, -0.18, 0], [0.32, 0.4, 0.32]);
  cone(head, "#1a1a1a", [-0.1, 0.6, 0.2], [0.32, 0.42, 0.32], [0, 0, -0.2]);
  cone(head, "#1a1a1a", [-0.1, 0.6, -0.2], [0.32, 0.42, 0.32], [0, 0, -0.2]);
  // mohawk mane
  [0.05, -0.05, -0.15, -0.25].forEach((dx, i) => {
    box(head, "#1a1a1a", [dx, 0.42 - i * 0.04, 0], [0.08, 0.18, 0.34]);
  });
  const eyes = [eye(head, 0.3, 0.15, 0.22, 0.08), eye(head, 0.3, 0.15, -0.22, 0.08)];
  sphere(head, "#1a1a1a", [0.6, -0.3, 0], [0.13, 0.08, 0.13]);

  const legs: THREE.Mesh[] = [];
  [-0.58, 0.48].forEach((x) => {
    [-0.28, 0.28].forEach((z) => {
      const leg = cylinder(group, "#ffffff", [x, -0.68, z], [0.18, 0.6, 0.18]);
      leg.geometry.translate(0, 0.5, 0);
      leg.position.y = -0.4;
      legs.push(leg);
    });
  });

  // body stripes
  [-0.38, 0.05, 0.48].forEach((x) => {
    cylinder(group, "#151515", [x, 0.12, 0.52], [0.04, 0.04, 0.62], [Math.PI / 2, 0, 0]);
    cylinder(group, "#151515", [x, 0.12, -0.52], [0.04, 0.04, 0.62], [Math.PI / 2, 0, 0]);
  });

  const tail = cylinder(group, "#ffffff", [-0.96, 0.1, 0], [0.08, 0.5, 0.08], [0, 0, 1.4]);

  return {
    group,
    update: (t) => {
      // gallop: opposite legs
      const phase = t * 5;
      legs[0].rotation.z = Math.sin(phase) * 0.42;
      legs[3].rotation.z = Math.sin(phase) * 0.42;
      legs[1].rotation.z = Math.sin(phase + Math.PI) * 0.42;
      legs[2].rotation.z = Math.sin(phase + Math.PI) * 0.42;
      group.position.y += Math.abs(Math.sin(phase * 2)) * 0.03;
      head.rotation.z = Math.sin(t * 2.2) * 0.12;
      tail.rotation.z = 1.4 + Math.sin(t * 4) * 0.3;
      blink(eyes, t);
    },
  };
}

function buildGorilla(): AnimalRig {
  const group = new THREE.Group();
  const torso = sphere(group, "#4d4d55", [-0.05, -0.18, 0], [1.25, 1.05, 0.9]);
  const head = new THREE.Group();
  head.position.set(0.62, 0.55, 0);
  group.add(head);
  sphere(head, "#62626b", [0, 0, 0], [0.76, 0.68, 0.66]);
  sphere(head, "#a07058", [0.3, -0.12, 0], [0.46, 0.34, 0.46]);
  const eyes = [eye(head, 0.36, 0.08, 0.18, 0.09), eye(head, 0.36, 0.08, -0.18, 0.09)];
  sphere(head, "#1a1010", [0.55, -0.1, 0], [0.12, 0.08, 0.12]);

  const armL = new THREE.Group();
  armL.position.set(-0.1, 0.2, 0.65);
  group.add(armL);
  cylinder(armL, "#3d3d44", [0, -0.5, 0], [0.32, 1.15, 0.32]);
  sphere(armL, "#3d3d44", [0, -1.05, 0], [0.32, 0.32, 0.32]);

  const armR = new THREE.Group();
  armR.position.set(-0.1, 0.2, -0.65);
  group.add(armR);
  cylinder(armR, "#3d3d44", [0, -0.5, 0], [0.32, 1.15, 0.32]);
  sphere(armR, "#3d3d44", [0, -1.05, 0], [0.32, 0.32, 0.32]);

  return {
    group,
    update: (t) => {
      const beat = Math.max(0, Math.sin(t * 4));
      torso.scale.set(1.25, 1.05 + beat * 0.05, 0.9);
      // chest pound: arms swing in toward chest
      armL.rotation.x = -0.2 - beat * 1.0;
      armR.rotation.x = 0.2 + beat * 1.0;
      head.rotation.y = Math.sin(t * 1.4) * 0.18;
      head.rotation.x = beat * 0.12;
      blink(eyes, t);
    },
  };
}

function buildElephant(): AnimalRig {
  const group = new THREE.Group();
  sphere(group, "#9aa5ad", [-0.1, -0.1, 0], [1.45, 0.9, 0.86]);

  const head = new THREE.Group();
  head.position.set(0.88, 0.26, 0);
  group.add(head);
  sphere(head, "#aeb8bf", [0, 0, 0], [0.78, 0.7, 0.7]);
  const earL = sphere(head, "#c1c9cf", [-0.2, 0.04, 0.56], [0.16, 0.6, 0.5]);
  const earR = sphere(head, "#c1c9cf", [-0.2, 0.04, -0.56], [0.16, 0.6, 0.5]);
  const eyes = [eye(head, 0.38, 0.18, 0.22, 0.09), eye(head, 0.38, 0.18, -0.22, 0.09)];

  // segmented trunk
  const trunkSegments: THREE.Group[] = [];
  let parent: THREE.Object3D = head;
  let attachY = -0.18;
  let attachX = 0.55;
  for (let i = 0; i < 6; i += 1) {
    const seg = new THREE.Group();
    seg.position.set(attachX, attachY, 0);
    parent.add(seg);
    const taper = 1 - i * 0.1;
    cylinder(seg, "#9aa5ad", [0.18, 0, 0], [0.22 * taper, 0.36, 0.22 * taper], [0, 0, Math.PI / 2]);
    trunkSegments.push(seg);
    parent = seg;
    attachX = 0.36;
    attachY = 0;
  }
  // tusks
  cone(head, "#fff8e7", [0.5, -0.18, 0.16], [0.08, 0.34, 0.08], [Math.PI / 2, 0, 0]);
  cone(head, "#fff8e7", [0.5, -0.18, -0.16], [0.08, 0.34, 0.08], [Math.PI / 2, 0, 0]);

  [-0.58, 0.42].forEach((x) => {
    [-0.34, 0.34].forEach((z) => {
      cylinder(group, "#9aa5ad", [x, -0.68, z], [0.42, 0.5, 0.42]);
    });
  });

  const tail = cylinder(group, "#9aa5ad", [-1.0, 0.05, 0], [0.08, 0.5, 0.08], [0, 0, 1.3]);

  return {
    group,
    update: (t) => {
      head.rotation.y = Math.sin(t * 1.2) * 0.12;
      // ear flap big
      const flap = Math.sin(t * 3) * 0.4;
      earL.rotation.y = flap;
      earR.rotation.y = -flap;
      // trunk curl wave through segments
      const trumpet = Math.max(0, Math.sin(t * 0.7));
      trunkSegments.forEach((seg, i) => {
        const curl = Math.sin(t * 2.4 + i * 0.6) * 0.18 + trumpet * 0.25;
        seg.rotation.z = curl;
      });
      tail.rotation.z = 1.3 + Math.sin(t * 2.8) * 0.2;
      blink(eyes, t);
    },
  };
}

function buildFish(): AnimalRig {
  const group = new THREE.Group();
  const body = sphere(group, "#ff8f4f", [0, 0, 0], [1.15, 0.68, 0.44]);
  const tail = cone(group, "#ff6f61", [-1.0, 0, 0], [0.76, 0.85, 0.44], [0, 0, Math.PI / 2]);
  const finTop = cone(group, "#ffd166", [0.18, 0.5, 0], [0.36, 0.5, 0.06], [0, 0, 0]);
  const finL = cone(group, "#ffd166", [0.1, 0, 0.34], [0.22, 0.4, 0.06], [Math.PI / 2, 0, 0]);
  const finR = cone(group, "#ffd166", [0.1, 0, -0.34], [0.22, 0.4, 0.06], [-Math.PI / 2, 0, 0]);
  const eyes = [eye(group, 0.74, 0.16, 0.28, 0.1), eye(group, 0.74, 0.16, -0.28, 0.1)];
  // gill stripes
  [0.4, 0.55].forEach((x) => {
    cylinder(group, "#ff6f61", [x, 0, 0.2], [0.02, 0.32, 0.02], [Math.PI / 2, 0, 0]);
  });

  return {
    group,
    update: (t) => {
      // swim sway
      group.rotation.y = -0.38 + Math.sin(t * 1.6) * 0.4;
      body.rotation.z = Math.sin(t * 4) * 0.06;
      tail.rotation.z = Math.PI / 2 + Math.sin(t * 8) * 0.5;
      finL.rotation.x = Math.PI / 2 + Math.sin(t * 7) * 0.4;
      finR.rotation.x = -Math.PI / 2 - Math.sin(t * 7) * 0.4;
      finTop.rotation.z = Math.sin(t * 6) * 0.12;
      blink(eyes, t);
    },
  };
}

function buildJellyfish(): AnimalRig {
  const group = new THREE.Group();
  const bell = sphere(group, "#d68cff", [0, 0.38, 0], [1.0, 0.55, 0.8]);
  // glow ring
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.06, 12, 36),
    new THREE.MeshBasicMaterial({ color: "#ffb3ff", transparent: true, opacity: 0.5 })
  );
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);

  const tentacles: THREE.Mesh[] = [];
  [-0.44, -0.15, 0.15, 0.44].forEach((x) => {
    const t = cylinder(group, "#f0b3ff", [x, -0.46, 0], [0.08, 0.95, 0.08]);
    t.geometry.translate(0, -0.5, 0);
    t.position.y = 0.05;
    tentacles.push(t);
  });
  // dot eyes — friendly face
  const eyes = [eye(group, 0.18, 0.32, 0.55, 0.08), eye(group, -0.18, 0.32, 0.55, 0.08)];

  return {
    group,
    update: (t) => {
      const pulse = Math.sin(t * 2.2);
      bell.scale.set(1.0 + pulse * 0.12, 0.55 - pulse * 0.1, 0.8 + pulse * 0.12);
      group.position.y = Math.sin(t * 1.5) * 0.18;
      tentacles.forEach((tn, i) => {
        tn.rotation.z = Math.sin(t * 2 + i * 0.5) * 0.28;
        tn.rotation.x = Math.sin(t * 1.7 + i * 0.7) * 0.18;
      });
      glow.scale.setScalar(1 + pulse * 0.18);
      blink(eyes, t);
    },
  };
}

function buildTurtle(): AnimalRig {
  const group = new THREE.Group();
  const shell = sphere(group, "#38a169", [0, 0, 0], [1.2, 0.54, 0.86]);
  // shell pattern hexagons
  [
    [0, 0.45, 0],
    [0.4, 0.4, 0.3],
    [0.4, 0.4, -0.3],
    [-0.4, 0.4, 0.3],
    [-0.4, 0.4, -0.3],
  ].forEach(([x, y, z]) => {
    addMesh(
      group,
      new THREE.CircleGeometry(0.18, 6),
      "#256d3f",
      [x, y, z],
      [1, 1, 1],
      [-Math.PI / 2 + 0.1, 0, 0]
    );
  });

  const head = new THREE.Group();
  head.position.set(0.92, 0.02, 0);
  group.add(head);
  sphere(head, "#8bd17c", [0, 0, 0], [0.4, 0.36, 0.36]);
  const eyes = [eye(head, 0.22, 0.1, 0.13, 0.07), eye(head, 0.22, 0.1, -0.13, 0.07)];
  // smile
  sphere(head, "#1a1a1a", [0.3, -0.08, 0], [0.06, 0.02, 0.08]);

  const legs: THREE.Mesh[] = [];
  [-0.48, 0.42].forEach((x) => {
    [-0.5, 0.5].forEach((z) => {
      const leg = sphere(group, "#70c267", [x, -0.2, z], [0.34, 0.18, 0.2]);
      legs.push(leg);
    });
  });

  return {
    group,
    update: (t) => {
      shell.rotation.z = Math.sin(t * 1.6) * 0.05;
      // head poke in/out
      const poke = (Math.sin(t * 0.9) + 1) * 0.5;
      head.position.x = 0.7 + poke * 0.28;
      // paddle legs alternating
      legs[0].position.z = 0.5 + Math.sin(t * 3) * 0.12;
      legs[3].position.z = -0.5 - Math.sin(t * 3) * 0.12;
      legs[1].position.z = -0.5 - Math.sin(t * 3 + Math.PI) * 0.12;
      legs[2].position.z = 0.5 + Math.sin(t * 3 + Math.PI) * 0.12;
      blink(eyes, t);
    },
  };
}

function buildWhale(): AnimalRig {
  const group = new THREE.Group();
  const body = sphere(group, "#3c8dbc", [0, 0, 0], [1.55, 0.72, 0.72]);
  const tail = new THREE.Group();
  tail.position.set(-1.2, 0.04, 0);
  group.add(tail);
  cone(tail, "#2f6f9f", [-0.16, 0, 0], [0.82, 0.86, 0.42], [0, 0, Math.PI / 2]);
  // belly
  sphere(group, "#dff7ff", [0.25, -0.27, 0], [0.96, 0.2, 0.52]);
  const eyes = [eye(group, 0.95, 0.16, 0.28, 0.1), eye(group, 0.95, 0.16, -0.28, 0.1)];
  // smile
  sphere(group, "#1a3040", [1.05, -0.05, 0], [0.18, 0.04, 0.12]);
  // pec fin
  const fin = cone(group, "#3c8dbc", [0.2, -0.1, 0.6], [0.18, 0.5, 0.06], [Math.PI / 2, 0, 0]);
  // blowhole marker
  const blowMarker = sphere(group, "#1a3040", [0.4, 0.5, 0], [0.08, 0.04, 0.08]);

  return {
    group,
    update: (t) => {
      group.rotation.z = Math.sin(t * 1.2) * 0.06;
      body.rotation.z = Math.sin(t * 2.4) * 0.04;
      tail.rotation.z = Math.sin(t * 3.6) * 0.4;
      tail.rotation.x = Math.sin(t * 3.6 + 0.5) * 0.2;
      fin.rotation.x = Math.PI / 2 + Math.sin(t * 2) * 0.3;
      blowMarker.scale.set(0.08, 0.04 + Math.max(0, Math.sin(t * 0.8)) * 0.06, 0.08);
      blink(eyes, t);
    },
  };
}

function buildAnimal(kind: AnimalKind): AnimalRig {
  switch (kind) {
    case "cat":
      return buildCat();
    case "dog":
      return buildDog();
    case "lion":
      return buildLion();
    case "zebra":
      return buildZebra();
    case "gorilla":
      return buildGorilla();
    case "elephant":
      return buildElephant();
    case "fish":
      return buildFish();
    case "jellyfish":
      return buildJellyfish();
    case "turtle":
      return buildTurtle();
    case "whale":
      return buildWhale();
    default:
      return { group: new THREE.Group(), update: () => undefined };
  }
}

function buildStageDecor(kind: AnimalKind): StageDecor {
  const group = new THREE.Group();
  const bubbles: THREE.Mesh[] = [];
  const stars: THREE.Mesh[] = [];

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.035, 10, 80),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.08;
  group.add(ring);

  const bubbleMaterial = new THREE.MeshBasicMaterial({
    color: "#b9f8ff",
    transparent: true,
    opacity: 0.72,
  });
  const starMaterial = new THREE.MeshBasicMaterial({ color: "#ffd54f" });

  [-1.65, -1.08, 1.18, 1.72].forEach((x, index) => {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 12), bubbleMaterial);
    bubble.position.set(x, -0.78 + index * 0.34, -0.12);
    bubble.scale.setScalar(0.8 + index * 0.18);
    bubbles.push(bubble);
    group.add(bubble);
  });

  [
    [-1.55, 1.05, 0],
    [1.48, 0.98, 0],
  ].forEach(([x, y, z]) => {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), starMaterial);
    star.position.set(x, y, z);
    stars.push(star);
    group.add(star);
  });

  // whale spout particles
  let spout: THREE.Points | null = null;
  if (kind === "whale") {
    const count = 24;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = 0.55 + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = 0.6 + Math.random() * 1.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: "#dff7ff",
      size: 0.12,
      transparent: true,
      opacity: 0.85,
    });
    spout = new THREE.Points(geo, mat);
    group.add(spout);
  }

  return { group, bubbles, stars, spout };
}

export function getAnimalKind(word: string) {
  return animalWords[word.toLowerCase()] ?? null;
}

function getAnimalEmoji(word: string) {
  const kind = getAnimalKind(word);
  return kind ? animalEmojis[kind] : null;
}

function getAnimalAnimation(word: string) {
  const kind = getAnimalKind(word);
  return kind ? animalAnimations[kind] : null;
}

export function AnimalStage({ word }: AnimalStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const kind = getAnimalKind(word);
    if (!container || !kind) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.05, 6.1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.zIndex = "0";
    renderer.domElement.style.filter = "saturate(1.45) contrast(1.18)";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.animalStage = kind;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#ffffff", 2.35);
    const mainLight = new THREE.DirectionalLight("#fff4d6", 3.1);
    mainLight.position.set(3, 4, 5);
    const fillLight = new THREE.DirectionalLight("#9ee7ff", 1.25);
    fillLight.position.set(-3, 1, 3);
    scene.add(ambient, mainLight, fillLight);

    const rig = buildAnimal(kind);
    rig.group.rotation.y = -0.38;
    rig.group.scale.setScalar(1.35);
    const decor = buildStageDecor(kind);
    scene.add(decor.group, rig.group);

    let frame = 0;
    const startTime = performance.now();

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      // gentle stage breathing for non-swim animals
      if (kind !== "fish" && kind !== "whale") {
        rig.group.position.y = Math.sin(elapsed * 2.6) * 0.12;
        rig.group.rotation.y = -0.38 + Math.sin(elapsed * 1.2) * 0.18;
      } else {
        rig.group.position.y = Math.sin(elapsed * 1.4) * 0.22;
      }
      rig.group.scale.setScalar(1.35 + Math.sin(elapsed * 3.2) * 0.025);

      decor.group.rotation.z = Math.sin(elapsed * 1.8) * 0.05;
      decor.bubbles.forEach((bubble, index) => {
        bubble.position.y = -0.96 + ((elapsed * (0.34 + index * 0.07) + index * 0.27) % 2.35);
        bubble.position.x += Math.sin(elapsed * 2.3 + index) * 0.0018;
      });
      decor.stars.forEach((star, index) => {
        star.rotation.x = elapsed * (1.9 + index * 0.5);
        star.rotation.y = elapsed * (2.4 + index * 0.4);
        star.scale.setScalar(1 + Math.sin(elapsed * 4.2 + index) * 0.22);
      });

      if (decor.spout) {
        const positions = decor.spout.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < positions.count; i += 1) {
          const seed = (i * 0.13 + elapsed * 0.6) % 1.6;
          positions.setY(i, 0.6 + seed);
          positions.setX(i, 0.55 + Math.sin(elapsed * 3 + i) * 0.12 * seed);
        }
        positions.needsUpdate = true;
        const mat = decor.spout.material as THREE.PointsMaterial;
        mat.opacity = 0.4 + Math.max(0, Math.sin(elapsed * 0.8)) * 0.5;
      }

      rig.update(elapsed);

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((item) => item.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.domElement.remove();
    };
  }, [word]);

  const anim = getAnimalAnimation(word);
  const emojiAnimation = anim?.animation ?? "wiggle 0.9s ease-in-out infinite";

  return (
    <div
      ref={containerRef}
      className="relative h-40 w-40 overflow-visible drop-shadow-[0_16px_24px_rgba(14,82,116,0.24)] sm:h-56 sm:w-56"
      data-animal-stage={getAnimalKind(word) ?? undefined}
    >
      {anim?.ground ? (
        <div
          className="pointer-events-none absolute left-1/2 z-[5] h-3 w-28 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,82,116,0.45)_0%,rgba(14,82,116,0)_70%)] sm:w-40"
          style={{ bottom: "8%", animation: "ground-shadow 1.6s ease-in-out infinite" }}
        />
      ) : null}
      {anim?.aura ? (
        <div
          className="pointer-events-none absolute inset-0 z-[6] grid place-items-center"
        >
          <div
            className="h-32 w-32 rounded-full blur-2xl sm:h-44 sm:w-44"
            style={{ background: `radial-gradient(circle, ${anim.auraColor} 0%, transparent 70%)`, animation: anim.aura }}
          />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <div className="animate-[float_1.6s_ease-in-out_infinite] text-[5.6rem] leading-none drop-shadow-[0_10px_0_rgba(0,82,128,0.14)] sm:text-[7.2rem]">
          <span
            className="inline-block"
            style={{ animation: emojiAnimation, transformOrigin: "center bottom" }}
          >
            {getAnimalEmoji(word)}
          </span>
        </div>
      </div>
      {anim?.spout ? (
        <div className="pointer-events-none absolute inset-0 z-[12]">
          {[0, 0.4, 0.8].map((delay) => (
            <span
              key={delay}
              className="absolute left-1/2 top-1/3 block h-10 w-2 rounded-full bg-[linear-gradient(to_top,rgba(173,232,255,0.85),rgba(255,255,255,0.95))] sm:h-14"
              style={{
                transform: "translate(-50%, -100%)",
                animation: `spout-rise 1.6s ease-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
