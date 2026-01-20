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
  players: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"],
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
// Winning number history + Suggested Pick (+ Confidence + Streak)
// --------------------
const HISTORY_MAX = 24;
const winHistory = []; // newest first
let suggestedPick = null;

function recordWinNumber(n) {
  if (!Number.isInteger(n)) return;
  winHistory.unshift(n);
  if (winHistory.length > HISTORY_MAX) winHistory.length = HISTORY_MAX;
  suggestedPick = getSuggestedPick();
}

function formatHistory() {
  if (!winHistory.length) return "—";
  return winHistory
    .map(
      (n) => `
      <span style="
        display:inline-block;
        min-width:1.0em;
        text-align:center;
        font-size:18px;
        line-height:1;
        opacity:0.95;
      ">${n}</span>
    `
    )
    .join(`<span style="opacity:0.28;">&nbsp;•&nbsp;</span>`);
}

// --------------------
// Streak / confidence helpers
// --------------------
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function confidenceLabel(c) {
  if (c < 0.34) return "LOW";
  if (c < 0.67) return "MED";
  return "HIGH";
}

function getStreakInfo() {
  if (!winHistory.length) return { num: null, count: 0, label: "warming up…" };

  const first = winHistory[0];
  let count = 1;
  for (let i = 1; i < winHistory.length; i++) {
    if (winHistory[i] !== first) break;
    count++;
  }

  let label = "steady…";
  if (count === 2) label = `WARM • ${first} hit 2x`;
  if (count === 3) label = `HOT • ${first} hit 3x`;
  if (count >= 4) label = `DANGEROUS • ${first} hit ${count}x`;

  return { num: first, count, label };
}

function getSuggestedPick() {
  if (winHistory.length < 3) return randInt(1, 6);

  const N = Math.min(winHistory.length, HISTORY_MAX);
  const weights = [0, 0, 0, 0, 0, 0, 0]; // 1..6

  for (let i = 0; i < N; i++) {
    const n = winHistory[i];
    if (!Number.isInteger(n) || n < 1 || n > 6) continue;
    const w = 1 + (N - i) * 0.08;
    weights[n] += w;
  }

  const streak = getStreakInfo();
  if (streak.num && streak.count >= 2) {
    weights[streak.num] += streak.count * 0.35;
  }

  const mode = Math.random() < 0.55 ? "HOT" : "COLD";

  let pick = 1;
  if (mode === "HOT") {
    let max = -Infinity;
    for (let n = 1; n <= 6; n++) {
      if (weights[n] > max) {
        max = weights[n];
        pick = n;
      }
    }
  } else {
    let min = Infinity;
    for (let n = 1; n <= 6; n++) {
      if (weights[n] < min) {
        min = weights[n];
        pick = n;
      }
    }
  }

  if (Math.random() < 0.12) pick = randInt(1, 6);
  return pick;
}

function computeConfidenceForPick(pick) {
  if (!pick || winHistory.length < 3) return 0;

  const N = Math.min(winHistory.length, HISTORY_MAX);
  const weights = [0, 0, 0, 0, 0, 0, 0];

  for (let i = 0; i < N; i++) {
    const n = winHistory[i];
    if (!Number.isInteger(n) || n < 1 || n > 6) continue;
    const w = 1 + (N - i) * 0.08;
    weights[n] += w;
  }

  const streak = getStreakInfo();
  if (streak.num && streak.count >= 2) {
    weights[streak.num] += streak.count * 0.35;
  }

  const best = weights[pick] || 0;

  let second = 0;
  for (let n = 1; n <= 6; n++) {
    if (n === pick) continue;
    if (weights[n] > second) second = weights[n];
  }

  const dominance = best <= 0 ? 0 : (best - second) / Math.max(best, 1);
  const sampleBoost = Math.min(1, N / 10);
  return clamp01(dominance * 0.75 + sampleBoost * 0.25);
}

