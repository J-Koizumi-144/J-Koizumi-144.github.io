export function createState(n = 2) {
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new RangeError('n must be 1–5');
    const size = 2 * n + 1;
    return { n, size, cells: Array(size * size).fill(false), initial: Array(size * size).fill(false), phase: 'edit', removed: null, moves: 0 };
}
export function neighborCount(state, index) {
    const { size, cells } = state, row = Math.floor(index / size), col = index % size;
    return Number(row > 0 && cells[index - size]) + Number(row < size - 1 && cells[index + size]) + Number(col > 0 && cells[index - 1]) + Number(col < size - 1 && cells[index + 1]);
}
export function analyze(state) {
    const black = state.cells.filter(Boolean).length;
    const legal = state.cells.map((v, i) => !v && neighborCount(state, i) >= 2);
    return { black, initial: state.initial.filter(Boolean).length, legal, available: legal.filter(Boolean).length, complete: state.phase === 'grow' && black === state.cells.length, stuck: state.phase === 'grow' && black < state.cells.length && !legal.some(Boolean) };
}
export function act(state, action, index) {
    const next = { ...state, cells: [...state.cells], initial: [...state.initial] };
    if (action === 'cell') {
        if (!Number.isInteger(index) || index < 0 || index >= state.cells.length) return null;
        if (state.phase === 'edit') {
            next.cells[index] = !next.cells[index];
            next.initial = [...next.cells];
        } else if (state.phase === 'remove') {
            if (!state.cells[index]) return null;
            next.cells[index] = false;
            next.removed = index;
            next.phase = 'grow';
        } else {
            if (state.cells[index] || neighborCount(state, index) < 2) return null;
            next.cells[index] = true;
            next.moves++;
        }
    } else if (action === 'start') {
        if (state.phase !== 'edit' || !state.cells.some(Boolean)) return null;
        next.phase = 'remove';
    } else if (action === 'retry') {
        if (state.phase !== 'grow') return null;
        next.cells = [...state.initial]; next.phase = 'remove'; next.removed = null; next.moves = 0;
    } else if (action === 'edit') {
        if (state.phase === 'edit') return null;
        next.cells = [...state.initial]; next.phase = 'edit'; next.removed = null; next.moves = 0;
    } else return null;
    return next;
}
