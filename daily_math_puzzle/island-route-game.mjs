export const ISLAND_COUNTS = [4, 6, 8, 10, 12, 14];
const HEIGHT = Math.sqrt(3) / 2;

function shuffle(values, random) {
    for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}

// Nearest neighbors in an offset-row triangular lattice, with unit edge length.
export function latticeNeighbors(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.abs(dx * dx + dy * dy - 1) < 1e-8;
}

export function generateIslandTree(count, random = Math.random) {
    if (!ISLAND_COUNTS.includes(count)) throw new RangeError('Unsupported island count');
    const columns = count <= 6 ? 3 : count <= 16 ? 4 : 5;
    const rows = Math.ceil(count / columns) + 1;
    const patch = Array.from({ length: columns * rows }, (_, i) => {
        const row = Math.floor(i / columns);
        const col = i % columns;
        return { col, row, x: col + (row % 2) / 2, y: row * HEIGHT };
    });
    const neighbors = patch.map(p => patch.flatMap((q, i) => latticeNeighbors(p, q) ? [i] : []));
    const chosen = new Set([Math.floor(random() * patch.length)]);
    while (chosen.size < count) {
        const frontier = new Set();
        for (const i of chosen) for (const j of neighbors[i]) if (!chosen.has(j)) frontier.add(j);
        const options = [...frontier];
        chosen.add(options[Math.floor(random() * options.length)]);
    }
    const nodes = shuffle([...chosen], random).map(i => ({ ...patch[i] }));
    const candidates = [];
    for (let a = 0; a < count; a++) {
        for (let b = a + 1; b < count; b++) if (latticeNeighbors(nodes[a], nodes[b])) candidates.push([a, b]);
    }
    const parent = Array.from({ length: count }, (_, i) => i);
    function root(i) {
        while (i !== parent[i]) { parent[i] = parent[parent[i]]; i = parent[i]; }
        return i;
    }
    const edges = [];
    for (const [a, b] of shuffle(candidates, random)) {
        const ra = root(a), rb = root(b);
        if (ra === rb) continue;
        parent[ra] = rb;
        edges.push([a, b]);
        if (edges.length === count - 1) break;
    }
    return { nodes, edges };
}

export function adjacency(graph) {
    const result = graph.nodes.map(() => []);
    for (const [a, b] of graph.edges) { result[a].push(b); result[b].push(a); }
    return result;
}

export function findPath(graph, start, end) {
    if (![start, end].every(v => Number.isInteger(v) && v >= 0 && v < graph.nodes.length)) throw new RangeError('Invalid island');
    const adj = adjacency(graph);
    const previous = Array(graph.nodes.length).fill(-1);
    previous[start] = start;
    const queue = [start];
    for (let head = 0; head < queue.length && previous[end] === -1; head++) {
        for (const next of adj[queue[head]]) {
            if (previous[next] !== -1) continue;
            previous[next] = queue[head];
            queue.push(next);
        }
    }
    if (previous[end] === -1) throw new Error('Disconnected graph');
    const path = [end];
    while (path.at(-1) !== start) path.push(previous[path.at(-1)]);
    return path.reverse();
}

export function evaluatePairs(graph, pairs) {
    const used = new Set();
    for (const pair of pairs) {
        if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) throw new Error('Invalid pair');
        for (const id of pair) {
            if (!Number.isInteger(id) || id < 0 || id >= graph.nodes.length || used.has(id)) throw new Error('An island can belong to one pair only');
            used.add(id);
        }
    }
    const paths = pairs.map(([a, b]) => findPath(graph, a, b));
    const common = paths.length ? paths[0].filter(id => paths.every(path => path.includes(id))).sort((a,b) => a-b) : [];
    const complete = used.size === graph.nodes.length;
    return { paths, common, complete, success: complete && common.length > 0, unpaired: graph.nodes.length - used.size };
}

export class IslandRouteGame {
    constructor(graph) {
        this.graph = graph;
        this.pairs = [];
        this.selected = [];
        this.history = [];
    }
    pairIndex(id) { return this.pairs.findIndex(pair => pair.includes(id)); }
    select(id) {
        if (!Number.isInteger(id) || id < 0 || id >= this.graph.nodes.length) return 'invalid';
        if (this.pairIndex(id) >= 0) return 'paired';
        if (this.selected.includes(id)) this.selected = this.selected.filter(v => v !== id);
        else if (this.selected.length === 2) return 'full';
        else this.selected.push(id);
        return 'selected';
    }
    clearSelection() { this.selected = []; }
    save() { this.history.push(this.pairs.map(pair => [...pair])); }
    addPair() {
        if (this.selected.length !== 2) return false;
        const next = [...this.pairs, [...this.selected]];
        evaluatePairs(this.graph, next);
        this.save();
        this.pairs = next;
        this.selected = [];
        return true;
    }
    removePair(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.pairs.length) return false;
        this.save();
        this.pairs.splice(index, 1);
        this.selected = [];
        return true;
    }
    undo() {
        if (!this.history.length) return false;
        this.pairs = this.history.pop();
        this.selected = [];
        return true;
    }
    reset() { this.pairs = []; this.selected = []; this.history = []; }
    evaluate() { return evaluatePairs(this.graph, this.pairs); }
}
