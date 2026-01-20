import * as THREE from "three";

/**
 * QuantumCube (Numbered, Single-Style)
 * - 6 numbered faces (1–6) rendered as textures
 * - All faces share the SAME dark-grey design language
 * - 90° step rotations
 * - Can report which face is on top
 * - Optional subtle single-color emissive pulse (uniform across all faces)
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

// Subtle, uniform glow tuning (single color, no hue cycling)
const FX = {
  baseEmissive: 0.10,  // idle glow
  pulseAmount: 0.08,   // gentle pulse
  speed: 0.9
};

export function createQuantumCube(size = 2) {
  const geometry = new THREE.BoxGeometry(size, size, size);

  // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z
  const materials = FACE_DEFS.map((f) => makeNumberMaterial(f.value));

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.faces = FACE_DEFS;
  mesh.userData.materials = materials;

  // Rotation helpers (90° steps)
  mesh.rotateXStep = (dir = 1) => rotateAxis(mesh, "x", dir);
  mesh.rotateYStep = (dir = 1) => rotateAxis(mesh, "y", dir);
  mesh.rotateZStep = (dir = 1) => rotateAxis(mesh, "z", dir);

  mesh.resetRotation = () => {
    mesh.rotation.set(0, 0, 0);
    mesh.quaternion.identity();
  };

  mesh.getTopFaceValue = () => getTopFace(mesh).value;
  mesh.getTopFace = () => getTopFace(mesh);

  /**
   * Optional: subtle uniform emissive pulse (same for all faces).
   * Call once per frame:
   *   cube.updateFX(performance.now() * 0.001, intensity)
   *
   * intensity examples:
   *   0.5 idle, 1.0 committing, 1.4 spinning, 0.25 settled
   */
  mesh.updateFX = (t, intensity = 0.8) => {
    const mats = mesh.userData.materials;
    if (!mats) return;

    const pulse = 0.5 + 0.5 * Math.sin(t * FX.speed * 2.0);
    const strength = (FX.baseEmissive + FX.pulseAmount * pulse) * intensity;

    for (const m of mats) {
      if (!m) continue;
      m.emissiveIntensity = strength;
    }
  };

  return mesh;
}

function makeNumberMaterial(value) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Dark-grey base (same on every face)
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(0, 0, size, size);

  // Inner panel (slightly darker)
  ctx.fillStyle = "#23272e";
  ctx.fillRect(24, 24, size - 48, size - 48);

  // Border
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.strokeRect(24, 24, size - 48, size - 48);

  // Big number (same style, different value)
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 260px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText(String(value), size / 2, size / 2 + 8);

  // Small label
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillText("QuantumFlip", size / 2, size - 54);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.62,
    metalness: 0.10,

    // Single-color emissive (no cycling)
    emissive: new THREE.Color("#3a3f46"),
    emissiveIntensity: FX.baseEmissive
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
