/**
 * Ocean Dive world builder — deep-water scene with sculpted, gradient-shaded
 * sea animals, sun shafts, drifting motes, and soft contact shadows on the
 * sand. All geometry and textures are generated in code — no external assets.
 */

import * as THREE from "three";
import type { RideWorldBuild } from "./ride-engine";
import { OCEAN_RIDE } from "./ride-data";
import {
  createLoopCurve,
  createTrackRibbon,
  placeBesideTrack,
  seededRandom,
} from "./ride-track";
import {
  addEye,
  bellyGradientTexture,
  blobShadow,
  latheBody,
  noiseTexture,
  part,
  radialFadeTexture,
  shellTexture,
  skyGradientTexture,
  taperedLimb,
} from "./ride-visuals";

const FLOOR_FRIENDS = new Set(["Turtle", "Octopus"]);

// ---- animals ----

function buildWhale(): THREE.Group {
  const g = new THREE.Group();
  const hide = bellyGradientTexture("#2d5f86", "#bcd8e6");

  // Sculpted body: nose → back → tail stock.
  const body = part(
    g,
    latheBody(
      [
        [0.01, 3.6],
        [1.15, 2.9],
        [1.9, 1.4],
        [2.15, -0.2],
        [1.7, -1.9],
        [0.9, -3.1],
        [0.35, -4],
        [0.01, -4.3],
      ],
      26
    ),
    { map: hide, roughness: 0.55 }
  );
  body.rotation.x = -Math.PI / 2;
  body.position.y = 3.4;

  for (const side of [-1, 1]) {
    const fluke = part(g, new THREE.SphereGeometry(1.15, 14, 10), { map: hide, roughness: 0.55 }, side * 1, 3.6, -4.3);
    fluke.scale.set(1.3, 0.22, 0.8);
    fluke.rotation.y = side * 0.55;
    const fin = part(g, new THREE.SphereGeometry(0.85, 12, 9), { map: hide, roughness: 0.55 }, side * 1.9, 2.6, 1.4);
    fin.scale.set(1.1, 0.24, 0.55);
    fin.rotation.z = side * 0.7;
  }
  // Throat grooves.
  for (let i = 0; i < 4; i += 1) {
    const groove = part(g, new THREE.TorusGeometry(1.5 - i * 0.16, 0.035, 8, 24, Math.PI * 0.7), { color: 0x9cc0d4, roughness: 0.7, shadows: false }, 0, 3.05, 2 + i * 0.42);
    groove.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI / 2 + (Math.PI * 0.65) / 2);
  }
  addEye(g, -1.35, 3.3, 2.35, 0.16, 0x24303a);
  addEye(g, 1.35, 3.3, 2.35, 0.16, 0x24303a);
  part(g, new THREE.SphereGeometry(0.16, 10, 8), { color: 0x24455e, roughness: 0.6 }, 0, 4.75, 0.9);
  return g;
}

