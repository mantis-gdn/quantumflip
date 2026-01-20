# QuantumFlip

QuantumFlip is a multiplayer strategic betting game built around a 3D rotating cube. Players openly choose numbers under escalating pressure, share or chase payouts, and manage bankroll survival as the ante rises. Luck is fixed, outcomes are fair — but psychology and timing decide who wins.

---

## Requirements

- **Node.js** (recommended: latest LTS)
- **npm** (comes with Node.js)
- A modern browser (Chrome, Edge, or Firefox recommended)

---

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/quantumflip.git
cd quantumflip
```

2. **Install dependencies**
```bash
npm install
```

---

## Running the Game (Development)

Start the local development server:

```bash
npm run dev
```

Your terminal will output a local URL, typically:

```
http://localhost:5173
```

Open that URL in your browser to play.

> IMPORTANT  
> Do NOT open `index.html` directly in the browser.  
> The game uses ES modules and must be served by a dev server.

---

## How To Play (Current Build)

### Multiplayer Table (Local)

- Supports **up to 6 players**
- Each player has their own HUD card
- Each HUD contains **buttons labeled 1–6**

### Round Flow

1. Any player clicks a number button (1–6)
2. This **starts the round** and automatically antes all players
3. Each player commits exactly one number
4. When **all players have committed**, the cube spins automatically
5. The top face determines the outcome
6. The pot is split fairly among all winning players

---

## Controls

### Mouse / Touch
- Click the **number buttons** on a player’s HUD to commit a pick

### Keyboard
- Keyboard input is **intentionally disabled** in the current version  
  (shared-table, button-driven design)

### Reset
- Press **ESC** to reset the table and start fresh

---

## Project Structure

Typical layout:

```
/src
  main.js
  quantumCube.js
  gameMulti.js
index.html
package.json
README.md
```

---

## Performance Notes (Laptop Friendly)

QuantumFlip is tuned to avoid excessive GPU load:

- Renderer uses `powerPreference: "low-power"`
- Pixel ratio forced to `1`
- Render loop capped (~45 FPS)
- Render-on-demand instead of constant redraws

---

## Philosophy

QuantumFlip does **not** fake randomness.

The cube’s motion is physical, visible, and shared.  
Once the cube settles, the outcome is deterministic —  
the tension comes from **when** and **how** players commit.
