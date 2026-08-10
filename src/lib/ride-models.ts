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
    const cachedPromise = loader.loadAsync(url).then((gltf) => gltf.scene);
    sceneCache.set(url, cachedPromise);
    // A transient network/decode failure must not poison every later retry.
    // Keep successful scenes cached, but evict only the rejected entry that
    // is still current for this URL.
    void cachedPromise.catch(() => {
      if (sceneCache.get(url) === cachedPromise) sceneCache.delete(url);
    });
    pending = cachedPromise;
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
    object.receiveShadow = true;
    const mesh = object as THREE.Mesh;
    if (mesh.geometry?.attributes.position && !mesh.geometry.attributes.normal) {
      mesh.geometry.computeVertexNormals();
    }
    const source = mesh.material;
    if (!source) return;
    const materials = Array.isArray(source) ? source : [source];
    const enhanced = materials.map((entry) => {
      const material = entry.clone() as THREE.MeshStandardMaterial;
      if ("roughness" in material) {
        material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.82, 0.62, 0.94);
        material.metalness = 0;
        material.envMapIntensity = 0.75;
      }
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = 4;
      }
      material.needsUpdate = true;
      return material;
    });
    mesh.material = Array.isArray(source) ? enhanced : enhanced[0];
  });

  const group = new THREE.Group();
  group.add(model);
  return group;
}