function buildDolphin(): THREE.Group {
  const g = new THREE.Group();
  const hide = bellyGradientTexture("#5a97b8", "#d8ecf4");

  const body = part(
    g,
    latheBody(
      [
        [0.01, 2.6],
        [0.22, 2.3],
        [0.6, 1.5],
        [0.85, 0.4],
        [0.72, -0.9],
        [0.4, -1.9],
        [0.16, -2.5],
        [0.01, -2.7],
      ],
      24
    ),
    { map: hide, roughness: 0.35 }
  );
  body.rotation.x = -Math.PI / 2 + 0.18;
  body.position.y = 3.6;

  // Rostrum (bottlenose) and melon.
  const beak = part(g, new THREE.CylinderGeometry(0.14, 0.24, 0.75, 12), { map: hide, roughness: 0.35 }, 0, 3.15, 2.85);
  beak.rotation.x = Math.PI / 2 - 0.3;
  const dorsal = part(g, new THREE.ConeGeometry(0.42, 1, 12), { map: hide, roughness: 0.4 }, 0, 4.55, -0.3);
  dorsal.rotation.x = -0.55;
  dorsal.scale.z = 0.45;
  for (const side of [-1, 1]) {
    const flipper = part(g, new THREE.SphereGeometry(0.5, 10, 8), { map: hide, roughness: 0.4 }, side * 0.62, 3.05, 1.15);
    flipper.scale.set(1.2, 0.18, 0.5);
    flipper.rotation.z = side * 0.75;
    const fluke = part(g, new THREE.SphereGeometry(0.55, 10, 8), { map: hide, roughness: 0.4 }, side * 0.42, 4, -2.6);
    fluke.scale.set(1.15, 0.16, 0.6);
    fluke.rotation.y = side * 0.5;
  }
  addEye(g, -0.5, 3.45, 2.1, 0.11, 0x1d2b33);
  addEye(g, 0.5, 3.45, 2.1, 0.11, 0x1d2b33);
  // Gentle smile line.
  const smile = part(g, new THREE.TorusGeometry(0.2, 0.03, 8, 14, Math.PI * 0.8), { color: 0x2d4a5a, roughness: 0.5, shadows: false }, 0, 3.05, 2.6);
  smile.rotation.set(0.5, 0, Math.PI + 0.35);
  return g;
}

function buildTurtle(): THREE.Group {
  const g = new THREE.Group();
  const shell = shellTexture("#3f7a4b", "#27492e", 82);
  const skin = noiseTexture("#8fbf74", "#6d9c57", 700, 83);

  const dome = part(g, latheBody([[0.01, 1.05], [1.15, 0.75], [1.65, 0.15], [1.5, -0.25], [0.01, -0.35]], 26), { map: shell, roughness: 0.7 }, 0, 1.55, 0);
  dome.scale.z = 1.25;
  part(g, new THREE.SphereGeometry(1.45, 18, 12), { color: 0xe9dfb8, roughness: 0.85 }, 0, 1.28, 0).scale.set(1.05, 0.28, 1.3);

  const head = new THREE.Group();
  part(head, new THREE.SphereGeometry(0.55, 16, 12), { map: skin }).scale.set(0.9, 0.85, 1.1);
  addEye(head, -0.26, 0.18, 0.4, 0.11, 0x2c3d22);
  addEye(head, 0.26, 0.18, 0.4, 0.11, 0x2c3d22);
  head.position.set(0, 1.75, 2);
  g.add(head);
  taperedLimb(new THREE.Vector3(0, 1.5, 1.1), new THREE.Vector3(0, 1.65, 1.6), new THREE.Vector3(0, 1.75, 1.95), 0.34, 0.26, { map: skin }, g);

  for (const side of [-1, 1]) {
    const front = part(g, new THREE.SphereGeometry(0.62, 12, 9), { map: skin }, side * 1.55, 1.15, 1);
    front.scale.set(1.35, 0.22, 0.6);
    front.rotation.y = side * -0.5;
    const back = part(g, new THREE.SphereGeometry(0.48, 12, 9), { map: skin }, side * 1.35, 1.1, -1.2);
    back.scale.set(1.2, 0.22, 0.55);
    back.rotation.y = side * 0.4;
  }
  return g;
}

function buildOctopus(): THREE.Group {
  const g = new THREE.Group();
  const skin = noiseTexture("#c75f92", "#a1416f", 1100, 84);
  const rand = seededRandom(85);

  const head = part(g, latheBody([[0.01, 1.6], [0.95, 1.15], [1.3, 0.2], [1.05, -0.7], [0.55, -1.1], [0.01, -1.2]], 24), { map: skin, roughness: 0.6 }, 0, 2.6, 0);
  head.scale.set(1, 1.05, 1);
  addEye(g, -0.62, 2.45, 1.05, 0.2, 0x3a2340);
  addEye(g, 0.62, 2.45, 1.05, 0.2, 0x3a2340);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    const reach = 1.7 + rand() * 0.7;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    taperedLimb(
      new THREE.Vector3(dirX * 0.75, 1.4, dirZ * 0.75),
      new THREE.Vector3(dirX * reach * 0.8, 0.45, dirZ * reach * 0.8),
      new THREE.Vector3(dirX * reach * (1.1 + rand() * 0.25), 0.14, dirZ * reach * 1.15),
      0.26,
      0.07,
      { map: skin, roughness: 0.6 },
      g
    );
  }
  return g;
}

