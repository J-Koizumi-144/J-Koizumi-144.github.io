export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 8;
export const DEFAULT_COLUMNS = 6;

function checkSize(n) {
    if (!Number.isInteger(n) || n < MIN_COLUMNS || n > MAX_COLUMNS) {
        throw new RangeError('Unsupported number of columns');
    }
}

export function isDecreasing(row) {
    return row.every((value, index) => index === 0 || row[index - 1] > value);
}

export function createState(n, bottom) {
    checkSize(n);
    if (!Array.isArray(bottom) || bottom.length !== n || new Set(bottom).size !== n ||
        bottom.some(value => !Number.isInteger(value) || value < 1 || value > n)) {
        throw new RangeError('The bottom row must be a permutation');
    }
    return {
        n, top: Array.from({ length: n }, (_, index) => index + 1),
        bottom: [...bottom], initialBottom: [...bottom], history: [],
    };
}

export function randomPermutation(n, random = Math.random, previous = null) {
    checkSize(n);
    let result;
    for (let attempt = 0; attempt < 20; attempt++) {
        result = Array.from({ length: n }, (_, index) => index + 1);
        for (let i = n - 1; i > 0; i--) {
            const sample = random();
            if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
                throw new RangeError('Random samples must be in [0, 1)');
            }
            const j = Math.floor(sample * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        if (n === 1 || !previous || result.some((value, i) => value !== previous[i])) return result;
    }
    // Keep the button responsive even with a constant random source.
    [result[0], result[1]] = [result[1], result[0]];
    return result;
}

export function sortInterval(state, first, last) {
    if (![first, last].every(index => Number.isInteger(index) && index >= 0 && index < state.n) || first === last) {
        throw new RangeError('Select at least two consecutive columns');
    }
    const a = Math.min(first, last), b = Math.max(first, last);
    const sorted = row => [...row.slice(0, a), ...row.slice(a, b + 1).sort((x, y) => y - x), ...row.slice(b + 1)];
    return {
        ...state, top: sorted(state.top), bottom: sorted(state.bottom),
        history: [...state.history, { top: [...state.top], bottom: [...state.bottom], range: [a, b] }],
    };
}

export function undoMove(state) {
    if (!state.history.length) return state;
    const before = state.history.at(-1);
    return { ...state, top: [...before.top], bottom: [...before.bottom], history: state.history.slice(0, -1) };
}

export function resetState(state) {
    return createState(state.n, state.initialBottom);
}
