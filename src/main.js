import * as THREE from "three";
import { createQuantumCube } from "./quantumCube.js";
import { createMultiPlayerGame } from "./gameMulti.js";

// --------------------
// Hard stop page scrollbars
// --------------------
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

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

// --------------------
// Renderer (laptop-friendly)
// --------------------
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "low-power"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
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
cube.position.y = 0.25;
scene.add(cube);
camera.lookAt(0, cube.position.y, 0);

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
// Render scheduling (capped FPS + render-on-demand)
// --------------------
let needsRender = true;
let lastFrameTime = 0;
const FPS = 45;
const FRAME_MS = 1000 / FPS;

function requestRender() {
  needsRender = true;
}

// --------------------
// HUD styling helpers
// --------------------
function baseHudStyle(el) {
  el.style.padding = "12px 14px";
  el.style.borderRadius = "14px";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.border = "1px solid rgba(255,255,255,0.15)";
  el.style.color = "#e6edf3";
  el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  el.style.fontWeight = "800";
  el.style.userSelect = "none";
  el.style.backdropFilter = "blur(6px)";
  el.style.boxSizing = "border-box";
}

function makeBtnStyle() {
  return `
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:32px;
    height:28px;
    border-radius:10px;
    border:1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color:#e6edf3;
    font-weight:900;
    cursor:pointer;
    user-select:none;
    padding:0;
    box-sizing:border-box;
  `;
}

// --------------------
// Table HUD (top-left) - large + casino readable
// --------------------
const tableHud = document.createElement("div");
baseHudStyle(tableHud);
tableHud.style.position = "fixed";
tableHud.style.left = "12px";
tableHud.style.top = "12px";
tableHud.style.zIndex = "10";

tableHud.style.minWidth = "680px";
tableHud.style.maxWidth = "min(720px, calc(100vw - 24px))";
tableHud.style.padding = "22px 26px";
tableHud.style.borderRadius = "18px";

tableHud.style.fontSize = "20px";
tableHud.style.lineHeight = "1.35";
tableHud.style.letterSpacing = "0.02em";
tableHud.style.background = "rgba(0,0,0,0.74)";
tableHud.style.border = "1px solid rgba(255,255,255,0.22)";
tableHud.style.boxShadow =
  "0 14px 50px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.06)";

document.body.appendChild(tableHud);

// --------------------
// Player Grid (UPPER RIGHT, 2x3)
// --------------------
const playerGrid = document.createElement("div");
playerGrid.style.position = "fixed";
playerGrid.style.right = "12px";
playerGrid.style.top = "12px";
playerGrid.style.zIndex = "10";
playerGrid.style.pointerEvents = "auto";
playerGrid.style.display = "grid";
playerGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
playerGrid.style.gridAutoRows = "auto";
playerGrid.style.gap = "10px";

playerGrid.style.width = "min(720px, calc(100vw - 760px - 36px))";
playerGrid.style.maxHeight = "calc(100vh - 24px)";
playerGrid.style.overflow = "hidden";

document.body.appendChild(playerGrid);

// --------------------
// Player HUDs
// --------------------
const playerHuds = [];
let lastTableSig = "";
const lastPlayerSig = [];
let spinning = false;
let hudLast = 0;

function createPlayerHudCard(i) {
  const el = document.createElement("div");
  baseHudStyle(el);

  el.style.padding = "10px 12px";
  el.style.overflow = "hidden";
  el.style.pointerEvents = "auto";
  el.style.minWidth = "0";

  // ✅ NO blue active border / glow (removed entirely)
  el.style.boxShadow = "none";
  el.style.border = "1px solid rgba(255,255,255,0.15)";

  playerGrid.appendChild(el);

  el.addEventListener("click", (evt) => {
    const btn = evt.target.closest("button[data-pick]");
    if (!btn) return;
    const n = Number(btn.dataset.pick);
    if (!Number.isInteger(n)) return;
    commitPickForPlayer(i, n);
  });

  return el;
}

