/**
 * Shared Three.js engine for the ride games (Safari Ride / Ocean Dive).
 *
 * The engine owns the renderer, chase camera, and vehicle movement along a
 * closed track. World builders (safari-world.ts / ocean-world.ts) own the
 * scenery, the vehicle mesh, and the animal meshes. React (ride-screen.tsx)
 * owns all UI, speech, and sounds, and hears about animals via callbacks.
 */

import * as THREE from "three";
import { loopDistance, pickEncounter, wrapProgress } from "./ride-math";
import type { RideAnimalSpec } from "./ride-data";

export type RideMode = "auto" | "drive";
export type RideInput = "forward" | "back" | "left" | "right";

export interface RideAnimalNode {
  spec: RideAnimalSpec;
  group: THREE.Group;
}

export interface RideWorldBuild {
  /** Closed loop the vehicle follows. */
  curve: THREE.CatmullRomCurve3;
  /** Vehicle mesh, already added to the scene by the builder. */
  vehicle: THREE.Group;
  /** Animal meshes, already added and positioned beside the track. */
  animals: RideAnimalNode[];
  /** How far the child can slide sideways in drive mode (world units). */
  laneHalfWidth: number;
  cameraDistance: number;
  cameraHeight: number;
  /** Per-frame scenery animation (bubbles, clouds, follow-shadow light). */
  update?: (time: number, vehiclePosition: THREE.Vector3) => void;
}

export type RideWorldBuilder = (scene: THREE.Scene) => RideWorldBuild;

export interface RideEngineCallbacks {
  /** An animal is being met right now — highlight card, speech, sound. */
  onEncounter: (word: string) => void;
  /** The moment has passed; hide the card. */
  onEncounterEnd: () => void;
}

const CRUISE_SPEED = 7; // world units / second
const REVERSE_SPEED = 4.5;
const SIDE_SPEED = 5;
const ENCOUNTER_RANGE = 5; // world units — announce inside this
const SLOW_RANGE = 14; // auto mode starts braking here
const RELEASE_RANGE = 9; // must leave this far before re-announcing
const AUTO_DWELL_SECONDS = 5;

type AutoPhase = "cruising" | "dwelling";

