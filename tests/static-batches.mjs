import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { batchStaticMeshes } from "../static-batches.js";

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: "#c8aa76" });
const make = (parent, count = 3, props = {}) => {
  const meshes = Array.from({ length: count }, () => {
    const mesh = new THREE.Mesh(geometry, material);
    Object.assign(mesh, props);
    parent.add(mesh);
    return mesh;
  });
  return meshes;
};
const closeMatrix = (actual, expected) => {
  for (let i = 0; i < 16; i++)
    assert.ok(
      Math.abs(actual.elements[i] - expected.elements[i]) < 2e-6,
      `matrix component ${i}: ${actual.elements[i]} ≈ ${expected.elements[i]}`
    );
};

// Nested rotating scenery keeps every instance in the same local/world place,
// including objects whose matrix is deliberately maintained by hand.
{
  const scene = new THREE.Scene();
  const rotor = new THREE.Group();
  rotor.position.set(6, 2.25, 1.5);
  rotor.rotation.set(0.1, 0.4, 0.9);
  scene.add(rotor);
  const sources = make(rotor, 4, {
    castShadow: true,
    receiveShadow: true,
    renderOrder: 2,
    frustumCulled: false,
  });
  sources.forEach((mesh, i) => {
    mesh.position.set(Math.sin(i) * 2, Math.cos(i) * 2, i * 0.2);
    mesh.rotation.set(i * 0.13, i * 0.21, -i);
    mesh.scale.set(0.22 + i * 0.01, 0.08, 1.2);
    mesh.layers.set(2);
  });
  sources[3].matrixAutoUpdate = false;
  sources[3].matrix.makeTranslation(2.1, -0.6, 1.3);
  scene.updateMatrixWorld(true);
  const locals = sources.map((mesh) => mesh.matrix.clone());
  const worlds = sources.map((mesh) => mesh.matrixWorld.clone());
  let disposed = 0;
  geometry.addEventListener("dispose", () => disposed++);
  material.addEventListener("dispose", () => disposed++);
  assert.deepEqual(batchStaticMeshes(scene), {
    batches: 1,
    meshes: 4,
    drawCallsSaved: 3,
  });
  assert.equal(rotor.children.length, 1);
  const batch = rotor.children[0];
  assert.ok(batch.isInstancedMesh);
  assert.equal(batch.count, 4);
  assert.equal(batch.geometry, geometry);
  assert.equal(batch.material, material);
  assert.equal(batch.castShadow, true);
  assert.equal(batch.receiveShadow, true);
  assert.equal(batch.renderOrder, 2);
  assert.equal(batch.layers.mask, 1 << 2);
  assert.equal(batch.frustumCulled, false);
  assert.ok(batch.boundingSphere.radius > 1);
  assert.equal(disposed, 0, "shared GPU resources must remain live");
  scene.updateMatrixWorld(true);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < sources.length; i++) {
    batch.getMatrixAt(i, matrix);
    closeMatrix(matrix, locals[i]);
    closeMatrix(new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, matrix), worlds[i]);
  }
  rotor.rotation.z += 0.5;
  scene.updateMatrixWorld(true);
  for (let i = 0; i < sources.length; i++) {
    batch.getMatrixAt(i, matrix);
    closeMatrix(
      new THREE.Matrix4().multiplyMatrices(batch.matrixWorld, matrix),
      new THREE.Matrix4().multiplyMatrices(rotor.matrixWorld, locals[i])
    );
  }
  assert.deepEqual(batchStaticMeshes(scene), {
    batches: 0,
    meshes: 0,
    drawCallsSaved: 0,
  });
}

// Rendering flags and resource identity split batches, and sibling groups do
// not share transforms merely because their meshes have identical materials.
{
  const scene = new THREE.Scene();
  const sets = [
    {},
    { castShadow: true },
    { receiveShadow: true },
    { renderOrder: 3 },
    { geometry: geometry.clone() },
    { material: material.clone() },
    { frustumCulled: false },
  ];
  for (const props of sets) make(scene, 3, props);
  const layered = make(scene);
  layered.forEach((mesh) => mesh.layers.set(1));
  const smallGroups = Array.from({ length: 2 }, () => {
    const group = new THREE.Group();
    scene.add(group);
    make(group, 2);
    return group;
  });
  const stats = batchStaticMeshes(scene);
  assert.equal(stats.batches, 8);
  assert.equal(stats.meshes, 24);
  assert.equal(stats.drawCallsSaved, 16);
  const batches = scene.children.filter((child) => child.isInstancedMesh);
  assert.equal(batches.length, 8);
  assert.ok(batches.every((batch) => batch.count === 3));
  for (const group of smallGroups)
    assert.equal(group.children.filter((child) => !child.isInstancedMesh).length, 2);
}

// Exclusions protect references used by animation, even through nested groups.
// Transparent, invisible, skinned, existing instanced and reflected meshes
// stay untouched because their rendering cannot safely use this static batch.
{
  const scene = new THREE.Scene();
  const keep = [];
  keep.push(...make(scene, 3, { material: new THREE.MeshStandardMaterial({ transparent: true }) }));
  keep.push(...make(scene, 3, { material: [material] }));
  keep.push(...make(scene, 3, { visible: false }));
  keep.push(...make(scene, 3, { material: new THREE.MeshStandardMaterial({ visible: false }) }));
  for (let i = 0; i < 3; i++) {
    const skin = new THREE.SkinnedMesh(geometry, material);
    const instances = new THREE.InstancedMesh(geometry, material, 2);
    scene.add(skin, instances);
    keep.push(skin, instances);
  }
  const mirrored = make(scene);
  mirrored.forEach((mesh) => mesh.scale.set(-1, 1, 1));
  keep.push(...mirrored);
  const parents = make(scene);
  for (const mesh of parents) mesh.add(new THREE.Object3D());
  keep.push(...parents);
  const hidden = new THREE.Group();
  hidden.visible = false;
  scene.add(hidden);
  const hiddenMeshes = make(hidden);
  const excludedGroup = new THREE.Group();
  const nested = new THREE.Group();
  excludedGroup.add(nested);
  scene.add(excludedGroup);
  const nestedMeshes = make(nested);
  const excludedMesh = make(scene, 1)[0];
  const untouched = make(scene, 2);
  const exclusions = new Set([excludedGroup, excludedMesh]);
  assert.deepEqual(batchStaticMeshes(scene, exclusions), {
    batches: 0,
    meshes: 0,
    drawCallsSaved: 0,
  });
  for (const mesh of [...keep, excludedMesh, ...untouched])
    assert.equal(mesh.parent, scene);
  assert.deepEqual(hidden.children, hiddenMeshes);
  assert.deepEqual(nested.children, nestedMeshes);
  assert.equal(excludedGroup.parent, scene);
  assert.equal(nested.parent, excludedGroup);
}

console.log("PASS: static batches preserve transforms, shadows, resources and exclusions");