function suggestionTagline() {
  if (winHistory.length < 3) return "warming up…";
  return "house says it's next (allegedly)";
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
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
// Table HUD (top-left)
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

tableHud.style.overflow = "hidden";
document.body.appendChild(tableHud);

// --------------------
// PAYOUT OVERLAY (floats over Table HUD)
// --------------------
const tableOverlay = document.createElement("div");
tableOverlay.style.position = "absolute";
tableOverlay.style.left = "0";
tableOverlay.style.top = "0";
tableOverlay.style.right = "0";
tableOverlay.style.pointerEvents = "none";
tableOverlay.style.zIndex = "50";
tableOverlay.style.padding = "10px 12px";
tableOverlay.style.boxSizing = "border-box";
tableHud.appendChild(tableOverlay);

let payoutTimer = null;
let payoutLastSig = "";
let payoutShowing = false;

function showPayoutOverlay({ title, left, right, tone = "neutral" }) {
  const bg =
    tone === "win"
      ? "rgba(34,197,94,0.16)"
      : tone === "carry"
      ? "rgba(255,255,255,0.10)"
      : tone === "miss"
      ? "rgba(239,68,68,0.14)"
      : "rgba(255,255,255,0.10)";

  const border =
    tone === "win"
      ? "rgba(34,197,94,0.35)"
      : tone === "carry"
      ? "rgba(255,255,255,0.22)"
      : tone === "miss"
      ? "rgba(239,68,68,0.30)"
      : "rgba(255,255,255,0.22)";

  tableOverlay.innerHTML = `
    <div style="
      border-radius:14px;
      background:${bg};
      border:1px solid ${border};
      box-shadow: 0 10px 26px rgba(0,0,0,0.45);
      padding:10px 12px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      transform: translateY(${payoutShowing ? "0" : "-8px"});
      opacity:${payoutShowing ? "1" : "0"};
      transition: opacity 220ms ease, transform 220ms ease;
    ">
      <div style="min-width:0;">
        <div style="font-size:12px; opacity:0.75; letter-spacing:0.12em; text-transform:uppercase;">
          ${title}
        </div>
        <div style="margin-top:3px; font-size:18px; line-height:1.15; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${left}
        </div>
      </div>
      <div style="font-size:14px; opacity:0.85; white-space:nowrap; text-align:right;">
        ${right}
      </div>
    </div>
  `;

  payoutShowing = false;
  requestAnimationFrame(() => {
    payoutShowing = true;
    const card = tableOverlay.firstElementChild;
    if (card) {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }
  });

  if (payoutTimer) clearTimeout(payoutTimer);
  payoutTimer = setTimeout(() => {
    const card = tableOverlay.firstElementChild;
    if (card) {
      card.style.opacity = "0";
      card.style.transform = "translateY(-8px)";
    }
    payoutShowing = false;
    requestRender();
  }, 2400);

  requestRender();
}

// --------------------
// Player Grid (UPPER RIGHT, 2 columns)
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
// Player HUDs + outcome border memory
// --------------------
const playerHuds = [];
let lastTableSig = "";
const lastPlayerSig = [];
let spinning = false;
let hudLast = 0;

// ✅ remembers the latest outcome per player so we can color borders
const playerOutcome = []; // "WIN" | "MISS" | null

function setPlayerBorderFromOutcome(el, outcome) {
  const o = String(outcome || "").toUpperCase();
  if (o === "WIN") {
    el.style.border = "2px solid rgba(34,197,94,0.85)";
    el.style.boxShadow = "0 0 0 2px rgba(34,197,94,0.18)";
    return;
  }
  if (o === "MISS") {
    el.style.border = "2px solid rgba(239,68,68,0.85)";
    el.style.boxShadow = "0 0 0 2px rgba(239,68,68,0.14)";
    return;
  }
  // neutral
  el.style.border = "1px solid rgba(255,255,255,0.15)";
  el.style.boxShadow = "none";
}

function createPlayerHudCard(i) {
  const el = document.createElement("div");
  baseHudStyle(el);

  el.style.padding = "10px 12px";
  el.style.overflow = "hidden";
  el.style.pointerEvents = "auto";
  el.style.minWidth = "0";

  // start neutral
  setPlayerBorderFromOutcome(el, null);

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
    playerOutcome[playerHuds.length] = null;
    playerHuds.push(createPlayerHudCard(playerHuds.length));
  }
  while (playerHuds.length > playerCount) {
    const el = playerHuds.pop();
    playerOutcome.pop();
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

  // ✅ Reset this player's border as soon as they make the next pick
  playerOutcome[playerIndex] = null;
  const card = playerHuds[playerIndex];
  if (card) setPlayerBorderFromOutcome(card, null);

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
      recordWinNumber(rolled);

      const rr = game.resolve(rolled);
      if (!rr.ok) console.log("Resolve failed:", rr.reason);

      // ✅ After resolve, color player borders based on outcomes
      const s2 = game.getState();
      (s2.lastOutcomes || []).forEach((o) => {
        const idx = s2.players.findIndex((p) => p.name === o.name);
        const out = String(o.outcome || "").toUpperCase();
        if (idx >= 0) {
          playerOutcome[idx] = out === "WIN" ? "WIN" : out === "MISS" ? "MISS" : null;
          const el = playerHuds[idx];
          if (el) setPlayerBorderFromOutcome(el, playerOutcome[idx]);
        }
      });

      // ✅ Floating PAYOUT overlay (no layout shift)
      const winners = (s2.lastOutcomes || []).filter(
        (o) => String(o.outcome || "").toUpperCase() === "WIN"
      );
      const winnerNames = winners.map((w) => w.name);
      const sig = `${s2.round}|${s2.lastResult}|${winnerNames.join(",")}|${s2.jackpot}`;

      if (sig !== payoutLastSig) {
        payoutLastSig = sig;

        if (!winnerNames.length) {
          showPayoutOverlay({
            title: "PAYOUT",
            left: `Rolled ${s2.lastResult ?? rolled}`,
            right: "No winners • Pot carries",
            tone: "carry"
          });
        } else {
          const many = winnerNames.length > 2;
          showPayoutOverlay({
            title: "PAYOUT",
            left: `Rolled ${s2.lastResult ?? rolled} • Winner${winnerNames.length > 1 ? "s" : ""}: ${
              many ? `${winnerNames.length} players` : winnerNames.join(", ")
            }`,
            right: "Split pot",
            tone: "win"
          });
        }
      }

      updateAllHuds();
      requestRender();
    });
  }
}

