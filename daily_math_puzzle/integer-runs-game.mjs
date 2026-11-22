export const COUNTS = [6, 8, 10, 12];
export const DEFAULT_COUNT = 8;

export function runsOf(values) {
    const runs = [];
    values.forEach((value, index) => {
        if (!index || value !== values[index - 1] + 1) runs.push([]);
        runs.at(-1).push(index);
    });
    return runs;
}

function isInterestingStart(values) {
    const lengths = runsOf(values).map(run => run.length);
    const minimumRuns = values.length === 6 ? 3 : 4;
    if (lengths.length < minimumRuns || lengths.filter(length => length > 1).length < 2) return false;

    let preview = createState(values);
    for (let round = 0; round <= 2; round++) {
        const currentLengths = runsOf(preview.values).map(run => run.length);
        if (currentLengths.every((length, i) => !i || currentLengths[i - 1] <= length)) return false;
        if (round < 2) {
            for (let i = 0; i < values.length; i++) preview = advance(preview);
        }
    }
    return true;
}

export function randomRow(count, random = Math.random, previous = []) {
    if (!COUNTS.includes(count)) throw new RangeError('Unsupported number count');
    const span = Math.ceil(count / 0.64);
    const differentSpacing = values => values.length !== previous.length
        || values.some((v, i) => v - values[0] !== previous[i] - previous[0]);
    for (let attempt = 0; attempt < 256; attempt++) {
        const pool = Array.from({ length: span }, (_, index) => index + 1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const values = pool.slice(0, count).sort((a, b) => a - b);
        if (differentSpacing(values) && isInterestingStart(values)) return values;
    }
    // Keep the same conditions even if a random source repeatedly produces rejected rows.
    const values = Array.from({ length: count - 4 }, (_, i) => i + 1)
        .concat(count - 2, count + 1, count + 2, count + 4);
    if (!differentSpacing(values)) values[count - 4]++;
    return values;
}

export function createState(initial) {
    if (!initial.length || initial.some((v, i) => !Number.isSafeInteger(v) || v < 1 || (i > 0 && v <= initial[i - 1]))) {
        throw new RangeError('Initial values must be distinct positive integers in increasing order');
    }
    return { initial: [...initial], values: [...initial], lastRound: [...initial], next: 0, rounds: 0 };
}

export function copyState(state) {
    return { ...state, initial: [...state.initial], values: [...state.values], lastRound: [...state.lastRound] };
}

export function replacementFor(values, index) {
    if (!Number.isInteger(index) || index < 0 || index >= values.length) throw new RangeError('Invalid position');
    const occupied = new Set(values);
    let next = values[index] + 1;
    while (occupied.has(next)) next++;
    if (!Number.isSafeInteger(next)) throw new RangeError('Integer is too large');
    return next;
}

export function advance(state, index = state.next) {
    if (index !== state.next) throw new RangeError('Process the next position from left to right');
    const result = copyState(state);
    result.values[index] = replacementFor(state.values, index);
    if (index === result.values.length - 1) {
        result.next = 0;
        result.rounds++;
        result.lastRound = [...result.values];
    } else {
        result.next++;
    }
    return result;
}
