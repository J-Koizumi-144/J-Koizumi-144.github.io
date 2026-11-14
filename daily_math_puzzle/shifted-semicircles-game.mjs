export const MIN_SIZE = 1;
export const MAX_SIZE = 5;

export function makeDiagram(size) {
    if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
        throw new RangeError('Invalid number of semicircles');
    }
    const pairs = [];
    if (size >= 3) {
        pairs.push([1, 6], [2, 5], [3, 4]);
    }
    for (let left = 2 * pairs.length + 1; left <= 2 * size; left += 2) {
        pairs.push([left, left + 1]);
    }
    return { size, pairs, path: [1] };
}

export function blankDiagram(size) {
    return { size, pairs: [], path: [1] };
}

export function complete(state) {
    return state.pairs.length === state.size;
}

export function arcError(state, a, b) {
    const [left, right] = [Math.min(a, b), Math.max(a, b)];
    if (!Number.isInteger(left) || !Number.isInteger(right)
        || left < 1 || right > 2 * state.size || left === right) return 'invalid';
    for (const [start, end] of state.pairs) {
        if ([start, end].includes(left) || [start, end].includes(right)) return 'occupied';
        if ((start < left && left < end && end < right)
            || (left < start && start < right && right < end)) return 'crossing';
    }
    return null;
}

export function addArc(state, a, b) {
    if (arcError(state, a, b)) return state;
    return { ...state, pairs: [...state.pairs, [Math.min(a, b), Math.max(a, b)]], path: [1] };
}

export function removeArc(state, pair) {
    if (!state.pairs.includes(pair)) return state;
    return { ...state, pairs: state.pairs.filter(other => other !== pair), path: [1] };
}

export function nextStep(state) {
    if (!complete(state)) return state;
    const from = state.path.at(-1);
    // The first step uses the original drawing. Every second step uses its shifted copy.
    const offset = (state.path.length - 1) % 2;
    const pair = state.pairs.find(([a, b]) => a + offset === from || b + offset === from);
    if (!pair) return state;
    const [a, b] = pair;
    const to = (from === a + offset ? b : a) + offset;
    if (state.path.includes(to)) return state;
    return { ...state, path: [...state.path, to] };
}

export function finished(state) {
    return state.path.at(-1) === 2 * state.size + 1
        && new Set(state.path).size === 2 * state.size + 1;
}
