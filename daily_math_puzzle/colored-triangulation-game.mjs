export const edgeKey = (a, b) => a < b ? `${a},${b}` : `${b},${a}`;
export const boundary = (m, a, b) => Math.abs(a - b) === 1 || Math.abs(a - b) === m - 1;
export function crosses(a, b, c, d) {
    if (a === c || a === d || b === c || b === d) return false;
    if (a > b) [a, b] = [b, a];
    return (a < c && c < b) !== (a < d && d < b);
}
export function createGame(n) {
    if (!Number.isInteger(n) || n < 1 || n > 4) throw new RangeError('n');
    return {n, edges: [], history: []};
}
export function operation(game, a, b) {
    const m = 6 * game.n;
    if (![a, b].every(v => Number.isInteger(v) && v >= 0 && v < m) || a === b) return 'select';
    if (boundary(m, a, b)) return 'boundary';
    if (game.edges.some(([c, d]) => edgeKey(a, b) === edgeKey(c, d))) return 'remove';
    if (game.edges.some(([c, d]) => crosses(a, b, c, d))) return 'crossing';
    return 'add';
}
export function toggle(game, a, b) {
    const action = operation(game, a, b);
    if (!['add', 'remove'].includes(action)) return false;
    game.history.push(game.edges.map(e => [...e]));
    if (action === 'add') game.edges.push([Math.min(a, b), Math.max(a, b)]);
    else game.edges = game.edges.filter(([c, d]) => edgeKey(a, b) !== edgeKey(c, d));
    return true;
}
export function undo(game) {
    if (!game.history.length) return false;
    game.edges = game.history.pop();
    return true;
}
export function inspect(game) {
    const m = 6 * game.n, degree = Array(m).fill(0);
    const edges = new Set(game.edges.map(([a, b]) => edgeKey(a, b)));
    for (const [a, b] of game.edges) { degree[a]++; degree[b]++; }
    const has = (a, b) => boundary(m, a, b) || edges.has(edgeKey(a, b));
    const triangles = [];
    for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) for (let c = b + 1; c < m; c++) {
        if (has(a, b) && has(b, c) && has(a, c)) triangles.push([a, b, c]);
    }
    const monochromatic = triangles.filter(([a, b, c]) => a % 2 === b % 2 && b % 2 === c % 2);
    const odd = degree.filter(d => d % 2).length;
    const triangulated = game.edges.length === m - 3;
    return {degree, triangles, monochromatic, odd, triangulated, complete: triangulated && odd === 0};
}
