import test from 'node:test';
import assert from 'node:assert/strict';
import { GridGame } from '../daily_math_puzzle/grid-game.mjs';

test('supported sizes start empty; invalid dimensions and cell indices are rejected', () => {
    for (let n = 2; n <= 6; n++) {
        const game = new GridGame(n);
        const state = game.analysis;
        assert.equal(game.cells.length, (2 * n) ** 2);
        assert.equal(state.black, 0);
        assert.equal(state.emptyRows, 2 * n);
        assert.equal(state.emptyColumns, 2 * n);
        assert.equal(state.invalidSquares.length, (2 * n - 1) ** 2);
        assert.equal(state.valid, false);
        assert.equal(game.undo(), false);
        for (const index of [-1, game.cells.length, 1.5, NaN, '0']) {
            assert.equal(game.toggle(index), false);
        }
        assert.equal(game.history.length, 0);
    }
    for (const n of [1, 7, 2.5, NaN, '3']) assert.throws(() => new GridGame(n), RangeError);
});

test('checks overlapping squares and both row and column coverage', () => {
    const game = new GridGame(2);
    for (const index of [0, 2, 8, 10]) game.toggle(index);
    assert.equal(game.analysis.invalidSquares.length, 0);
    assert.equal(game.analysis.emptyRows, 2);
    assert.equal(game.analysis.emptyColumns, 2);
    assert.equal(game.analysis.valid, false);
    game.toggle(5);
    assert.deepEqual(game.analysis.invalidSquares, [
        { row: 0, column: 0 }, { row: 0, column: 1 },
        { row: 1, column: 0 }, { row: 1, column: 1 },
    ]);
    assert.equal(game.analysis.black, 5);
    assert.equal(game.analysis.emptyRows, 1);
    assert.equal(game.analysis.emptyColumns, 1);
});

test('undo restores repeated toggles, including the first cell, without altering earlier history', () => {
    const game = new GridGame(3);
    const states = [];
    for (const index of [0, 35, 0, 7, 35]) {
        states.push(JSON.stringify(game));
        game.toggle(index);
    }
    while (states.length) {
        assert.notEqual(game.undo(), false);
        assert.equal(JSON.stringify(game), states.pop());
    }
    assert.equal(game.undo(), false);
});

test('every 4 by 4 coloring agrees with an independent direct check', () => {
    const game = new GridGame(2);
    for (let mask = 0; mask < 65536; mask++) {
        const matrix = Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 4 }, (_, col) => (mask >> (row * 4 + col)) & 1));
        game.cells = matrix.flat().map(Boolean);
        const expectedRows = matrix.map(row => row.reduce((a, b) => a + b, 0));
        const expectedColumns = [0, 1, 2, 3].map(col => matrix.reduce((sum, row) => sum + row[col], 0));
        const invalid = [];
        for (let row = 0; row < 3; row++) {
            for (let column = 0; column < 3; column++) {
                const count = matrix.slice(row, row + 2).flatMap(line => line.slice(column, column + 2))
                    .filter(Boolean).length;
                if (count !== 1 && count !== 3) invalid.push({ row, column });
            }
        }
        const state = game.analysis;
        assert.equal(state.black, matrix.flat().filter(Boolean).length);
        assert.deepEqual(state.rows, expectedRows);
        assert.deepEqual(state.columns, expectedColumns);
        assert.deepEqual(state.invalidSquares, invalid);
        assert.equal(state.valid, expectedRows.every(Boolean) && expectedColumns.every(Boolean) && invalid.length === 0);
    }
});

test('recognizes valid nonminimal boards at every supported size and detects a broken corner', () => {
    for (let n = 2; n <= 6; n++) {
        const game = new GridGame(n);
        for (let row = 0; row < game.size; row++) {
            for (let col = 0; col < game.size; col++) {
                if (row % 2 || col % 2) game.toggle(row * game.size + col);
            }
        }
        assert.equal(game.analysis.valid, true);
        game.toggle(0);
        assert.equal(game.analysis.valid, false);
        assert.deepEqual(game.analysis.invalidSquares, [{ row: 0, column: 0 }]);
        assert.equal(game.undo(), 0);
        assert.equal(game.analysis.valid, true);
    }
});
