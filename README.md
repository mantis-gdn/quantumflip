# QuantumFlip

QuantumFlip is a multiplayer strategic betting game built around a **shared 3D rotating cube**.  
Players openly commit to numbers under escalating pressure, split or chase payouts, and manage bankroll survival as rounds progress.

Luck is transparent. Outcomes are fair.  
**Psychology, timing, and consensus behavior decide who actually wins.**

---

## Core Concept

- A single cube roll determines outcomes for all players
- Everyone sees the same physics, the same motion, the same result
- Players are not racing RNG — they are reacting to **each other**
- Consensus can be safe… or completely pointless

QuantumFlip rewards awareness, not superstition.

---

## Requirements

- **Node.js** (latest LTS recommended)
- **npm** (bundled with Node.js)
- A modern browser  
  (Chrome, Edge, or Firefox recommended)

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

Open that URL in your browser.

> IMPORTANT  
> Do **not** open `index.html` directly.  
> QuantumFlip uses ES modules and must be served by a dev server.

---

## How To Play (Current Build)

### Multiplayer Table

- Supports **up to 10 players**
- Each player has an independent HUD card
- Each HUD contains **buttons labeled 1–6**
- Players may choose the same number (consensus is allowed)

---

### Round Flow

1. Any player commits a number (1–6)
2. This **starts the round** and automatically antes all players
3. Each player commits **exactly one pick**
4. When **all players are committed**, the cube spins
5. The **top face** of the cube determines the winning number
6. The pot is **split evenly among all winners**
7. Bankrolls update and the next round begins

There is no hidden math and no late intervention.

---

## Controls

### Mouse / Touch
- Click number buttons on each player HUD

### Keyboard
- Keyboard input is **intentionally disabled**
- The game is designed for shared-table play

### Reset
- Press **ESC** to reset the table and bankrolls

---

## Bankroll & Payout Logic

- All players ante the same amount per round
- Winners split the pot evenly
- If **everyone chooses the same number and wins**, bankrolls remain unchanged
- Zero-volatility rounds are possible — by design

This creates natural tension between:
- Playing safe
- Chasing edge
- Breaking consensus

---

## Project Structure

Typical layout:

```
/src
  main.js           # App bootstrap
  quantumCube.js    # 3D cube + physics
  gameMulti.js      # Multiplayer round logic
index.html
package.json
README.md
```

---

## Performance Notes

QuantumFlip is optimized for laptop and integrated GPUs:

- Low-power WebGL preference
- Pixel ratio locked to 1
- Frame rate capped (~45 FPS)
- Render-on-demand instead of constant redraw

The cube feels physical without burning the machine.

---

## Design Philosophy

QuantumFlip does **not** fake randomness.

The cube’s motion is visible, shared, and deterministic once released.  
There are no hidden rolls, seeds, or probability boosts.

The tension comes from:
- Who commits first
- Who follows
- Who breaks
- And who survives when the ante rises

This is not a slot machine.  
It is a pressure experiment.