function rebuildPlayerHudsIfNeeded(playerCount) {
  while (playerHuds.length < playerCount) {
    playerHuds.push(createPlayerHudCard(playerHuds.length));
  }
  while (playerHuds.length > playerCount) {
    const el = playerHuds.pop();
    el.remove();
  }

  const rows = Math.ceil(playerCount / 2);
  playerGrid.style.gridTemplateRows = `repeat(${Math.max(rows, 1)}, auto)`;
}

// --------------------
// Commit pick for a player (BUTTONS ONLY)
// --------------------
function commitPickForPlayer(playerIndex, pickNum) {
  if (spinning) return;

  const s = game.getState();

  // First commit starts the round (antes everyone)
  if (!s.roundActive) {
    const start = game.startRound();
    if (!start.ok) {
      console.log(
        "Can't start round:",
        start.reason,
        start.player ? `(${start.player})` : ""
      );
      updateAllHuds();
      return;
    }
  }

  const res = game.pickNumber(playerIndex, pickNum);
  if (!res.ok) {
    console.log("Pick rejected:", res.reason);
    updateAllHuds();
    return;
  }

  updateAllHuds();

  // Last committer triggers spin
  if (res.allCommitted) {
    quantumSpinSmooth(() => {
      const rolled = cube.getTopFaceValue();
      const rr = game.resolve(rolled);
      if (!rr.ok) console.log("Resolve failed:", rr.reason);
      updateAllHuds();
      requestRender();
    });
  }
}

// --------------------
// HUD Updates
// --------------------
function colorOutcome(outcome) {
  const o = String(outcome || "").toUpperCase();
  if (o === "WIN") return `<span style="color:#22c55e;">WIN</span>`;
  if (o === "MISS") return `<span style="color:#ef4444;">MISS</span>`;
  return outcome ?? "—";
}

function updateTableHud() {
  const s = game.getState();

  const allCommitted = s.roundActive ? s.players.every((p) => p.committed) : false;

  // ✅ No keyboard hint anymore (buttons only)
  const hint = spinning
    ? "Spinning…"
    : (!s.roundActive
        ? "Tap a player's buttons to commit • Esc=Reset"
        : (allCommitted
            ? "All committed • spinning…"
            : "Tap buttons to commit picks"));

  const lastOutcomes = (s.lastOutcomes && s.lastOutcomes.length)
    ? s.lastOutcomes
        .map((o) => `${o.name}: ${o.pick} → ${colorOutcome(o.outcome)}`)
        .join("<br/>")
    : "—";

  const sig = [
    cube.getTopFaceValue(),
    spinning ? 1 : 0,
    s.roundActive ? 1 : 0,
    s.round,
    s.minBet,
    s.jackpot,
    s.lastResult ?? "-",
    lastOutcomes
  ].join("|");

  if (sig === lastTableSig) return;
  lastTableSig = sig;

  tableHud.innerHTML = `
    <div style="font-size:14px; opacity:0.75; letter-spacing:0.14em; text-transform:uppercase;">
      QUANTUMFLIP • MULTI (TABLE)
    </div>

    <div style="
      font-size:84px;
      line-height:1;
      margin-top:10px;
      text-shadow: 0 0 18px rgba(255,255,255,0.18);
    ">
      ${cube.getTopFaceValue()}
    </div>
    <div style="font-size:14px; opacity:0.75; margin-top:2px;">
      (top face)
    </div>

    <div style="margin-top:14px; font-size:22px; line-height:1.45;">
      Min Bet: <b>${s.minBet}</b><br/>
      Jackpot: <b>${s.jackpot}</b><br/>
      Round: <b>${s.round}</b><br/>
      Round Active: <b>${s.roundActive ? "YES" : "NO"}</b>
    </div>

    <div style="margin-top:16px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.14);">
      <div style="font-size:14px; opacity:0.75; letter-spacing:0.12em; text-transform:uppercase;">
        LAST RESULT
      </div>
      <div style="font-size:20px; margin-top:8px;">
        Rolled: <b>${s.lastResult ?? "—"}</b><br/>
        ${lastOutcomes}
      </div>
    </div>

    <div style="margin-top:14px; font-size:14px; opacity:0.75;">
      ${hint}
    </div>
  `;

  requestRender();
}

