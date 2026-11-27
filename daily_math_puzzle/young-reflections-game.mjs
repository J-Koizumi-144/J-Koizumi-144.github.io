export const BOARD_SIZE = 8;
const counts = new Map();

export function validShape(shape) {
    return Array.isArray(shape) && shape.length === BOARD_SIZE &&
        shape.every((width, row) => Number.isInteger(width) && width >= 0 && width <= BOARD_SIZE &&
            (row === 0 || width <= shape[row - 1])) && totalBoxes(shape) > 0;
}

export function totalBoxes(shape) {
    return shape.reduce((total, width) => total + width, 0);
}

export function countDiagrams(boxes, rows = BOARD_SIZE, maxWidth = BOARD_SIZE) {
    if (boxes === 0) return 1;
    if (boxes < 0 || rows === 0 || boxes > rows * maxWidth) return 0;
    const key = `${boxes},${rows},${maxWidth}`;
    if (counts.has(key)) return counts.get(key);
    let total = 0;
    for (let width = 1; width <= Math.min(boxes, maxWidth); width++) {
        total += countDiagrams(boxes - width, rows - 1, width);
    }
    counts.set(key, total);
    return total;
}

export function randomShape(boxes, random = Math.random) {
    if (!Number.isInteger(boxes) || boxes < 1 || boxes > BOARD_SIZE ** 2) {
        throw new RangeError('The number of boxes must be an integer from 1 to 64.');
    }
    const shape = [];
    let remaining = boxes;
    let maxWidth = BOARD_SIZE;
    for (let row = 0; row < BOARD_SIZE; row++) {
        if (remaining === 0) {
            shape.push(0);
            continue;
        }
        let ticket = Math.floor(random() * countDiagrams(remaining, BOARD_SIZE - row, maxWidth));
        let selected;
        for (let width = 1; width <= Math.min(remaining, maxWidth); width++) {
            const ways = countDiagrams(remaining - width, BOARD_SIZE - row - 1, width);
            if (ticket < ways) {
                selected = width;
                break;
            }
            ticket -= ways;
        }
        if (selected === undefined) throw new RangeError('The random source must return a value in [0, 1).');
        shape.push(selected);
        remaining -= selected;
        maxWidth = selected;
    }
    return shape;
}

export function hasBox(shape, cell) {
    return Number.isInteger(cell) && cell >= 0 && cell < BOARD_SIZE ** 2 &&
        cell % BOARD_SIZE < shape[Math.floor(cell / BOARD_SIZE)];
}

export function cellAction(shape, cell) {
    if (!Number.isInteger(cell) || cell < 0 || cell >= BOARD_SIZE ** 2) return null;
    const row = Math.floor(cell / BOARD_SIZE);
    const column = cell % BOARD_SIZE;
    if (column === shape[row] && (row === 0 || column < shape[row - 1])) return 'add';
    if (column === shape[row] - 1 && totalBoxes(shape) > 1 &&
        (row === BOARD_SIZE - 1 || column >= shape[row + 1])) return 'remove';
    return null;
}

export function createState(shape) {
    if (!validShape(shape)) throw new RangeError('A nonempty Young diagram inside the board is required.');
    return { shape: [...shape], current: 0, visited: new Set([0]), moves: 0 };
}

export function reflect(state, direction) {
    if (direction !== 'horizontal' && direction !== 'vertical') throw new RangeError('Unknown reflection.');
    const row = Math.floor(state.current / BOARD_SIZE);
    const column = state.current % BOARD_SIZE;
    const height = state.shape.filter(width => width > column).length;
    const current = direction === 'horizontal'
        ? row * BOARD_SIZE + state.shape[row] - 1 - column
        : (height - 1 - row) * BOARD_SIZE + column;
    return { shape: state.shape, current, visited: new Set([...state.visited, current]), moves: state.moves + 1 };
}

export function editBox(state, cell) {
    const action = cellAction(state.shape, cell);
    if (!action) return state;
    const shape = [...state.shape];
    shape[Math.floor(cell / BOARD_SIZE)] += action === 'add' ? 1 : -1;
    return createState(shape);
}

export function resetWalk(state) {
    return createState(state.shape);
}

export function isComplete(state) {
    return state.visited.size === totalBoxes(state.shape);
}
