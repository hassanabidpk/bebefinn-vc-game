/**
 * Real 3D animal models for the ride games — the "Poly by Google" low-poly
 * set (CC-BY 3.0, see ATTRIBUTIONS.md), loaded as .glb from
 * /public/models/animals and normalised at runtime: scaled to a target
 * height, grounded at y=0, centred on its footprint, and yawed so the
 * model's face points down +z (the convention the motion system uses).
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface AnimalModelOptions {
  /** World height the model is scaled to. */
  height: number;
  /** Extra yaw (radians) so the model faces +z after normalisation. */
  yaw?: number;
}

const loader = new GLTFLoader();
const sceneCache = new Map<string, Promise<THREE.Group>>();

async function loadRaw(url: string): Promise<THREE.Group> {
  let pending = sceneCache.get(url);
  if (!pending) {
    pending = loader.loadAsync(url).then((gltf) => gltf.scene);
    sceneCache.set(url, pending);
  }
  const original = await pending;
  return original.clone(true);
}

/** Load, normalise, and wrap an animal model ready for the ride engine. */
export async function loadAnimalModel(url: string, options: AnimalModelOptions): Promise<THREE.Group> {
  const model = await loadRaw(url);
  model.rotation.y = options.yaw ?? 0;
  model.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = options.height / Math.max(0.001, size.y);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaled = new THREE.Box3().setFromObject(model);
  const center = scaled.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= scaled.min.y;

  model.traverse((object) => {
    object.castShadow = true;
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (material && "roughness" in material) material.roughness = Math.min(1, material.roughness ?? 1);
  });

  const group = new THREE.Group();
  group.add(model);
  return group;
}