function buildShark(): THREE.Group {
  const g = new THREE.Group();
  const hide = bellyGradientTexture("#5d707f", "#e4ecf0");

  const body = part(
    g,
    latheBody(
      [
        [0.01, 3],
        [0.45, 2.3],
        [0.95, 1],
        [1.1, -0.3],
        [0.8, -1.7],
        [0.4, -2.8],
        [0.18, -3.4],
        [0.01, -3.6],
      ],
      24
    ),
    { map: hide, roughness: 0.5 }
  );
  body.rotation.x = -Math.PI / 2;
  body.position.y = 3.2;

  const dorsal = part(g, new THREE.ConeGeometry(0.7, 1.5, 12), { map: hide, roughness: 0.5 }, 0, 4.7, -0.5);
  dorsal.rotation.x = -0.4;
  dorsal.scale.z = 0.4;
  // Crescent tail.
  for (const [tilt, length] of [[0.9, 1.7], [-0.75, 1.15]] as const) {
    const lobe = part(g, new THREE.ConeGeometry(0.34, length, 10), { map: hide, roughness: 0.5 }, 0, 3.2 + Math.sin(tilt) * 0.6, -3.75);
    lobe.rotation.x = Math.PI / 2 + tilt;
    lobe.scale.x = 0.4;
  }
  for (const side of [-1, 1]) {
    const fin = part(g, new THREE.ConeGeometry(0.5, 1.35, 10), { map: hide, roughness: 0.5 }, side * 1.05, 2.65, 1);
    fin.rotation.set(0.5, 0, side * (Math.PI / 2 + 0.55));
    fin.scale.z = 0.35;
    // Gill slits.
    for (let s = 0; s < 3; s += 1) {
      part(g, new THREE.BoxGeometry(0.03, 0.5, 0.09), { color: 0x40505c, roughness: 0.6, shadows: false }, side * 0.92, 3.3, 1.5 + s * 0.24);
    }
  }
  addEye(g, -0.62, 3.55, 2.35, 0.12, 0x1a242c);
  addEye(g, 0.62, 3.55, 2.35, 0.12, 0x1a242c);
  const smile = part(g, new THREE.TorusGeometry(0.4, 0.05, 8, 16, Math.PI * 0.75), { color: 0x37444e, roughness: 0.5, shadows: false }, 0, 2.85, 2.7);
  smile.rotation.set(0.6, 0, Math.PI + 0.4);
  return g;
}

