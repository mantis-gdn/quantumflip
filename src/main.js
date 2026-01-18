import * as THREE from "three";
import { createQuantumCube } from "./quantumCube.js";
import { createSoloGame } from "./gameSolo.js";

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

camera.position.set(0, 6, 0.001);
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
// Solo Game Logic (PRACTICE MODE DEFAULTS)
// --------------------
const game = createSoloGame({
  startingBankroll: 200,
  startingMinBet: 10,
  minBetIncrease: 5,
  roundsPerStep: 5
});

// --------------------
// HUD
// --------------------
const hud = document.createElement("div");
hud.style.position = "fixed";
hud.style.left = "12px";
hud.style.top = "12px";
hud.style.padding = "12px 16px";
hud.style.borderRadius = "12px";
hud.style.background = "rgba(0,0,0,0.55)";
hud.style.border = "1px solid rgba(255,255,255,0.15)";
hud.style.color = "#e6edf3";
hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
hud.style.fontWeight = "800";
hud.style.userSelect = "none";
hud.style.minWidth = "260px";
document.body.appendChild(hud);

// --------------------
// Playability toggles
// --------------------
let spinning = false;
let autoPlay = false;
let lastAutoPick = 1;

function updateHud() {
  const s = game.getState();

  const pick = s.lastPick ?? "—";
  const result = s.lastResult ?? "—";
  const outcome = s.lastOutcome ?? "—";

  // NOTE: practice mode assumes "inRoom" exists in state; if not, this still works
  const canAnte = s.bankroll >= s.minBet && s.inRoom !== false;

  const prompt =
    !canAnte ? "OUT OF FUNDS — start a new run (refresh or reset logic later)" :
    s.lastPick == null ? "Pick 1–6" :
    spinning ? "Spinning..." :
    "Press Space to spin";

  hud.innerHTML = `
    <div style="font-size:12px; opacity:0.7; letter-spacing:0.08em;">
      QUANTUMFLIP • PRACTICE
    </div>

    <div style="font-size:44px; line-height:1; margin-top:6px;">
      ${cube.getTopFaceValue()}
    </div>
    <div style="font-size:12px; opacity:0.7; margin-top:2px;">
      (top face)
    </div>

    <div style="margin-top:10px; font-size:14px; opacity:0.95; line-height:1.5;">
      Bankroll: <b>${s.bankroll}</b><br/>
      Min Bet: <b>${s.minBet}</b><br/>
      Jackpot: <b>${s.jackpot}</b><br/>
      Pick: <b>${pick}</b> • Result: <b>${result}</b> • Outcome: <b>${outcome}</b>
    </div>

    <div style="margin-top:10px; font-size:13px; opacity:0.8;">
      ${prompt}
    </div>

    <div style="margin-top:10px; font-size:12px; opacity:0.6; line-height:1.4;">
      Enter=New Round • 1–6=Pick • Space=Spin<br/>
      A=Auto (${autoPlay ? "ON" : "OFF"}) • R=Reset Cube
    </div>
  `;
}

updateHud();

// --------------------
// Controls
// --------------------
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  // Enter = new round (pays ante)
  if (k === "enter") {
    const res = game.startRound();
    if (!res.ok) console.log("Round start failed:", res.reason);
    updateHud();
    return;
  }

  // Pick 1..6
  if (["1", "2", "3", "4", "5", "6"].includes(e.key)) {
    lastAutoPick = Number(e.key);
    const res = game.pickNumber(lastAutoPick);
    if (!res.ok) console.log("Pick failed:", res.reason);
    updateHud();
    return;
  }

  // Space = spin + resolve
  if (k === " ") {
    quantumSpin(() => {
      const rolled = cube.getTopFaceValue();
      const res = game.resolve(rolled);
      if (!res.ok) console.log("Resolve failed:", res.reason);
      updateHud();
      if (autoPlay) setTimeout(runAutoLoop, 250);
    });
    return;
  }

  // A = auto-play toggle
  if (k === "a") {
    autoPlay = !autoPlay;
    updateHud();
    if (autoPlay) runAutoLoop();
    return;
  }

  // R = reset cube rotation (visual only)
  if (k === "r") {
    cube.resetRotation();
    updateHud();
    return;
  }
});

// --------------------
// Auto Loop (optional but engaging)
// --------------------
function runAutoLoop() {
  if (!autoPlay || spinning) return;

  const s = game.getState();

  // Can't pay ante? Stop.
  if (s.bankroll < s.minBet) {
    autoPlay = false;
    updateHud();
    return;
  }

  // If we haven't picked yet, start a round and pick the lastAutoPick
  if (s.lastPick == null) {
    const start = game.startRound();
    if (!start.ok) {
      autoPlay = false;
      updateHud();
      return;
    }
    game.pickNumber(lastAutoPick);
    updateHud();
  }

  // Spin + resolve, then loop again
  quantumSpin(() => {
    const rolled = cube.getTopFaceValue();
    game.resolve(rolled);
    updateHud();
    if (autoPlay) setTimeout(runAutoLoop, 250);
  });
}

// --------------------
// Quantum Spin
// --------------------
function quantumSpin(onDone) {
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
      if (typeof onDone === "function") onDone();
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
