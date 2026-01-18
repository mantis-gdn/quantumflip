import * as THREE from "three";
import { createQuantumCube } from "./quantumCube.js";
import { createSoloGame } from "./gameSolo.js";

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

// --------------------
// Camera (SLIGHT ANGLE, still top-dominant)
// --------------------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

// Corner-ish view: shows top + two side faces
camera.position.set(3.2, 5.2, 3.2);
camera.lookAt(0, 0, 0);

// --------------------
// Renderer (KEEP IT SIMPLE + STABLE)
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Safe color output so things don't look crushed
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// --------------------
// Lights (UPGRADED, SAFE)
// --------------------

// Ambient: lower than before so we get contrast (0.85 was flattening)
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// Key light: main form / readability
const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
keyLight.position.set(6, 10, 4);
scene.add(keyLight);

// Fill light: reduces harsh shadow on opposite side
const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
fillLight.position.set(-5, 4, -3);
scene.add(fillLight);

// Rim light: edge separation (subtle blue-ish tint)
const rimLight = new THREE.DirectionalLight(0x8ab4ff, 0.55);
rimLight.position.set(-7, 7, 7);
scene.add(rimLight);

// Stage glow: very subtle “table vibe”
const stageLight = new THREE.PointLight(0x2563eb, 0.35, 12);
stageLight.position.set(0, -1.4, 0);
scene.add(stageLight);

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

  // Game over when player cannot cover the min bet and isn't already in a paid round
  const gameOver = s.bankroll < s.minBet && inPlay === 0;

  const hint = gameOver
    ? "GAME OVER • Press R to restart"
    : (inPlay === 0
        ? "Pick 1–6 to ante + choose • Space = Spin"
        : "Pick 1–6 • Space = Spin");

  const banner = gameOver
    ? `
      <div style="
        margin-top:10px;
        padding:10px 12px;
        border-radius:12px;
        background: rgba(220,38,38,0.18);
        border: 1px solid rgba(220,38,38,0.35);
        font-size:12px;
        letter-spacing:0.08em;
        text-transform:uppercase;
      ">
        GAME OVER • Bankroll too low to cover Min Bet
      </div>
    `
    : "";

  hud.innerHTML = `
    <div style="font-size:12px; opacity:0.65; letter-spacing:0.08em;">
      QUANTUMFLIP • PRACTICE
    </div>
    ${banner}

    <div style="font-size:44px; line-height:1; margin-top:10px;">
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
  const key = e.key;
  const k = key.toLowerCase();

  // R = restart practice run (simple, reliable reset)
  if (k === "r") {
    window.location.reload();
    return;
  }

  // If game over, ignore everything else (HUD explains restart)
  const s0 = game.getState();
  const inPlay0 = s0.roundBet || 0;
  const gameOver = s0.bankroll < s0.minBet && inPlay0 === 0;
  if (gameOver) {
    updateHud();
    return;
  }

  // Pick number (this is when we pay ante if needed)
  if (["1", "2", "3", "4", "5", "6"].includes(key)) {
    const s = game.getState();

    // Start round ONLY when player picks (ante paid here)
    if ((s.roundBet || 0) === 0) {
      const start = game.startRound();
      if (!start.ok) {
        console.log("Can't start round:", start.reason);
        updateHud();
        return;
      }
    }

    game.pickNumber(Number(key));
    updateHud();
    return;
  }

  // Space = long smooth spin → resolve → clear pick only
  if (key === " ") {
    const s = game.getState();

    // Require a pick before allowing spin
    if (s.lastPick == null) {
      console.log("Pick a number first (1-6).");
      updateHud();
      return;
    }

    quantumSpinSmooth(() => {
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
    });

    return;
  }
});

// --------------------
// Long Smooth Spin (wild -> settle)
// --------------------
function quantumSpinSmooth(onDone) {
  if (spinning) return;
  spinning = true;

  // --- Tune these ---
  const WILD_MS = 1800;
  const SETTLE_MS = 1300;
  const SNAP_EVERY = Math.PI / 2;

  const sign = () => (Math.random() < 0.5 ? -1 : 1);

  // Velocities (radians/sec)
  let vx = (Math.random() * 14 + 18) * sign();
  let vy = (Math.random() * 14 + 18) * sign();
  let vz = (Math.random() * 14 + 18) * sign();

  const wobble = () => (Math.random() - 0.5) * 0.35;

  const t0 = performance.now();
  let last = t0;

  function wildPhase(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    vx += wobble();
    vy += wobble();
    vz += wobble();

    cube.rotation.x += vx * dt;
    cube.rotation.y += vy * dt;
    cube.rotation.z += vz * dt;

    updateHud();

    if (now - t0 < WILD_MS) {
      requestAnimationFrame(wildPhase);
      return;
    }

    settlePhase();
  }

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function snapAngle(a, step) {
    return Math.round(a / step) * step;
  }

  function settlePhase() {
    const start = {
      x: cube.rotation.x,
      y: cube.rotation.y,
      z: cube.rotation.z
    };

    const extraTurns = () =>
      (Math.floor(Math.random() * 2) + 1) * Math.PI * 2 * sign();

    const end = {
      x: snapAngle(start.x, SNAP_EVERY) + extraTurns(),
      y: snapAngle(start.y, SNAP_EVERY) + extraTurns(),
      z: snapAngle(start.z, SNAP_EVERY) + extraTurns()
    };

    const s0 = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - s0) / SETTLE_MS);
      const e = easeOutQuint(t);

      cube.rotation.x = start.x + (end.x - start.x) * e;
      cube.rotation.y = start.y + (end.y - start.y) * e;
      cube.rotation.z = start.z + (end.z - start.z) * e;

      updateHud();

      if (t < 1) {
        requestAnimationFrame(tick);
        return;
      }

      cube.rotation.x = snapAngle(cube.rotation.x, SNAP_EVERY);
      cube.rotation.y = snapAngle(cube.rotation.y, SNAP_EVERY);
      cube.rotation.z = snapAngle(cube.rotation.z, SNAP_EVERY);

      spinning = false;
      updateHud();
      if (typeof onDone === "function") onDone();
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(wildPhase);
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
