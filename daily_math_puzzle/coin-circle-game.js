(function (root) {
  'use strict';
  const PEOPLE = 9;
  const LIMIT = 5;
  const edges = Array.from({ length: PEOPLE }, (_, i) => [
    { from: i, to: (i + 1) % PEOPLE },
    { from: (i + 1) % PEOPLE, to: i },
  ]).flat();
  const equal = (a, b) => a && b && a.every((value, i) => value === b[i]);

  function deal(previous = [], rng = Math.random) {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const coins = Array.from({ length: PEOPLE }, (_, i) => i + 1);
      for (let i = coins.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [coins[i], coins[j]] = [coins[j], coins[i]];
      }
      if (!equal(coins, previous)) return coins;
    }
    return previous.slice(1).concat(previous[0]);
  }

  function create(coins = deal()) {
    if (coins.length !== PEOPLE || coins.some(n => !Number.isInteger(n) || n < 0)
        || coins.reduce((sum, n) => sum + n, 0) !== 45) {
      throw new Error('Expected nine nonnegative integer amounts totaling 45.');
    }
    return { coins: [...coins], selected: Array(18).fill(false), history: [] };
  }

  function inspect(state) {
    const outgoing = Array(PEOPLE).fill(0);
    const incoming = Array(PEOPLE).fill(0);
    edges.forEach(({ from, to }, i) => {
      if (state.selected[i]) { outgoing[from] += 1; incoming[to] += 1; }
    });
    const shortages = outgoing.map((n, i) => n > state.coins[i]);
    const complete = state.coins.every(n => n === 5);
    const ended = state.history.length >= LIMIT;
    return { outgoing, incoming, shortages, complete, ended,
      legal: !ended && !shortages.some(Boolean),
      selectedCount: state.selected.filter(Boolean).length };
  }

  function toggle(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= edges.length
        || state.history.length >= LIMIT) return state;
    const selected = [...state.selected];
    selected[index] = !selected[index];
    return { ...state, selected };
  }

  function advance(state) {
    const check = inspect(state);
    if (!check.legal) return state;
    return {
      coins: state.coins.map((n, i) => n - check.outgoing[i] + check.incoming[i]),
      selected: Array(18).fill(false),
      history: [...state.history, { coins: [...state.coins], selected: [...state.selected] }],
    };
  }

  function undo(state) {
    if (!state.history.length) return state;
    const previous = state.history[state.history.length - 1];
    return { coins: [...previous.coins], selected: [...previous.selected],
      history: state.history.slice(0, -1) };
  }

  const api = Object.freeze({ PEOPLE, LIMIT, edges, deal, create, inspect, toggle, advance, undo });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CoinCircleGame = api;
})(globalThis);
