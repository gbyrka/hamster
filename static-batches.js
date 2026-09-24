import { InstancedMesh } from "./vendor/three.module.js";

// Call once after building the static scenery. Animated groups may still move,
// but individual meshes that need later updates must be explicitly excluded.
export function batchStaticMeshes(root, exclusions = new Set()) {
  const stats = { batches: 0, meshes: 0, drawCallsSaved: 0 };

  function visit(parent) {
    if (!parent.visible || exclusions.has(parent)) return;
    const groups = new Map();
    for (const child of [...parent.children]) {
      if (!child.visible || exclusions.has(child)) continue;
      if (child.isGroup) visit(child);
      if (
        !child.isMesh ||
        child.isInstancedMesh ||
        child.isSkinnedMesh ||
        child.children.length ||
        child.morphTargetInfluences ||
        child.customDepthMaterial ||
        child.customDistanceMaterial ||
        Array.isArray(child.material) ||
        !child.material ||
        child.material.transparent ||
        !child.material.visible
      )
        continue;
      if (child.matrixAutoUpdate) child.updateMatrix();
      // InstancedMesh cannot render reflected instance transforms correctly.
      if (child.matrix.determinant() <= 0) continue;
      const key = [
        child.geometry.id,
        child.material.id,
        child.castShadow,
        child.receiveShadow,
        child.renderOrder,
        child.layers.mask,
        child.frustumCulled,
      ].join(":");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(child);
    }
    for (const meshes of groups.values()) {
      if (meshes.length < 3) continue;
      const first = meshes[0];
      const batch = new InstancedMesh(
        first.geometry,
        first.material,
        meshes.length
      );
      batch.name = "Static scenery batch";
      batch.castShadow = first.castShadow;
      batch.receiveShadow = first.receiveShadow;
      batch.renderOrder = first.renderOrder;
      batch.layers.mask = first.layers.mask;
      batch.frustumCulled = first.frustumCulled;
      for (let i = 0; i < meshes.length; i++) {
        batch.setMatrixAt(i, meshes[i].matrix);
        parent.remove(meshes[i]);
      }
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      parent.add(batch);
      stats.batches++;
      stats.meshes += meshes.length;
      stats.drawCallsSaved += meshes.length - 1;
    }
  }

  visit(root);
  return stats;
}
