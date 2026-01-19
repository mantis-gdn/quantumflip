import * as THREE from "three";
import { createQuantumCube } from "./quantumCube.js";
import { createMultiPlayerGame } from "./gameMulti.js";

// --------------------
// Scene
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

// --------------------
// Camera
// --------------------
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(3.2, 5.2, 3.2);
camera.lookAt(0, 0, 0);

// --------------------
// Renderer
// --------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --------------------
// Lights
// --------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
keyLight.position.set(6, 10, 4);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
fillLight.position.set(-5, 4, -3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x8ab4ff, 0.55);
rimLight.position.set(-7, 7, 7);
scene.add(rimLight);

const stageLight = new THREE.PointLight(0x2563eb, 0.35, 12);
stageLight.position.set(0, -1.4, 0);
scene.add(stageLight);

// --------------------
// QuantumCube
// --------------------
const cube = createQuantumCube(2);
scene.add(cube);

// --------------------
// Multiplayer Game
// --------------------
const game = createMultiPlayerGame({
  players: ["P1", "P2"],
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
hud.style.minWidth = "320px";
document.body.appendChild(hud);

// --------------------
// State
// --------------------
let spinning = false;
let hudLast = 0;

// which player is currently “holding the controller”
let activePickerIndex = 0; // 0=P1, 1=P2

// --------------------
// HUD
// --------------------
function updateHud() {
  const s = game.getState();

  const activeName = s.players?.[activePickerIndex]?.name ?? "—";

  const allCommitted = s.roundActive
    ? s.players.every((p) => p.committed)
    : false;

  const hint = spinning
    ? "Spinning…"
    : (!s.roundActive
        ? "Press 1–6 to start round + commit • Q=P1 W=P2"
        : (allCommitted
            ? "All committed • spinning…"
            : "Commit picks • Q=P1 W=P2 • 1–6"));

  const playersHtml = s.players.map((p, i) => {
    const isActive = i === activePickerIndex;
    const pick = p.committed ? p.pick : "—";
    const tag = isActive ? " (active)" : "";
    return `
      <div style="margin-top:6px;">
        <b>${p.name}${tag}</b> • $${p.bankroll} • Pick: <b>${pick}</b>
      </div>
    `;
  }).join("");

  const lastOutcomes = (s.lastOutcomes && s.lastOutcomes.length)
    ? s.lastOutcomes.map((o) =>
        `${o.name}: ${o.pick} → ${o.outcome}`
      ).join("<br/>")
    : "—";

  hud.innerHTML = `
    <div style="font-size:12px; opacity:0.65; letter-spacing:0.08em;">
      QUANTUMFLIP • MULTI
    </div>

    <div style="font-size:44px; line-height:1; margin-top:10px;">
      ${cube.getTopFaceValue()}
    </div>
    <div style="font-size:12px; opacity:0.6; margin-top:2px;">
      (top face)
    </div>

    <div style="margin-top:10px; font-size:14px; line-height:1.5;">
      Active Picker: <b>${activeName}</b><br/>
      Min Bet: <b>${s.minBet}</b><br/>
      Jackpot: <b>${s.jackpot}</b><br/>
      Round: <b>${s.round}</b><br/>
      Round Active: <b>${s.roundActive ? "YES" : "NO"}</b>
    </div>

    <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
      <div style="font-size:12px; opacity:0.6; letter-spacing:0.06em;">
        PLAYERS
      </div>
      ${playersHtml}
    </div>

    <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
      <div style="font-size:12px; opacity:0.6; letter-spacing:0.06em;">
        LAST RESULT
      </div>
      <div style="font-size:14px; margin-top:4px;">
        Rolled: <b>${s.lastResult ?? "—"}</b><br/>
        ${lastOutcomes}
      </div>
    </div>

    <div style="margin-top:10px; font-size:12px; opacity:0.6;">
      ${hint}
    </div>
  `;
}

function updateHudThrottled(now = performance.now()) {
  if (!spinning) return updateHud();
  if (now - hudLast > 50) {
    hudLast = now;
    updateHud();
  }
}

updateHud();

// --------------------
// Input
// --------------------
window.addEventListener("keydown", (e) => {
  const key = e.key;
  const k = key.toLowerCase();

  // prevent scroll for gameplay keys
  if (key === " " || ["1", "2", "3", "4", "5", "6"].includes(key)) {
    e.preventDefault();
  }
  if (e.repeat) return;

  // reset
  if (k === "r") {
    game.reset();
    spinning = false;
    activePickerIndex = 0;
    updateHud();
    return;
  }

  // select active player (Q/W for P1/P2)
  if (k === "q") { activePickerIndex = 0; updateHud(); return; }
  if (k === "w") { activePickerIndex = 1; updateHud(); return; }

  // no inputs during spin
  if (spinning) return;

  // commit pick
  if (["1", "2", "3", "4", "5", "6"].includes(key)) {
    const s = game.getState();

    // first pick of a round auto-starts the round (antes everyone)
    if (!s.roundActive) {
      const start = game.startRound();
      if (!start.ok) {
        console.log("Can't start round:", start.reason, start.player ? `(${start.player})` : "");
        updateHud();
        return;
      }
    }

    const pickNum = Number(key);
    const res = game.pickNumber(activePickerIndex, pickNum);
    if (!res.ok) {
      console.log("Pick rejected:", res.reason);
      updateHud();
      return;
    }

    updateHud();

    // ✅ if that was the last commit, spin immediately
    if (res.allCommitted) {
      quantumSpinSmooth(() => {
        const rolled = cube.getTopFaceValue();
        const rr = game.resolve(rolled);
        if (!rr.ok) console.log("Resolve failed:", rr.reason);
        updateHud();
      });
    }

    return;
  }

  // Space does nothing in this mode (spin is automatic on last commit)
  if (key === " ") {
    console.log("Multiplayer: spin happens automatically when all players commit.");
    updateHud();
  }
});

// --------------------
// Spin with VARIABLE TIMING
// --------------------
function quantumSpinSmooth(onDone) {
  if (spinning) return;
  spinning = true;

  const SNAP_EVERY = Math.PI / 2;

  const WILD_MS = randInt(1000, 2000);
  const SETTLE_MS = clampInt(
    Math.round(WILD_MS * randFloat(0.55, 0.9) + randInt(-120, 160)),
    700,
    1800
  );

  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const energy = randFloat(0.9, 1.15) * (WILD_MS / 1600);

  let vx = (Math.random() * 14 + 18) * sign() * energy;
  let vy = (Math.random() * 14 + 18) * sign() * energy;
  let vz = (Math.random() * 14 + 18) * sign() * energy;

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

    updateHudThrottled(now);

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

  function norm2pi(a) {
    const m = Math.PI * 2;
    return ((a % m) + m) % m;
  }

  function settlePhase() {
    const start = { x: cube.rotation.x, y: cube.rotation.y, z: cube.rotation.z };

    const turns = WILD_MS < 1300 ? 1 : (Math.floor(Math.random() * 2) + 1);
    const extraTurns = () => turns * Math.PI * 2 * sign();

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

      updateHudThrottled(now);

      if (t < 1) return requestAnimationFrame(tick);

      cube.rotation.x = snapAngle(cube.rotation.x, SNAP_EVERY);
      cube.rotation.y = snapAngle(cube.rotation.y, SNAP_EVERY);
      cube.rotation.z = snapAngle(cube.rotation.z, SNAP_EVERY);

      cube.rotation.order = "XYZ";
      cube.rotation.x = norm2pi(cube.rotation.x);
      cube.rotation.y = norm2pi(cube.rotation.y);
      cube.rotation.z = norm2pi(cube.rotation.z);

      spinning = false;
      updateHud();
      if (typeof onDone === "function") onDone();
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(wildPhase);

  function randFloat(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
  function clampInt(v, min, max) { return Math.max(min, Math.min(max, v)); }
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
