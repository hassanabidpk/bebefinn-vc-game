/**
 * Safari Ride world builder — golden-hour savanna with real low-poly 3D
 * animal models (Poly by Google, CC-BY 3.0 — see ATTRIBUTIONS.md) that
 * wander around their home spot facing their direction of travel and
 * perform a signature move when the jeep stops. Real-time shadows follow
 * the jeep under a painted sky dome.
 */

import * as THREE from "three";
import type { RideAnimalNode, RideWorldBuild } from "./ride-engine";
import { SAFARI_RIDE } from "./ride-data";
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
  latheBody,
  noiseTexture,
  part,
  radialFadeTexture,
  skyGradientTexture,
} from "./ride-visuals";

type Animate = (time: number, active: boolean, activeElapsed: number) => void;

/** Model sizing for each safari animal (world units). */
export const SAFARI_MODELS: Record<string, AnimalModelOptions> = {
  Lion: { height: 3.1, yaw: Math.PI },
  Elephant: { height: 4.6, yaw: Math.PI },
  Giraffe: { height: 6.2, yaw: Math.PI },
  Zebra: { height: 3, yaw: Math.PI },
  Monkey: { height: 2.2, yaw: Math.PI },
  Hippo: { height: 2.9, yaw: Math.PI },
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

/** Amble around home when idle; come home and face the road when active. */
function groundMotion(
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
    // Come home and turn to face the jeep for the show.
    group.position.x += (home.position.x - group.position.x) * 0.08;
    group.position.z += (home.position.z - group.position.z) * 0.08;
    turnTo(Math.atan2(vp.x - group.position.x, vp.z - group.position.z), 0.1);
    return 0;
  }
  const angle = time * pace + seed;
  const targetX = home.position.x + Math.cos(angle) * radius;
  const targetZ = home.position.z + Math.sin(angle) * radius * 0.7;
  const dx = targetX - group.position.x;
  const dz = targetZ - group.position.z;
  group.position.x = targetX;
  group.position.z = targetZ;
  // Walk facing the direction of travel, like a real animal.
  if (Math.hypot(dx, dz) > 0.002) turnTo(Math.atan2(dx, dz), 0.1);
  return 1;
}

/**
 * Species motion for the animal models. All group-level: waddle walks,
 * hops, bows, rears, spins — plus each animal's signature show.
 */
const SAFARI_MOTION: Record<string, (g: THREE.Group, vp: THREE.Vector3) => Animate> = {
  Lion: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      const walk = groundMotion(g, vp, time, active, 3.1, 1.6, 0.14, getHome());
      const rear = gesturePulse(elapsed, 0.5, 2.6) * rampIn(elapsed);
      g.rotation.z = Math.sin(time * 6.5) * 0.05 * walk;
      g.rotation.x = -rear * 0.55;
      g.position.y = rear * 0.5 + Math.abs(Math.sin(time * 4.4)) * 0.06 * walk;
      // Roar shudder at the top of the rear.
      g.scale.setScalar(1 + rear * 0.05 + Math.sin(time * 22) * 0.012 * rear);
    };
  },
  Elephant: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      const walk = groundMotion(g, vp, time, active, 1.7, 1.3, 0.09, getHome());
      const salute = gesturePulse(elapsed, 0.5, 2.8) * rampIn(elapsed);
      g.rotation.z = Math.sin(time * 5) * 0.04 * walk;
      // Tip back and stretch tall, like raising the trunk to trumpet.
      g.rotation.x = -salute * 0.32;
      g.scale.y = 1 + salute * 0.08;
      g.position.y = salute * 0.25 + Math.abs(Math.sin(time * 3.4)) * 0.05 * walk;
    };
  },
  Giraffe: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      const walk = groundMotion(g, vp, time, active, 5.4, 1.8, 0.11, getHome());
      const bow = gesturePulse(elapsed, 0.5, 3) * rampIn(elapsed);
      g.rotation.z = Math.sin(time * 4.6) * 0.045 * walk;
      // A deep graceful bow from the ankles.
      g.rotation.x = bow * 0.5;
      g.position.y = Math.abs(Math.sin(time * 3.6)) * 0.06 * walk;
    };
  },
  Zebra: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      const walk = groundMotion(g, vp, time, active, 7.9, 2, 0.16, getHome());
      const buck = (gesturePulse(elapsed, 0.5, 1.5) + gesturePulse(elapsed, 2.7, 1.5)) * rampIn(elapsed);
      g.rotation.z = Math.sin(time * 7.5) * 0.055 * walk + Math.sin(time * 11) * 0.08 * buck;
      g.rotation.x = -buck * 0.3;
      g.position.y = buck * 0.55 + Math.abs(Math.sin(time * 5)) * 0.07 * walk;
    };
  },
  Monkey: (g, vp) => {
    const getHome = homeKeeper(g);
    let spin = 0;
    return (time, active, elapsed) => {
      getHome();
      const excitement = active ? rampIn(elapsed, 0.6) : 0;
      g.position.y = Math.abs(Math.sin(time * (active ? 7 : 2.8))) * (0.14 + excitement * 0.5);
      g.rotation.z = Math.sin(time * 3.2) * 0.07;
      // Joy spin during the show.
      const wantSpin = gesturePulse(elapsed, 0.8, 1.4) > 0 ? 0.18 : 0;
      spin += wantSpin;
      g.rotation.y += wantSpin;
      void spin;
    };
  },
  Hippo: (g, vp) => {
    const getHome = homeKeeper(g);
    return (time, active, elapsed) => {
      const walk = groundMotion(g, vp, time, active, 9.2, 1.1, 0.07, getHome());
      const yawn = gesturePulse(elapsed, 0.6, 3.2) * rampIn(elapsed);
      g.rotation.z = Math.sin(time * 4.2) * 0.045 * walk;
      // Head-back stretch with a belly wobble.
      g.rotation.x = -yawn * 0.35;
      g.scale.y = 1 + yawn * 0.1;
      g.scale.x = 1 + Math.sin(time * 9) * 0.02 * yawn;
      g.position.y = Math.abs(Math.sin(time * 2.8)) * 0.045 * walk;
    };
  },
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

export function buildSafariWorld(
  scene: THREE.Scene,
  figurines: Record<string, THREE.Group>
): RideWorldBuild {
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
  const vehicleFocus = curve.getPointAt(0);

  const animals: RideAnimalNode[] = SAFARI_RIDE.animals.map((spec: RideAnimalSpec) => {
    const group = figurines[spec.word];
    placeBesideTrack(group, curve, spec.t, spec.side, 8.5);
    scene.add(group);
    return { spec, group, animate: SAFARI_MOTION[spec.word](group, vehicleFocus) };
  });

  return {
    curve,
    vehicle,
    animals,
    laneHalfWidth: 2.2,
    cameraDistance: 9,
    cameraHeight: 4.2,
    update: (time: number, vehiclePosition: THREE.Vector3) => {
      vehicleFocus.copy(vehiclePosition);
      sun.position.set(vehiclePosition.x + 18, 32, vehiclePosition.z + 8);
      sun.target.position.copy(vehiclePosition);
      clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(time * 0.04 + index) * 0.012;
      });
    },
  };
}
