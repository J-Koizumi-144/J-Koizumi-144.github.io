export const N_VALUES = Object.freeze([1, 2, 3, 4, 5, 6]);

function randomIndex(length, random) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Invalid random value');
    return Math.floor(value * length);
}

function shuffledNumbers(length, random) {
    const numbers = Array.from({ length }, (_, i) => i + 1);
    for (let i = length - 1; i > 0; i--) {
        const j = randomIndex(i + 1, random);
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
}

export function generateTable(n, random = Math.random) {
    if (!N_VALUES.includes(n)) throw new RangeError('Invalid table size');
    const count = 3 * n;
    const bottom = Array(count).fill(0);
    const order = shuffledNumbers(count, random);
    const variety = randomIndex(5, random);
    const cycleCount = variety < 2 ? n : variety === 4 ? 0 :
        Math.ceil(n / 2) + randomIndex(n - Math.ceil(n / 2) + 1, random);
    for (let i = 0; i < 3 * cycleCount; i += 3) {
        const [a, b, c] = order.slice(i, i + 3);
        bottom[a - 1] = b;
        bottom[b - 1] = c;
        bottom[c - 1] = a;
    }
    for (let column = 0; column < count; column++) {
        if (bottom[column]) continue;
        const candidate = randomIndex(count - 1, random) + 1;
        bottom[column] = candidate <= column ? candidate : candidate + 1;
    }
    return bottom;
}

export function createSession(n = 4, random = Math.random) {
    return {
        n, bottom: generateTable(n, random),
        colors: Array(3 * n).fill('blue'), history: [],
    };
}

export function evaluateTable(bottom, colors) {
    const columns = bottom.map((number, column) =>
        colors[column] === 'red' && colors[number - 1] === 'blue');
    const score = columns.filter(Boolean).length;
    return { columns, score, complete: score >= bottom.length / 3 };
}

export function toggleNumber(state, number) {
    if (!Number.isInteger(number) || number < 1 || number > state.colors.length) return false;
    state.history.push(number);
    state.colors[number - 1] = state.colors[number - 1] === 'blue' ? 'red' : 'blue';
    return true;
}

export function undoMove(state) {
    const number = state.history.pop();
    if (number === undefined) return false;
    state.colors[number - 1] = state.colors[number - 1] === 'blue' ? 'red' : 'blue';
    return true;
}

export function resetColors(state) {
    state.colors.fill('blue');
    state.history.length = 0;
}
