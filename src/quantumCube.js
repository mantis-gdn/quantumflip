import * as THREE from "three";

/**
 * QuantumCube
 * - 6 numbered faces (1–6) rendered as textures
 * - 90° step rotations
 * - Can report which face is on top
 * - NEW: animated emissive "cube lights" (colorful + pulsing)
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

// A consistent neon-ish palette (no hardcoding required later)
const FX = {
  baseEmissive: 0.22,     // idle glow baseline
  pulseAmount: 0.28,      // how much it pulses
  speed: 0.9,             // cycle speed
  saturation: 0.95,
  lightness: 0.55
};

export function createQuantumCube(size = 2) {
  const geometry = new THREE.BoxGeometry(size, size, size);

  // Materials must match BoxGeometry order: +X, -X, +Y, -Y, +Z, -Z
  const materials = FACE_DEFS.map(f => makeNumberMaterial(f.value));

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.userData.faces = FACE_DEFS;
  mesh.userData.materials = materials;

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

  /**
   * NEW: Animated “lights” baked into emissive.
   * Call this once per frame:
   *   cube.updateFX(performance.now() * 0.001, intensity)
   *
   * intensity examples:
   *   0.6 idle, 1.0 committing, 1.6 spinning, 0.3 settled
   */
  mesh.updateFX = (t, intensity = 0.8) => {
    const mats = mesh.userData.materials;
    if (!mats) return;

    // pulse 0..1
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.0);
    const emissiveStrength = FX.baseEmissive + FX.pulseAmount * pulse;
    const strength = emissiveStrength * intensity;

    // Cycle hue, then offset per face so cube looks “alive”
    for (let i = 0; i < mats.length; i++) {
      const m = mats[i];
      if (!m || !m.emissive) continue;

      const hue = (t * FX.speed * 0.12 + i * 0.14) % 1;
      m.emissive.setHSL(hue, FX.saturation, FX.lightness);
      m.emissiveIntensity = strength;
      m.needsUpdate = false; // no shader rebuild needed
    }
  };

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

  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.12,

    // NEW: emissive "internal lights"
    emissive: new THREE.Color("#00ffff"),
    emissiveIntensity: FX.baseEmissive
  });

  return mat;
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