export class RideEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private world: RideWorldBuild;
  private callbacks: RideEngineCallbacks;
  private resizeObserver: ResizeObserver;
  private clock = new THREE.Clock();
  private frame = 0;
  private disposed = false;

  private trackLength: number;
  private progress = 0;
  private speed = 0;
  private sideOffset = 0;
  private mode: RideMode = "auto";
  private autoPhase: AutoPhase = "cruising";
  private dwellRemaining = 0;
  private pressed: Record<RideInput, boolean> = {
    forward: false,
    back: false,
    left: false,
    right: false,
  };

  /** Animals announced recently; released once the vehicle moves away. */
  private muted = new Set<string>();
  private activeEncounter: string | null = null;
  private highlight: THREE.Mesh;
  private animalBaseY = new Map<string, number>();

  constructor(
    container: HTMLElement,
    buildWorld: RideWorldBuilder,
    callbacks: RideEngineCallbacks
  ) {
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    this.world = buildWorld(this.scene);
    this.trackLength = this.world.curve.getLength();
    for (const animal of this.world.animals) {
      this.animalBaseY.set(animal.spec.word, animal.group.position.y);
    }

    // Pulsing ground ring shown under the animal being met.
    const ringGeometry = new THREE.RingGeometry(2.2, 3.1, 40);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.highlight = new THREE.Mesh(ringGeometry, ringMaterial);
    this.highlight.rotation.x = -Math.PI / 2;
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    resize();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(container);

    // Place the vehicle and camera before the first paint.
    this.updateVehicle(0);
    this.updateCamera(1);
    const tick = () => {
      if (this.disposed) return;
      this.frame = requestAnimationFrame(tick);
      this.step(Math.min(this.clock.getDelta(), 0.1));
    };
    tick();
  }

  setMode(mode: RideMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.autoPhase = "cruising";
    this.dwellRemaining = 0;
  }

  getMode(): RideMode {
    return this.mode;
  }

  press(input: RideInput, down: boolean) {
    this.pressed[input] = down;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else if (material) material.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---- internals ----

  private get rangeFraction() {
    return ENCOUNTER_RANGE / this.trackLength;
  }

  private step(dt: number) {
    const time = this.clock.elapsedTime;

    if (this.mode === "auto") this.stepAuto(dt);
    else this.stepDrive(dt);

    this.progress = wrapProgress(this.progress + (this.speed * dt) / this.trackLength);
    this.updateEncounters();
    this.updateVehicle(time);
    this.updateAnimals(time);
    this.updateCamera(dt);
    this.world.update?.(time, this.world.vehicle.position);
    this.renderer.render(this.scene, this.camera);
  }

  private stepAuto(dt: number) {
    // Ease the side offset back to the middle of the lane.
    this.sideOffset += (0 - this.sideOffset) * Math.min(1, dt * 2);

    if (this.autoPhase === "dwelling") {
      this.speed = 0;
      this.dwellRemaining -= dt;
      if (this.dwellRemaining <= 0) {
        // Done admiring — mute until we drive away, then roll on.
        if (this.activeEncounter) this.muted.add(this.activeEncounter);
        this.autoPhase = "cruising";
      }
      return;
    }

    const next = pickEncounter(
      this.progress,
      this.world.animals.map((a) => ({ word: a.spec.word, t: a.spec.t })),
      SLOW_RANGE / this.trackLength,
      this.muted
    );
    let target = CRUISE_SPEED;
    if (next) {
      const distance = loopDistance(this.progress, next.t) * this.trackLength;
      if (distance <= ENCOUNTER_RANGE * 0.6) {
        this.autoPhase = "dwelling";
        this.dwellRemaining = AUTO_DWELL_SECONDS;
        target = 0;
      } else {
        // Brake smoothly as the animal gets closer.
        target = Math.max(1.6, CRUISE_SPEED * (distance / SLOW_RANGE));
      }
    }
    this.speed += (target - this.speed) * Math.min(1, dt * 3);
  }

  private stepDrive(dt: number) {
    let target = 0;
    if (this.pressed.forward) target = CRUISE_SPEED;
    else if (this.pressed.back) target = -REVERSE_SPEED;
    this.speed += (target - this.speed) * Math.min(1, dt * 4);

    let side = 0;
    if (this.pressed.left) side = -1;
    else if (this.pressed.right) side = 1;
    this.sideOffset = THREE.MathUtils.clamp(
      this.sideOffset + side * SIDE_SPEED * dt,
      -this.world.laneHalfWidth,
      this.world.laneHalfWidth
    );
  }

  private updateEncounters() {
    // Free up animals we have driven away from.
    for (const word of this.muted) {
      const spec = this.world.animals.find((a) => a.spec.word === word);
      if (
        spec &&
        loopDistance(this.progress, spec.spec.t) * this.trackLength > RELEASE_RANGE
      ) {
        this.muted.delete(word);
      }
    }

    // The current star stays highlighted until the vehicle truly leaves,
    // even though it is muted against instant re-announcement.
    if (this.activeEncounter) {
      const current = this.world.animals.find(
        (a) => a.spec.word === this.activeEncounter
      );
      const distance = current
        ? loopDistance(this.progress, current.spec.t) * this.trackLength
        : Infinity;
      if (distance <= RELEASE_RANGE * 0.9) return;
      this.activeEncounter = null;
      this.highlight.visible = false;
      this.callbacks.onEncounterEnd();
    }

    const near = pickEncounter(
      this.progress,
      this.world.animals.map((a) => ({ word: a.spec.word, t: a.spec.t })),
      this.rangeFraction,
      this.muted
    );
    if (near) {
      this.activeEncounter = near.word;
      this.callbacks.onEncounter(near.word);
      // In drive mode announce once per approach; auto mode mutes after dwelling.
      if (this.mode === "drive") this.muted.add(near.word);
    }
  }

  private updateVehicle(time: number) {
    const t = this.progress;
    const point = this.world.curve.getPointAt(t);
    const tangent = this.world.curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const vehicle = this.world.vehicle;
    vehicle.position.copy(point).addScaledVector(side, this.sideOffset);
    // Gentle bob so the ride feels alive even when stopped.
    vehicle.position.y += Math.sin(time * 2.2) * 0.08;
    const ahead = point.clone().add(tangent);
    ahead.y = vehicle.position.y;
    vehicle.lookAt(ahead);
  }

  private updateAnimals(time: number) {
    this.world.animals.forEach((animal, index) => {
      const baseY = this.animalBaseY.get(animal.spec.word) ?? 0;
      const active = animal.spec.word === this.activeEncounter;
      // Idle bob for everyone; the star of the moment hops higher.
      const bounce = active
        ? Math.abs(Math.sin(time * 5)) * 0.9
        : Math.sin(time * 1.6 + index * 1.3) * 0.15;
      animal.group.position.y = baseY + bounce;

      if (active) {
        this.highlight.visible = true;
        this.highlight.position.set(
          animal.group.position.x,
          baseY + 0.12,
          animal.group.position.z
        );
        const pulse = 1 + Math.sin(time * 6) * 0.12;
        this.highlight.scale.setScalar(pulse);
        this.highlight.rotation.z = time * 1.4;
      }
    });
  }

  private updateCamera(dt: number) {
    const t = this.progress;
    const point = this.world.curve.getPointAt(t);
    const tangent = this.world.curve.getTangentAt(t).normalize();
    const target = point
      .clone()
      .addScaledVector(tangent, -this.world.cameraDistance)
      .add(new THREE.Vector3(0, this.world.cameraHeight, 0));
    const blend = Math.min(1, dt * 4);
    this.camera.position.lerp(target, blend);
    const lookAt = point.clone().addScaledVector(tangent, 6);
    lookAt.y += 1.5;
    this.camera.lookAt(lookAt);
  }
}
