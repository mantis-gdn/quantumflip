import * as THREE from "three";

/**
 * QuantumCube
 * - 6 numbered faces (1–6) rendered as textures
 * - 90° step rotations
 * - Can report which face is on top
 */

const FACE_DEFS = [
  { value: 1, normal: new THREE.Vector3( 1, 0, 0) }, // +X
  { value: 2, normal: new THREE.Vector3(-1, 0, 0) }, // -X
  { value: 3, normal: new THREE.Vector3( 0, 1, 0) }, // +Y
  { value: 4, normal: new THREE.Vector3( 0,-1, 0) }, // -Y
  { value: 5, normal: new THREE.Vector3( 0, 0, 1) }, // +Z
  { value: 6, normal: new THREE.Vector3( 0, 0,-1) }  // -Z
];

const STEP = Math.PI / 2;

export function createQuantumCube(size = 2) {
  const geometry = new THREE.BoxGeometry(size, size, size);

  // Materials must match BoxGeometry order: +X, -X, +Y, -Y, +Z, -Z
  const materials = FACE_DEFS.map(f => makeNumberMaterial(f.value));

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.faces = FACE_DEFS;

  // Rotation helpers
  mesh.rotateXStep = (dir = 1) => rotateAxis(mesh, "x", dir);
  mesh.rotateYStep = (dir = 1) => rotateAxis(mesh, "y", dir);
  mesh.rotateZStep = (dir = 1) => rotateAxis(mesh, "z", dir);

  mesh.resetRotation = () => {
    mesh.rotation.set(0, 0, 0);
    mesh.quaternion.identity();
  };

  mesh.getTopFaceValue = () => getTopFace(mesh).value;
  mesh.getTopFace = () => getTopFace(mesh);

  return mesh;
}

function makeNumberMaterial(value) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Background (clean, slightly textured look)
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.lineWidth = 18;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.strokeRect(18, 18, size - 36, size - 36);

  // Big number
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 260px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(String(value), size / 2, size / 2 + 10);

  // Small label
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("QuantumFlip", size / 2, size - 52);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8; // helps clarity at angles

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.12
  });
}

function rotateAxis(mesh, axis, dir) {
  const q = new THREE.Quaternion();

  if (axis === "x") q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), STEP * dir);
  if (axis === "y") q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), STEP * dir);
  if (axis === "z") q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), STEP * dir);

  mesh.quaternion.multiply(q);
  mesh.quaternion.normalize();
}

function getTopFace(mesh) {
  const up = new THREE.Vector3(0, 1, 0);
  let best = null;
  let bestDot = -Infinity;

  for (const face of mesh.userData.faces) {
    const worldNormal = face.normal.clone().applyQuaternion(mesh.quaternion).normalize();
    const dot = worldNormal.dot(up);
    if (dot > bestDot) {
      bestDot = dot;
      best = face;
    }
  }
  return best;
}
