/**
 * Ocean Dive world builder — deep-water scene with real low-poly 3D sea
 * animal models (Poly by Google, CC-BY 3.0 — see ATTRIBUTIONS.md) that
 * drift, breathe, and perform a signature move when the submarine stops
 * (whale spouts, dolphin flips, shark barrel-rolls...). Sun shafts,
 * motes, and contact shadows included.
 */

import * as THREE from "three";
import type { RideAnimalNode, RideWorldBuild } from "./ride-engine";
import { OCEAN_RIDE } from "./ride-data";
import type { RideAnimalSpec } from "./ride-data";
import type { AnimalModelOptions } from "./ride-models";
import {
  createLoopCurve,
  createTrackRibbon,
  placeBesideTrack,
  seededRandom,
} from "./ride-track";
import {
  addEye,
  blobShadow,
  latheBody,
  noiseTexture,
  part,
  radialFadeTexture,
  skyGradientTexture,
  taperedLimb,
} from "./ride-visuals";

type Animate = (time: number, active: boolean, activeElapsed: number) => void;

/** Model sizing for each sea animal (world units). */
export const OCEAN_MODELS: Record<string, AnimalModelOptions> = {
  Whale: { height: 3.6 },
  Dolphin: { height: 2.2 },
  Turtle: { height: 2 },
  Octopus: { height: 3.2 },
  Shark: { height: 2.4 },
  Jellyfish: { height: 3.2 },
};

function gesturePulse(elapsed: number, start: number, duration: number): number {
  const t = (elapsed - start) / duration;
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI);
}

function rampIn(elapsed: number, duration = 0.5): number {
  const t = Math.min(1, Math.max(0, elapsed / duration));
  return t * t * (3 - 2 * t);
}

function homeKeeper(group: THREE.Group) {
  let home: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  return () => {
    if (!home) home = { position: group.position.clone(), quaternion: group.quaternion.clone() };
    return home;
  };
}

function swimMotion(
  group: THREE.Group,
  vp: THREE.Vector3,
  time: number,
  active: boolean,
  seed: number,
  radius: number,
  pace: number,
  home: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null
): number {
  if (!home) return 0;
  const turnTo = (yaw: number, rate: number) => {
    const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    group.quaternion.slerp(targetQuat, rate);
  };
  if (active) {
    // Swim home and turn to face the submarine for the show.
    group.position.x += (home.position.x - group.position.x) * 0.08;
    group.position.z += (home.position.z - group.position.z) * 0.08;
    turnTo(Math.atan2(vp.x - group.position.x, vp.z - group.position.z), 0.1);
    return 0;
  }
  const angle = time * pace + seed;
  const targetX = home.position.x + Math.cos(angle) * radius;
  const targetZ = home.position.z + Math.sin(angle) * radius * 0.8;
  const dx = targetX - group.position.x;
  const dz = targetZ - group.position.z;
  group.position.x = targetX;
  group.position.z = targetZ;
  // Swim facing the direction of travel.
  if (Math.hypot(dx, dz) > 0.002) turnTo(Math.atan2(dx, dz), 0.1);
  return 1;
}

/** Re-parent the model so the group spins around its middle. */
function centerSpinner(group: THREE.Group, height: number): THREE.Group {
  const spinner = new THREE.Group();
  spinner.position.y = height / 2;
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.position.y -= height / 2;
    spinner.add(child);
  }
  group.add(spinner);
  return spinner;
}

