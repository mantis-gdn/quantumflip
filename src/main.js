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
scene.add(cube);

// --------------------
// Solo Game Logic
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
hud.style.padding = "14px 18px";
hud.style.borderRadius = "14px";
hud.style.background = "rgba(0,0,0,0.55)";
hud.style.border = "1px solid rgba(255,255,255,0.15)";
hud.style.color = "#e6edf3";
hud.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
hud.style.fontWeight = "800";
hud.style.userSelect = "none";
hud.style.minWidth = "270px";
document.body.appendChild(hud);

// --------------------
// State
// --------------------
let spinning = false;

// --------------------
// HUD Update
// --------------------
function updateHud() {
  const s = game.getState();
  const inPlay = s.roundBet || 0;

  // Helpful hint when player hasn't paid ante yet
  const hint =
    inPlay === 0
      ? "Pick 1–6 to ante + choose • Space = Spin"
      : "Pick 1–6 • Space = Spin";

  hud.innerHTML = `
    <div style="font-size:12px; opacity:0.65; letter-spacing:0.08em;">
      QUANTUMFLIP • PRACTICE
    </div>

    <div style="font-size:44px; line-height:1; margin-top:6px;">
      ${cube.getTopFaceValue()}
    </div>
    <div style="font-size:12px; opacity:0.6; margin-top:2px;">
      (top face)
    </div>

    <div style="margin-top:10px; font-size:14px; line-height:1.5;">
      Bankroll: <b>${s.bankroll}</b><br/>
      Min Bet: <b>${s.minBet}</b><br/>
      In Play: <b>${inPlay}</b><br/>
      Jackpot: <b>${s.jackpot}</b>
    </div>

    <div style="margin-top:12px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
      <div style="font-size:12px; opacity:0.6; letter-spacing:0.06em;">
        LAST ROUND
      </div>
      <div style="font-size:14px; margin-top:4px;">
        Last Result: <b>${s.lastResult ?? "—"}</b><br/>
        Last Outcome: <b>${s.lastOutcome ?? "—"}</b>
      </div>
    </div>

    <div style="margin-top:12px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
      <div style="font-size:12px; opacity:0.6; letter-spacing:0.06em;">
        CURRENT PICK
      </div>
      <div style="font-size:16px; margin-top:4px;">
        ${s.lastPick ?? "—"}
      </div>
    </div>

    <div style="margin-top:10px; font-size:12px; opacity:0.6;">
      ${hint}
    </div>
  `;
}

updateHud();

// --------------------
// Controls
// --------------------
window.addEventListener("keydown", (e) => {
  const k = e.key;

  // Pick number (THIS is when we pay ante if needed)
  if (["1", "2", "3", "4", "5", "6"].includes(k)) {
    const s = game.getState();

    // Start round ONLY when player picks (ante paid here)
    if (s.roundBet === 0) {
      const start = game.startRound();
      if (!start.ok) {
        console.log("Can't start round:", start.reason);
        updateHud();
        return;
      }
    }

    game.pickNumber(Number(k));
    updateHud();
    return;
  }

  // Space = spin → resolve → clear pick only (DO NOT auto-ante next round)
  if (k === " ") {
    const s = game.getState();

    // Require a pick before allowing spin
    if (s.lastPick == null) {
      console.log("Pick a number first (1-6).");
      updateHud();
      return;
    }

    quantumSpin(() => {
      const rolled = cube.getTopFaceValue();
      const res = game.resolve(rolled);
      if (!res.ok) {
        console.log("Resolve failed:", res.reason);
        updateHud();
        return;
      }

      // Keep Last Result / Last Outcome up
      // Clear ONLY the pick after resolve
      game.clearPick();
      updateHud();

      // Next round will start when player picks again
    });

    return;
  }
});

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