function buildJellyfish(): THREE.Group {
  const g = new THREE.Group();
  const rand = seededRandom(86);

  const bell = part(
    g,
    latheBody([[0.01, 1.15], [0.75, 0.95], [1.25, 0.35], [1.42, -0.15], [1.3, -0.35], [0.01, -0.42]], 28),
    { color: 0xc9a0dc, roughness: 0.25, opacity: 0.72, emissive: 0x8a5fae, emissiveIntensity: 0.35, shadows: false },
    0,
    3.6,
    0
  );
  bell.scale.set(1, 0.95, 1);
  part(g, new THREE.SphereGeometry(0.85, 16, 12), { color: 0xe8d2f4, roughness: 0.3, opacity: 0.5, emissive: 0xb98fd6, emissiveIntensity: 0.5, shadows: false }, 0, 3.45, 0).scale.set(1, 0.5, 1);
  addEye(g, -0.4, 3.4, 1.05, 0.14, 0x4d3a5e);
  addEye(g, 0.4, 3.4, 1.05, 0.14, 0x4d3a5e);

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const radius = 0.55 + (i % 2) * 0.35;
    const length = 1.7 + rand() * 1.1;
    taperedLimb(
      new THREE.Vector3(Math.cos(angle) * radius, 3.25, Math.sin(angle) * radius),
      new THREE.Vector3(Math.cos(angle) * (radius + 0.3), 3.25 - length * 0.55, Math.sin(angle) * (radius + 0.3)),
      new THREE.Vector3(Math.cos(angle) * radius * 0.7, 3.25 - length, Math.sin(angle) * radius * 0.7),
      0.06,
      0.025,
      { color: 0xb98fd6, roughness: 0.4, opacity: 0.7, emissive: 0x8a5fae, emissiveIntensity: 0.3, shadows: false },
      g
    );
  }
  return g;
}

const ANIMAL_BUILDERS: Record<string, () => THREE.Group> = {
  Whale: buildWhale,
  Dolphin: buildDolphin,
  Turtle: buildTurtle,
  Octopus: buildOctopus,
  Shark: buildShark,
  Jellyfish: buildJellyfish,
};

// ---- vehicle ----