/** Species motion for the sea animal models — all group-level transforms. */
const OCEAN_MOTION: Record<string, (g: THREE.Group, vp: THREE.Vector3) => Animate> = {
  Whale: (g, vp) => {
    const getHome = homeKeeper(g);
    const height = OCEAN_MODELS.Whale.height;
    // Bubble spout that grows out of the blowhole during the show.
    const spout = new THREE.Group();
    [
      [0, 0.25, 0.24],
      [-0.35, 0.75, 0.19],
      [0.38, 0.9, 0.2],
      [0, 1.3, 0.27],
    ].forEach(([x, y, radius]) => {
      part(spout, new THREE.SphereGeometry(radius, 10, 8), { color: 0xdff2fc, roughness: 0.1, opacity: 0.55, shadows: false }, x, y, 0);
    });
    // Anchor over the blowhole — forward of centre on the nose-first model.
    spout.position.set(0, height * 0.95, height * 0.3);
    spout.scale.setScalar(0.001);
    g.add(spout);
    return (time, active, elapsed) => {
      swimMotion(g, vp, time, active, 0.4, 1.2, 0.05, getHome());
      const show = gesturePulse(elapsed, 0.4, 3.4) * rampIn(elapsed);
      g.position.y = show * 1.1 + Math.sin(time * 1.2) * 0.18;
      g.rotation.z = Math.sin(time * 1.6) * 0.05;
      spout.scale.setScalar(Math.max(0.001, show));
    };
  },
  Dolphin: (g, vp) => {
    const getHome = homeKeeper(g);
    const spinner = centerSpinner(g, OCEAN_MODELS.Dolphin.height);
    return (time, active, elapsed) => {
      swimMotion(g, vp, time, active, 2.2, 2.4, 0.22, getHome());
      g.position.y = Math.sin(time * 1.9) * 0.3 + 0.4;
      let flip = 0;
      for (const start of [0.4, 3]) {
        const t = (elapsed - start) / 1.4;
        if (t > 0 && t < 1) flip = t * t * (3 - 2 * t) * Math.PI * 2;
      }
      // Pitch around the lateral axis — a true nose-over-tail somersault
      // now that the model swims nose-forward (z-roll would corkscrew).
      spinner.rotation.x = -flip;
      if (active && flip === 0) g.position.y += Math.abs(Math.sin(time * 5)) * 0.4 * rampIn(elapsed);
    };
  },
  Turtle: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      swimMotion(g, vp, time, active, 4.8, 0.7, 0.06, getHome());
      const hello = gesturePulse(elapsed, 0.5, 2.8) * rampIn(elapsed);
      g.position.y = Math.sin(time * 1.4) * 0.15 + 0.3 + hello * 0.5;
      // Paddling rock, quicker when excited.
      g.rotation.z = Math.sin(time * (active ? 5.5 : 2)) * (active ? 0.14 : 0.07);
      g.rotation.x = -hello * 0.25;
    };
  },
  Octopus: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      swimMotion(g, vp, time, active, 6.1, 0.3, 0.06, getHome());
      // Squishy jet-breathing.
      const breath = Math.sin(time * (active ? 5 : 2.1)) * (active ? 0.1 : 0.045);
      g.scale.set(1 - breath * 0.6, 1 + breath, 1 - breath * 0.6);
      const dance = gesturePulse(elapsed, 0.5, 3) * rampIn(elapsed);
      g.position.y = dance * 0.9 + Math.sin(time * 1.2) * 0.1;
      g.rotation.z = Math.sin(time * (active ? 4.4 : 1.1)) * (active ? 0.18 : 0.04);
    };
  },
  Shark: (g, vp) => {
    const getHome = homeKeeper(g);
    const spinner = centerSpinner(g, OCEAN_MODELS.Shark.height);
    return (time, active, elapsed) => {
      swimMotion(g, vp, time, active, 1.3, 2.6, 0.28, getHome());
      g.position.y = Math.sin(time * 1.6) * 0.22 + 0.35;
      let roll = 0;
      for (const start of [0.5, 3.1]) {
        const t = (elapsed - start) / 1.5;
        if (t > 0 && t < 1) roll = t * t * (3 - 2 * t) * Math.PI * 2;
      }
      spinner.rotation.z = roll;
      g.rotation.z = active ? 0 : Math.sin(time * 3.2) * 0.05;
    };
  },
  Jellyfish: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      getHome();
      // Medusa pulse: squash wide, stretch tall, drift upward.
      const beat = Math.sin(time * (active ? 4.6 : 2.2));
      g.scale.set(1 - beat * 0.07, 1 + beat * 0.12, 1 - beat * 0.07);
      const glow = gesturePulse(elapsed, 0.4, 3.2) * rampIn(elapsed);
      g.position.y = Math.sin(time * 1.1) * 0.4 + 0.5 + glow * 1.2;
      g.rotation.z = Math.sin(time * 0.9) * 0.06;
    };
  },
};

// ---- vehicle ----

function buildSubmarine(): THREE.Group {
  const g = new THREE.Group();
  const paintTexture = noiseTexture("#f0c23e", "#d8a72c", 500, 87);

  const hull = part(g, latheBody([[0.01, 2.4], [0.75, 1.9], [1.15, 0.7], [1.2, -0.6], [0.85, -1.7], [0.4, -2.3], [0.01, -2.5]], 26), { map: paintTexture, roughness: 0.35, metalness: 0.35 });
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.5;

  part(g, new THREE.TorusGeometry(0.58, 0.11, 12, 24), { color: 0xb8860b, roughness: 0.25, metalness: 0.7 }, 0, 0.62, 1.55).rotation.x = 0.12;
  part(g, new THREE.CircleGeometry(0.54, 24), { color: 0xa8dcf0, roughness: 0.05, metalness: 0.3, opacity: 0.55 }, 0, 0.62, 1.54).rotation.x = 0.12;
  const captain = new THREE.Group();
  part(captain, new THREE.SphereGeometry(0.3, 14, 12), { map: noiseTexture("#8b5a3c", "#6d4227", 400, 88) });
  part(captain, new THREE.SphereGeometry(0.2, 10, 8), { color: 0xe6c6a3, roughness: 0.7 }, 0, -0.06, 0.2).scale.set(1, 0.75, 0.6);
  addEye(captain, -0.11, 0.08, 0.24, 0.055, 0x2f2119);
  addEye(captain, 0.11, 0.08, 0.24, 0.055, 0x2f2119);
  captain.position.set(0, 0.58, 1.3);
  g.add(captain);

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

export function buildOceanWorld(
  scene: THREE.Scene,
  figurines: Record<string, THREE.Group>
): RideWorldBuild {
  scene.fog = new THREE.Fog(0x0e5c8f, 20, 105);

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
  const vehicleFocus = curve.getPointAt(0);

  const animals: RideAnimalNode[] = OCEAN_RIDE.animals.map((spec: RideAnimalSpec) => {
    const group = figurines[spec.word];
    placeBesideTrack(group, curve, spec.t, spec.side, 8.5);
    const shadow = blobShadow(scene, spec.word === "Whale" ? 3.2 : 2.2, 0.06, 0.28);
    shadow.position.x = group.position.x;
    shadow.position.z = group.position.z;
    scene.add(group);
    return { spec, group, animate: OCEAN_MOTION[spec.word](group, vehicleFocus) };
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
      vehicleFocus.copy(vehiclePosition);
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