// --------------------
// HUD Updates
// --------------------
function updateTableHud() {
  const s = game.getState();

  const allCommitted = s.roundActive ? s.players.every((p) => p.committed) : false;

  const hint = spinning
    ? "Spinning…"
    : (!s.roundActive
        ? "Tap a player's buttons to commit • Esc=Reset"
        : (allCommitted
            ? "All committed • spinning…"
            : "Tap buttons to commit picks"));

  const historyHtml = formatHistory();

  const sug = (suggestedPick ?? getSuggestedPick());
  const streak = getStreakInfo();
  const conf = computeConfidenceForPick(sug);
  const confPct = Math.round(conf * 100);
  const confText = (winHistory.length < 3) ? "—" : confidenceLabel(conf);

  const sig = [
    cube.getTopFaceValue(),
    spinning ? 1 : 0,
    s.roundActive ? 1 : 0,
    s.round,
    s.minBet,
    s.jackpot,
    s.lastResult ?? "-",
    winHistory.join(","),
    String(sug),
    String(confPct),
    streak.label
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

    <div style="
      margin-top:16px;
      padding-top:12px;
      border-top:1px solid rgba(255,255,255,0.14);
    ">
      <div style="display:flex; align-items:baseline; justify-content:space-between;">
        <div style="font-size:14px; opacity:0.75; letter-spacing:0.12em; text-transform:uppercase;">
          SUGGESTED PICK
        </div>
        <div style="font-size:12px; opacity:0.65;">
          Confidence: <b>${confText}</b> (${confPct}%)
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px;">
        <div style="font-size:12px; opacity:0.65;">
          ${streak.label}
        </div>

        <div style="
          font-size:54px;
          line-height:1;
          font-weight:1000;
          letter-spacing:0.10em;
          text-shadow: 0 0 18px rgba(255,255,255,0.12);
        ">
          ${sug}
        </div>
      </div>

      <div style="
        margin-top:10px;
        height:10px;
        border-radius:999px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.14);
        overflow:hidden;
      ">
        <div style="
          height:100%;
          width:${confPct}%;
          background: rgba(255,255,255,0.45);
        "></div>
      </div>

      <div style="font-size:12px; opacity:0.65; margin-top:8px;">
        ${suggestionTagline()}
      </div>
    </div>

    <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.14);">
      <div style="font-size:14px; opacity:0.75; letter-spacing:0.12em; text-transform:uppercase;">
        WINNING NUMBER HISTORY
      </div>
      <div style="
        font-size:18px;
        margin-top:10px;
        line-height:1.15;
        letter-spacing:0.04em;
        text-shadow: 0 0 16px rgba(255,255,255,0.10);
        white-space:normal;
        word-break:break-word;
      ">
        ${historyHtml}
      </div>
      <div style="font-size:12px; opacity:0.65; margin-top:8px;">
        Latest on the left • last ${HISTORY_MAX}
      </div>
    </div>

    <div style="margin-top:14px; font-size:14px; opacity:0.75;">
      ${hint}
    </div>
  `;

  // ✅ re-attach overlay after innerHTML rewrite
  tableHud.appendChild(tableOverlay);

  requestRender();
}

function updatePlayerHud(i) {
  const s = game.getState();
  const p = s.players[i];
  if (!p) return;

  const pick = p.committed ? p.pick : "—";

  const sig = [
    p.name,
    p.bankroll,
    pick,
    p.committed ? 1 : 0,
    s.roundActive ? 1 : 0,
    spinning ? 1 : 0,
    playerOutcome[i] || "-"
  ].join("|");

  if (lastPlayerSig[i] === sig) return;
  lastPlayerSig[i] = sig;

  const el = playerHuds[i];

  // ✅ border color reflects outcome (or neutral)
  setPlayerBorderFromOutcome(el, playerOutcome[i]);

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
      ${[1, 2, 3, 4, 5, 6]
        .map(
          (n) => `
        <button data-pick="${n}" style="${btnStyle}">
          ${n}
        </button>
      `
        )
        .join("")}
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
// Input - keep only Escape reset
// --------------------
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key === "Escape") {
    game.reset();
    spinning = false;
    lastTableSig = "";
    lastPlayerSig.length = 0;
    winHistory.length = 0;
    suggestedPick = null;

    payoutLastSig = "";
    if (payoutTimer) clearTimeout(payoutTimer);
    payoutTimer = null;
    tableOverlay.innerHTML = "";

    // ✅ clear outcome borders
    for (let i = 0; i < playerOutcome.length; i++) playerOutcome[i] = null;

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

    const turns = WILD_MS < 1300 ? 1 : Math.floor(Math.random() * 2) + 1;
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
