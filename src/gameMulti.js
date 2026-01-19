// gameMulti.js
export function createMultiPlayerGame({
  players = ["P1", "P2"],
  startingBankroll = 200,
  startingMinBet = 10,
  minBetIncrease = 5,
  roundsPerStep = 5
} = {}) {
  const state = {
    players: players.map((name) => ({
      name,
      bankroll: startingBankroll,
      pick: null,
      committed: false
    })),

    minBet: startingMinBet,
    jackpot: 0,

    round: 0,
    roundActive: false,

    // results
    lastResult: null,
    lastOutcomes: [] // { name, pick, outcome }
  };

  // --------------------
  // Round control
  // --------------------
  function startRound() {
    if (state.roundActive) {
      return { ok: false, reason: "ROUND_ALREADY_ACTIVE" };
    }

    // all players must afford the min bet
    for (const p of state.players) {
      if (p.bankroll < state.minBet) {
        return { ok: false, reason: "PLAYER_BROKE", player: p.name };
      }
    }

    // ante up + reset picks
    for (const p of state.players) {
      p.bankroll -= state.minBet;
      p.pick = null;
      p.committed = false;
    }

    state.roundActive = true;
    state.lastOutcomes = [];
    return { ok: true };
  }

  // --------------------
  // Player pick
  // --------------------
  function pickNumber(playerIndex, n) {
    if (!state.roundActive) {
      return { ok: false, reason: "NO_ACTIVE_ROUND" };
    }
    if (
      !Number.isInteger(playerIndex) ||
      playerIndex < 0 ||
      playerIndex >= state.players.length
    ) {
      return { ok: false, reason: "INVALID_PLAYER" };
    }
    if (!Number.isInteger(n) || n < 1 || n > 6) {
      return { ok: false, reason: "INVALID_PICK" };
    }

    const p = state.players[playerIndex];
    if (p.committed) {
      return { ok: false, reason: "ALREADY_COMMITTED" };
    }

    p.pick = n;
    p.committed = true;

    const allCommitted = state.players.every((x) => x.committed);
    return { ok: true, allCommitted, lastCommitBy: p.name };
  }

  // --------------------
  // Resolve roll
  // --------------------
  function resolve(rolled) {
    if (!state.roundActive) {
      return { ok: false, reason: "NO_ACTIVE_ROUND" };
    }
    if (!Number.isInteger(rolled) || rolled < 1 || rolled > 6) {
      return { ok: false, reason: "INVALID_ROLL" };
    }

    if (!state.players.every((p) => p.committed && p.pick != null)) {
      return { ok: false, reason: "NOT_ALL_COMMITTED" };
    }

    state.lastResult = rolled;
    const bet = state.minBet;

    const winners = state.players.filter((p) => p.pick === rolled);

    state.lastOutcomes = state.players.map((p) => ({
      name: p.name,
      pick: p.pick,
      outcome: p.pick === rolled ? "WIN" : "MISS"
    }));

    if (winners.length > 0) {
      // ✅ split existing jackpot evenly
      const split = Math.floor(state.jackpot / winners.length);
      const remainder = state.jackpot - split * winners.length;

      for (const w of winners) {
        // bet back + share of jackpot
        w.bankroll += bet + split;
      }

      // keep remainder
      state.jackpot = remainder;
    } else {
      // no winners: pot grows by all antes
      state.jackpot += bet * state.players.length;
    }

    state.roundActive = false;
    state.round++;

    if (state.round % roundsPerStep === 0) {
      state.minBet += minBetIncrease;
    }

    return {
      ok: true,
      rolled,
      winners: winners.map((w) => w.name),
      jackpot: state.jackpot,
      minBet: state.minBet,
      round: state.round
    };
  }

  // --------------------
  // Reset
  // --------------------
  function reset() {
    state.players.forEach((p) => {
      p.bankroll = startingBankroll;
      p.pick = null;
      p.committed = false;
    });

    state.minBet = startingMinBet;
    state.jackpot = 0;

    state.round = 0;
    state.roundActive = false;

    state.lastResult = null;
    state.lastOutcomes = [];

    return { ok: true };
  }

  // --------------------
  // State access
  // --------------------
  function getState() {
    return {
      ...state,
      players: state.players.map((p) => ({ ...p }))
    };
  }

  return {
    startRound,
    pickNumber,
    resolve,
    reset,
    getState
  };
}
