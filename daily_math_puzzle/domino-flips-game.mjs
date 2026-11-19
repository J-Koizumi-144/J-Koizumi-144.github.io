export const BOARD_SIZES = [[2, 2], [2, 4], [3, 4], [4, 3], [4, 4], [4, 6], [5, 6], [6, 6], [6, 8], [8, 8]];

export function assertDimensions(rows, cols) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2 || rows > 8 || cols > 8 || rows * cols % 2) {
        throw new RangeError('Choose a tileable board with 2–8 rows and columns.');
    }
}

export function isTiling(tiles, rows, cols) {
    if (!Array.isArray(tiles) || tiles.length !== rows * cols) return false;
    return tiles.every((partner, cell) => Number.isInteger(partner) && partner >= 0 && partner < tiles.length &&
        tiles[partner] === cell && (Math.abs(partner - cell) === cols ||
            (Math.abs(partner - cell) === 1 && Math.floor(partner / cols) === Math.floor(cell / cols))));
}

export function squareOrientation(tiles, rows, cols, row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= rows - 1 || col >= cols - 1) return null;
    const a = row * cols + col, b = a + 1, c = a + cols, d = c + 1;
    if (tiles[a] === c && tiles[b] === d) return 'vertical';
    if (tiles[a] === b && tiles[c] === d) return 'horizontal';
    return null;
}

export function availableFlips(tiles, rows, cols, directed = true) {
    const result = [];
    for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
            const orientation = squareOrientation(tiles, rows, cols, row, col);
            const required = (row + col) % 2 === 0 ? 'vertical' : 'horizontal';
            if (orientation && (!directed || orientation === required)) result.push({ row, col, orientation });
        }
    }
    return result;
}

function turnSquare(tiles, cols, row, col, orientation) {
    const result = tiles.slice(), a = row * cols + col, b = a + 1, c = a + cols, d = c + 1;
    const pairs = orientation === 'vertical' ? [[a, b], [c, d]] : [[a, c], [b, d]];
    for (const [first, second] of pairs) { result[first] = second; result[second] = first; }
    return result;
}

export function flipTiles(tiles, rows, cols, row, col) {
    const orientation = squareOrientation(tiles, rows, cols, row, col);
    const required = (row + col) % 2 === 0 ? 'vertical' : 'horizontal';
    if (!orientation || orientation !== required) return null;
    return turnSquare(tiles, cols, row, col, orientation);
}

export function randomTiling(rows, cols, random = Math.random) {
    assertDimensions(rows, cols);
    let tiles = Array(rows * cols).fill(-1);
    for (let cell = 0; cell < tiles.length; cell++) {
        if (tiles[cell] !== -1) continue;
        const partner = cell + (cols % 2 === 0 ? 1 : cols);
        tiles[cell] = partner; tiles[partner] = cell;
    }
    const steps = rows * cols * 12 + Math.floor(random() * rows * cols);
    for (let step = 0; step < steps; step++) {
        const choices = availableFlips(tiles, rows, cols, false);
        const move = choices[Math.floor(random() * choices.length)];
        tiles = turnSquare(tiles, cols, move.row, move.col, move.orientation);
    }
    if (!availableFlips(tiles, rows, cols).length) {
        const choices = availableFlips(tiles, rows, cols, false);
        const move = choices[Math.floor(random() * choices.length)];
        tiles = turnSquare(tiles, cols, move.row, move.col, move.orientation);
    }
    return tiles;
}

export function createSession(rows, cols, initial = randomTiling(rows, cols)) {
    assertDimensions(rows, cols);
    if (!isTiling(initial, rows, cols)) throw new TypeError('Invalid tiling.');
    return { rows, cols, initial: initial.slice(), tiles: initial.slice(), history: [], lastMove: null };
}

export function playMove(state, row, col) {
    const next = flipTiles(state.tiles, state.rows, state.cols, row, col);
    if (!next) return false;
    state.history.push({ tiles: state.tiles, lastMove: state.lastMove });
    state.tiles = next;
    state.lastMove = { row, col };
    return true;
}

export function undoMove(state) {
    const previous = state.history.pop();
    if (!previous) return false;
    state.tiles = previous.tiles;
    state.lastMove = previous.lastMove;
    return true;
}

export function resetSession(state) {
    state.tiles = state.initial.slice();
    state.history = [];
    state.lastMove = null;
}