function updatePlayerHud(i) {
  const s = game.getState();
  const p = s.players[i];
  if (!p) return;

  const pick = p.committed ? p.pick : "—";

  const sig = [
    p.name, p.bankroll, pick, p.committed ? 1 : 0, s.roundActive ? 1 : 0, spinning ? 1 : 0
  ].join("|");

  if (lastPlayerSig[i] === sig) return;
  lastPlayerSig[i] = sig;

  const el = playerHuds[i];

  // ✅ Always neutral border (no active highlight)
  el.style.boxShadow = "none";
  el.style.border = "1px solid rgba(255,255,255,0.15)";

  const btnStyle = makeBtnStyle();
  const btnOpacity = p.committed ? "0.55" : "1";

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:baseline;">
      <div style="font-size:13px; letter-spacing:0.06em;">
        <b>${p.name}</b>
      </div>
      <div style="font-size:12px; opacity:0.65;">
        ${p.committed ? "committed" : "waiting"}
      </div>
    </div>

    <div style="margin-top:6px; font-size:14px; line-height:1.35;">
      Bankroll: <b>$${p.bankroll}</b><br/>
      Pick: <b>${pick}</b>
    </div>

    <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; opacity:${btnOpacity};">
      ${[1,2,3,4,5,6].map(n => `
        <button data-pick="${n}" style="${btnStyle}">
          ${n}
        </button>
      `).join("")}
    </div>
  `;

  requestRender();
}

function updateAllHuds() {
  const s = game.getState();
  rebuildPlayerHudsIfNeeded(s.players.length);

  updateTableHud();
  for (let i = 0; i < s.players.length; i++) updatePlayerHud(i);
}

function updateHudsThrottled(now = performance.now()) {
  if (!spinning) return updateAllHuds();
  if (now - hudLast > 90) {
    hudLast = now;
    updateAllHuds();
  }
}

updateAllHuds();

// --------------------
// Input (BUTTONS ONLY) - keep only Escape reset
// --------------------
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key === "Escape") {
    game.reset();
    spinning = false;
    lastTableSig = "";
    lastPlayerSig.length = 0;
    updateAllHuds();
    requestRender();
  }
});

// --------------------
// Spin with VARIABLE TIMING
// --------------------
function quantumSpinSmooth(onDone) {
  if (spinning) return;
  spinning = true;
  requestRender();

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

    requestRender();
    updateHudsThrottled(now);

    if (now - t0 < WILD_MS) return requestAnimationFrame(wildPhase);
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

      requestRender();
      updateHudsThrottled(now);

      if (t < 1) return requestAnimationFrame(tick);

      cube.rotation.x = snapAngle(cube.rotation.x, SNAP_EVERY);
      cube.rotation.y = snapAngle(cube.rotation.y, SNAP_EVERY);
      cube.rotation.z = snapAngle(cube.rotation.z, SNAP_EVERY);

      cube.rotation.order = "XYZ";
      cube.rotation.x = norm2pi(cube.rotation.x);
      cube.rotation.y = norm2pi(cube.rotation.y);
      cube.rotation.z = norm2pi(cube.rotation.z);

      spinning = false;
      updateAllHuds();
      requestRender();
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
// Render Loop (capped + on-demand)
// --------------------
function animate(now = 0) {
  if (needsRender && now - lastFrameTime >= FRAME_MS) {
    renderer.render(scene, camera);
    lastFrameTime = now;
    needsRender = false;
  }
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
  renderer.setPixelRatio(1);
  requestRender();
  updateAllHuds();
});
