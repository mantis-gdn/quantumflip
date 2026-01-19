export function createSoloGame({
  startingBankroll = 200,
  startingMinBet = 10,
  minBetIncrease = 5,
  roundsPerStep = 5
} = {}) {
  const state = {
    bankroll: startingBankroll,
    minBet: startingMinBet,
    jackpot: 0,

    round: 0,
    roundBet: 0,

    // Current round pick (lockable)
    lastPick: null,
    pickLocked: false,

    // Persist until next resolve overwrites them
    lastResult: null,
    lastOutcome: null
  };

  function startRound() {
    if (state.roundBet > 0) return { ok: false, reason: "ROUND_ALREADY_ACTIVE" };
    if (state.bankroll < state.minBet) return { ok: false, reason: "INSUFFICIENT_FUNDS" };

    state.roundBet = state.minBet;
    state.bankroll -= state.roundBet;

    // NEW ROUND clears ONLY the pick + lock state
    state.lastPick = null;
    state.pickLocked = false;

    return { ok: true };
  }

  function beginNextRound() {
    return startRound();
  }

  function clearPick() {
    // keep this for HUD cleanup, but do NOT unlock mid-round
    state.lastPick = null;
  }

  function lockPick() {
    state.pickLocked = true;
    return { ok: true };
  }

  function pickNumber(n) {
    if (state.roundBet === 0) return { ok: false, reason: "NO_ACTIVE_ROUND" };
    if (!Number.isInteger(n) || n < 1 || n > 6) return { ok: false, reason: "INVALID_PICK" };

    // once locked, no changes allowed (prevents "spin cheating")
    if (state.pickLocked) return { ok: false, reason: "PICK_LOCKED" };

    state.lastPick = n;
    return { ok: true };
  }

  function resolve(rolled) {
    if (state.roundBet === 0) return { ok: false, reason: "NO_ACTIVE_ROUND" };
    if (state.lastPick == null) return { ok: false, reason: "NO_PICK" };
    if (!Number.isInteger(rolled) || rolled < 1 || rolled > 6) return { ok: false, reason: "INVALID_ROLL" };

    // resolving finalizes the round
    state.pickLocked = true;

    state.lastResult = rolled;
    const bet = state.roundBet;

    if (rolled === state.lastPick) {
      state.bankroll += bet + state.jackpot;
      state.jackpot = 0;
      state.lastOutcome = "WIN";
    } else {
      state.jackpot += bet;
      state.lastOutcome = "MISS";
    }

    state.roundBet = 0;
    state.round++;

    if (state.round % roundsPerStep === 0) {
      state.minBet += minBetIncrease;
    }

    // unlock for next round (since roundBet is now 0, this is safe)
    state.pickLocked = false;

    return {
      ok: true,
      outcome: state.lastOutcome,
      rolled,
      bankroll: state.bankroll,
      jackpot: state.jackpot,
      minBet: state.minBet,
      round: state.round
    };
  }

  function reset() {
    state.bankroll = startingBankroll;
    state.minBet = startingMinBet;
    state.jackpot = 0;

    state.round = 0;
    state.roundBet = 0;

    state.lastPick = null;
    state.pickLocked = false;

    state.lastResult = null;
    state.lastOutcome = null;

    return { ok: true };
  }

  function getState() {
    return { ...state };
  }

  return {
    startRound,
    beginNextRound,
    clearPick,
    lockPick,
    pickNumber,
    resolve,
    reset,
    getState
  };
}
