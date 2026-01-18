export function createSoloGame({
  startingBankroll = 100,
  startingMinBet = 20,
  minBetIncrease = 10,
  roundsPerStep = 3
} = {}) {
  const state = {
    bankroll: startingBankroll,
    minBet: startingMinBet,
    jackpot: 0,
    round: 0,
    inRoom: true, // false = booted to lobby
    lastPick: null,
    lastResult: null,
    lastOutcome: null // "WIN" | "MISS" | "BOOT"
  };

  function canAnte() {
    return state.bankroll >= state.minBet;
  }

  function startRound() {
    if (!state.inRoom) return { ok: false, reason: "BOOTED" };
    if (!canAnte()) {
      state.inRoom = false;
      state.lastOutcome = "BOOT";
      return { ok: false, reason: "INSUFFICIENT_FUNDS" };
    }

    // Pay ante into pot (pot is the single player's ante)
    state.bankroll -= state.minBet;

    // Advance round
    state.round += 1;

    // Escalation every N rounds IF still alive
    if (state.round % roundsPerStep === 0) {
      state.minBet += minBetIncrease;
    }

    // Waiting for player pick + cube result
    state.lastPick = null;
    state.lastResult = null;
    state.lastOutcome = null;

    return { ok: true, minBet: state.minBet, round: state.round };
  }

  function pickNumber(n) {
    if (!state.inRoom) return { ok: false, reason: "BOOTED" };
    const num = Number(n);
    if (!Number.isInteger(num) || num < 1 || num > 6) {
      return { ok: false, reason: "INVALID_PICK" };
    }
    state.lastPick = num;
    return { ok: true, pick: num };
  }

  /**
   * Resolve the round AFTER cube rolls.
   * @param {number} rolled - 1..6 from cube.getTopFaceValue()
   */
  function resolve(rolled) {
    if (!state.inRoom) return { ok: false, reason: "BOOTED" };
    const r = Number(rolled);
    if (!Number.isInteger(r) || r < 1 || r > 6) {
      return { ok: false, reason: "INVALID_ROLL" };
    }
    if (state.lastPick == null) return { ok: false, reason: "NO_PICK" };

    state.lastResult = r;

    const pot = state.minBet; // NOTE: the ante that was paid THIS round (fixed amount)
    // But: we already deducted minBet at startRound, so "pot" is just the amount at stake.
    // If win, player gets pot + jackpot.

    if (state.lastPick === r) {
      const winnings = pot + state.jackpot;
      state.bankroll += winnings;
      state.jackpot = 0;
      state.lastOutcome = "WIN";
      return { ok: true, outcome: "WIN", rolled: r, winnings, bankroll: state.bankroll, jackpot: state.jackpot };
    } else {
      state.jackpot += pot;
      state.lastOutcome = "MISS";
      return { ok: true, outcome: "MISS", rolled: r, bankroll: state.bankroll, jackpot: state.jackpot };
    }
  }

  function getState() {
    return structuredClone(state);
  }

  return { startRound, pickNumber, resolve, getState };
}
