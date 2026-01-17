import * as THREE from "three";
import { createQuantumCube } from "./quantumCube.js";

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

// --------------------
// Camera (TOP-DOWN POV)
// --------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

// Camera directly above cube
camera.position.set(0, 6, 0.001); // tiny Z offset avoids math edge cases
camera.lookAt(0, 0, 0);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --------------------
// Lights
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.85));

const light = new THREE.DirectionalLight(0xffffff, 1.1);
light.position.set(5, 10, 5);
scene.add(light);

// --------------------
// QuantumCube
// --------------------
const cube = createQuantumCube(2);
cube.position.set(0, 0, 0);
scene.add(cube);

// --------------------
// HUD
// --------------------
const hud = document.createElement("div");
hud.style.position = "fixed";
hud.style.left = "12px";
hud.style.top = "12px";
hud.style.padding = "10px 14px";
hud.style.borderRadius = "12px";
hud.style.background = "rgba(0,0,0,0.55)";
hud.style.border = "1px solid rgba(255,255,255,0.15)";
hud.style.color = "#e6edf3";
hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
hud.style.fontWeight = "700";
hud.style.userSelect = "none";
document.body.appendChild(hud);

function updateHud() {
  hud.textContent = `Top face: ${cube.getTopFaceValue()}`;
}
updateHud();

// --------------------
// Controls
// --------------------
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "x") cube.rotateXStep(+1);
  if (k === "y") cube.rotateYStep(+1);
  if (k === "z") cube.rotateZStep(+1);

  if (e.shiftKey && k === "x") cube.rotateXStep(-1);
  if (e.shiftKey && k === "y") cube.rotateYStep(-1);
  if (e.shiftKey && k === "z") cube.rotateZStep(-1);

  if (k === " ") quantumSpin();
  if (k === "r") cube.resetRotation();

  updateHud();
});

// --------------------
// Quantum Spin
// --------------------
let spinning = false;

function quantumSpin() {
  if (spinning) return;
  spinning = true;

  const steps = {
    x: Math.floor(Math.random() * 8) + 6,
    y: Math.floor(Math.random() * 8) + 6,
    z: Math.floor(Math.random() * 8) + 6
  };

  const order = ["x", "y", "z"];
  let i = 0;

  function stepOnce() {
    const axis = order[i % 3];
    const dir = Math.random() < 0.5 ? -1 : 1;

    if (axis === "x" && steps.x-- > 0) cube.rotateXStep(dir);
    if (axis === "y" && steps.y-- > 0) cube.rotateYStep(dir);
    if (axis === "z" && steps.z-- > 0) cube.rotateZStep(dir);

    updateHud();

    if (steps.x <= 0 && steps.y <= 0 && steps.z <= 0) {
      spinning = false;
      console.log("Resolved result:", cube.getTopFaceValue());
      return;
    }

    i++;
    const remaining = steps.x + steps.y + steps.z;
    const delay = Math.max(25, Math.min(120, 220 - remaining * 6));
    setTimeout(stepOnce, delay);
  }

  stepOnce();
}

// --------------------
// Render Loop
// --------------------
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// --------------------
// Resize Handling
// --------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