function buildSubmarine(): THREE.Group {
  const g = new THREE.Group();
  const paintTexture = noiseTexture("#f0c23e", "#d8a72c", 500, 87);

  const hull = part(g, latheBody([[0.01, 2.4], [0.75, 1.9], [1.15, 0.7], [1.2, -0.6], [0.85, -1.7], [0.4, -2.3], [0.01, -2.5]], 26), { map: paintTexture, roughness: 0.35, metalness: 0.35 });
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.5;

  // Porthole with otter captain.
  part(g, new THREE.TorusGeometry(0.58, 0.11, 12, 24), { color: 0xb8860b, roughness: 0.25, metalness: 0.7 }, 0, 0.62, 1.55).rotation.x = 0.12;
  part(g, new THREE.CircleGeometry(0.54, 24), { color: 0xa8dcf0, roughness: 0.05, metalness: 0.3, opacity: 0.55 }, 0, 0.62, 1.54).rotation.x = 0.12;
  const captain = new THREE.Group();
  part(captain, new THREE.SphereGeometry(0.3, 14, 12), { map: noiseTexture("#8b5a3c", "#6d4227", 400, 88) });
  part(captain, new THREE.SphereGeometry(0.2, 10, 8), { color: 0xe6c6a3, roughness: 0.7 }, 0, -0.06, 0.2).scale.set(1, 0.75, 0.6);
  addEye(captain, -0.11, 0.08, 0.24, 0.055, 0x2f2119);
  addEye(captain, 0.11, 0.08, 0.24, 0.055, 0x2f2119);
  captain.position.set(0, 0.58, 1.3);
  g.add(captain);

  // Conning tower, periscope, dive planes.
  part(g, new THREE.CylinderGeometry(0.42, 0.55, 0.65, 16), { map: paintTexture, roughness: 0.35, metalness: 0.35 }, 0, 1.5, -0.3);
  part(g, new THREE.CylinderGeometry(0.06, 0.06, 0.85, 10), { color: 0xb8860b, roughness: 0.3, metalness: 0.7 }, 0, 2.2, -0.3);
  const scopeHead = part(g, new THREE.SphereGeometry(0.13, 10, 8), { color: 0xb8860b, roughness: 0.3, metalness: 0.7 }, 0.22, 2.55, -0.3);
  scopeHead.scale.z = 1.6;
  for (const side of [-1, 1]) {
    part(g, new THREE.BoxGeometry(0.85, 0.07, 0.5), { map: paintTexture, roughness: 0.4, metalness: 0.3 }, side * 0.95, 0.5, 0.6);
  }
  part(g, new THREE.BoxGeometry(0.08, 1, 0.7), { map: paintTexture, roughness: 0.4, metalness: 0.3 }, 0, 1.05, -2.2);

  const propeller = new THREE.Group();
  propeller.name = "propeller";
  for (const angle of [0, Math.PI / 3, (Math.PI * 2) / 3]) {
    const blade = part(propeller, new THREE.SphereGeometry(0.4, 8, 6), { color: 0xc9971d, roughness: 0.3, metalness: 0.75 });
    blade.scale.set(0.16, 1, 0.35);
    blade.rotation.z = angle;
  }
  propeller.position.set(0, 0.5, -2.6);
  g.add(propeller);

  // Soft headlight glow cone ahead of the sub.
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 5, 20, 1, true),
    new THREE.MeshBasicMaterial({
      map: radialFadeTexture("rgba(210,240,255,0.5)", "rgba(210,240,255,0)"),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.set(0, 0.5, 4.2);
  g.add(beam);

  return g;
}

// ---- world ----

export function buildOceanWorld(scene: THREE.Scene): RideWorldBuild {
  scene.fog = new THREE.Fog(0x0e5c8f, 20, 105);

  // Deep-water gradient dome.
  const water = new THREE.Mesh(
    new THREE.SphereGeometry(240, 24, 16),
    new THREE.MeshBasicMaterial({
      map: skyGradientTexture("#63c3e8", "#1173ab", "#062f4e"),
      side: THREE.BackSide,
      fog: false,
    })
  );
  scene.add(water);

  scene.add(new THREE.HemisphereLight(0xc4ecff, 0x0a3a5c, 1.2));
  const sunlight = new THREE.DirectionalLight(0xd8f2ff, 1.5);
  sunlight.position.set(12, 60, 6);
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0xbfe6f4, 0.45);
  fill.position.set(-10, 14, -20);
  scene.add(fill);

  // Rippled sand floor.
  const sandTexture = noiseTexture("#dcc98f", "#c2ab72", 1500, 21);
  sandTexture.repeat.set(40, 40);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(200, 48),
    new THREE.MeshStandardMaterial({ map: sandTexture, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const curve = createLoopCurve(40, 6, 3, 1.1);
  scene.add(createTrackRibbon(curve, 7, 0xe6d7a0, -2.9));

  // Sun shafts slanting down through the water.
  const rayTexture = radialFadeTexture("rgba(190,235,255,0.55)", "rgba(190,235,255,0)");
  const rays: THREE.Mesh[] = [];
  const rand = seededRandom(22);
  for (let i = 0; i < 7; i += 1) {
    const ray = new THREE.Mesh(
      new THREE.PlaneGeometry(4 + rand() * 5, 46),
      new THREE.MeshBasicMaterial({
        map: rayTexture,
        transparent: true,
        opacity: 0.16 + rand() * 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
    const angle = rand() * Math.PI * 2;
    const radius = 18 + rand() * 45;
    ray.position.set(Math.cos(angle) * radius, 22, Math.sin(angle) * radius);
    ray.rotation.set(0.25, rand() * Math.PI, 0.18);
    scene.add(ray);
    rays.push(ray);
  }

  // Coral gardens, seaweed, rocks.
  const swaying: THREE.Mesh[] = [];
  for (let i = 0; i < 34; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() < 0.5 ? 12 + rand() * 16 : 56 + rand() * 55;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const kind = rand();
    if (kind < 0.42) {
      const coral = new THREE.Group();
      const palette = ["#e0685f", "#ef9a5a", "#d75a90", "#c9556e"];
      for (let j = 0; j < 4; j += 1) {
        taperedLimb(
          new THREE.Vector3((j - 1.5) * 0.5, 0, (rand() - 0.5) * 0.8),
          new THREE.Vector3((j - 1.5) * 0.8, 1 + rand() * 0.8, (rand() - 0.5) * 0.9),
          new THREE.Vector3((j - 1.5) * 1 + (rand() - 0.5), 2 + rand() * 1.4, (rand() - 0.5)),
          0.3,
          0.1,
          { map: noiseTexture(palette[j % 4], "#8f3550", 400, 300 + i * 4 + j), roughness: 0.8 },
          coral
        );
      }
      coral.position.set(x, 0, z);
      scene.add(coral);
    } else if (kind < 0.72) {
      const blade = part(scene, new THREE.BoxGeometry(0.4, 3.5 + rand() * 2.5, 0.1), { map: noiseTexture("#3fae6a", "#2c8a4e", 500, 400 + i), roughness: 0.9, opacity: 0.94 }, x, 0, z);
      blade.geometry.translate(0, (3.5 + rand() * 2.5) / 2, 0);
      swaying.push(blade);
    } else {
      const rock = part(scene, new THREE.DodecahedronGeometry(0.9 + rand() * 1.1, 0), { map: noiseTexture("#8d99a4", "#6d7883", 500, 500 + i), roughness: 1 }, x, 0.5, z);
      rock.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
    }
  }

  // Bubbles and drifting motes.
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 30; i += 1) {
    const bubble = part(
      scene,
      new THREE.SphereGeometry(0.1 + rand() * 0.2, 10, 8),
      { color: 0xdff2fc, roughness: 0.05, opacity: 0.35, shadows: false },
      (rand() - 0.5) * 110,
      rand() * 18,
      (rand() - 0.5) * 110
    );
    bubbles.push(bubble);
  }
  const moteCount = 260;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i += 1) {
    motePositions[i * 3] = (rand() - 0.5) * 130;
    motePositions[i * 3 + 1] = rand() * 22;
    motePositions[i * 3 + 2] = (rand() - 0.5) * 130;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      map: radialFadeTexture("rgba(230,245,255,0.9)", "rgba(230,245,255,0)"),
      color: 0xcfe9f6,
      size: 0.32,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  scene.add(motes);

  const vehicle = buildSubmarine();
  scene.add(vehicle);
  const vehicleShadow = blobShadow(scene, 2.2, 0.07, 0.3);

  const animals = OCEAN_RIDE.animals.map((spec) => {
    const group = ANIMAL_BUILDERS[spec.word]();
    placeBesideTrack(group, curve, spec.t, spec.side, 9);
    if (!FLOOR_FRIENDS.has(spec.word)) group.position.y = 1.4;
    // Soft contact shadow keeps everyone visually grounded.
    const shadow = blobShadow(scene, spec.word === "Whale" ? 3.4 : 2, 0.06, 0.28);
    shadow.position.x = group.position.x;
    shadow.position.z = group.position.z;
    scene.add(group);
    return { spec, group };
  });

  let propeller: THREE.Object3D | null = null;
  vehicle.traverse((object) => {
    if (object.name === "propeller") propeller = object;
  });

  return {
    curve,
    vehicle,
    animals,
    laneHalfWidth: 2.4,
    cameraDistance: 10,
    cameraHeight: 4.6,
    update: (time: number, vehiclePosition: THREE.Vector3) => {
      if (propeller) propeller.rotation.z = time * 7;
      vehicleShadow.position.x = vehiclePosition.x;
      vehicleShadow.position.z = vehiclePosition.z;
      swaying.forEach((blade, index) => {
        blade.rotation.z = Math.sin(time * 1.1 + index) * 0.16;
      });
      bubbles.forEach((bubble, index) => {
        bubble.position.y += 0.022 + (index % 5) * 0.004;
        if (bubble.position.y > 20) bubble.position.y = 0;
      });
      rays.forEach((ray, index) => {
        ray.rotation.y += 0.0004 * ((index % 3) + 1);
        const material = ray.material as THREE.MeshBasicMaterial;
        material.opacity = 0.14 + Math.sin(time * 0.5 + index * 1.7) * 0.07 + 0.07;
      });
    },
  };
}
