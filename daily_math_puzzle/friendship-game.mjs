export const PEOPLE = 14;
export function neighbors(a, b, n = PEOPLE) {
    return a !== b && (Math.abs(a - b) === 1 || Math.abs(a - b) === n - 1);
}
export function initialState(n = PEOPLE) {
    if (!Number.isInteger(n) || n < 3 || n > PEOPLE) throw new RangeError('Invalid size');
    return { n, edges: Array.from({ length: n * n }, (_, k) => neighbors(Math.floor(k / n), k % n, n)), history: [] };
}
export function isFriend(state, a, b) { return state.edges[a * state.n + b]; }
export function toggleFriend(state, a, b) {
    if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < state.n) || a === b || neighbors(a, b, state.n)) return state;
    const edges = state.edges.slice();
    edges[a * state.n + b] = edges[b * state.n + a] = !isFriend(state, a, b);
    return { ...state, edges, history: [...state.history, state.edges] };
}
export function undo(state) {
    if (!state.history.length) return state;
    return { ...state, edges: state.history.at(-1), history: state.history.slice(0, -1) };
}
export function inspect(state) {
    const degrees = Array(state.n).fill(0);
    let pairs = 0;
    const emptyTriples = [];
    for (let a = 0; a < state.n; a++) {
        for (let b = a + 1; b < state.n; b++) {
            if (isFriend(state, a, b)) { pairs++; degrees[a]++; degrees[b]++; }
            for (let c = b + 1; c < state.n; c++) {
                if (!isFriend(state, a, b) && !isFriend(state, a, c) && !isFriend(state, b, c)) emptyTriples.push([a, b, c]);
            }
        }
    }
    const odd = degrees.filter(d => d % 2 === 1).length;
    return { degrees, pairs, odd, emptyTriples, complete: odd === state.n && emptyTriples.length === 0 };
}
