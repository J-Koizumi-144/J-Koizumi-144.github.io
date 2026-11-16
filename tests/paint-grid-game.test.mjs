import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID_SIZES, PaintGrid, boundaryEdges } from '../daily_math_puzzle/paint-grid-game.mjs';

function replay(size, moves) {
    const board = Array.from({ length: size }, () => Array(size).fill('white'));
    for (const { axis, index } of moves) {
        if (axis === 'row') board[index].fill('red');
        else for (const line of board) line[index] = 'blue';
    }
    return board;
}

function sharedLength(board) {
    // Count occupied neighbors starting only from the red cells.
    let length = 0;
    for (const [row, line] of board.entries()) {
        for (const [col, color] of line.entries()) {
            if (color !== 'red') continue;
            for (const [dy, dx] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
                if (board[row + dy]?.[col + dx] === 'blue') length++;
            }
        }
    }
    return length;
}

test('all 2 by 2 orders and partial boards agree with painting the cells directly', () => {
    const game = new PaintGrid(2);
    let completeOrders = 0;
    function visit(order) {
        const expected = replay(2, order);
        assert.deepEqual(game.colors(), expected);
        assert.equal(boundaryEdges(game.colors()).length, sharedLength(expected));
        assert.equal(game.complete, order.length === 4);
        if (game.complete) completeOrders++;
        for (const axis of ['row', 'column']) {
            for (const index of [0, 1]) {
                if (order.some(move => move.axis === axis && move.index === index)) {
                    assert.equal(game.paint(axis, index), false);
                    continue;
                }
                assert.equal(game.paint(axis, index), true);
                visit([...order, { axis, index }]);
                assert.deepEqual(game.undo(), { axis, index });
                assert.deepEqual(game.colors(), expected);
            }
        }
    }
    visit([]);
    assert.equal(completeOrders, 24);
    assert.equal(game.moves.length, 0);
});

test('a white neighbor contributes nothing, and only shared red–blue edges get drawn', () => {
    const game = new PaintGrid(4);
    game.paint('row', 0);
    assert.deepEqual(boundaryEdges(game.colors()), []);
    game.paint('column', 1);
    assert.deepEqual(boundaryEdges(game.colors()), [
        { row: 0, column: 1, side: 'left' },
        { row: 0, column: 2, side: 'left' },
    ]);
    game.paint('row', 1);
    assert.deepEqual(boundaryEdges(game.colors()), [
        { row: 0, column: 1, side: 'left' },
        { row: 0, column: 2, side: 'left' },
        { row: 1, column: 1, side: 'top' },
        { row: 2, column: 1, side: 'top' },
    ]);
});

test('every offered size finishes, undoes its final move, and resets to white', () => {
    for (const size of GRID_SIZES) {
        const game = new PaintGrid(size);
        const order = [];
        for (let i = 0; i < size; i++) {
            for (const move of [{ axis: 'column', index: size - i - 1 }, { axis: 'row', index: i }]) {
                order.push(move);
                game.paint(move.axis, move.index);
                const expected = replay(size, order);
                assert.deepEqual(game.colors(), expected);
                assert.equal(boundaryEdges(game.colors()).length, sharedLength(expected));
                assert.equal(game.complete, order.length === 2 * size);
            }
        }
        assert.deepEqual(game.undo(), order.pop());
        assert.equal(game.complete, false);
        assert.deepEqual(game.colors(), replay(size, order));
        game.reset();
        assert.deepEqual(game.colors(), replay(size, []));
        assert.equal(game.moves.length, 0);
        assert.equal(game.undo(), undefined);
        for (const axis of ['row', 'column']) {
            for (let i = 0; i < size; i++) assert.ok(game.canPaint(axis, i));
        }
    }
});

test('unsupported sizes and operations cannot change the board', () => {
    for (const size of [-2, 0, 1, 3, 10, '4', 2.5]) assert.throws(() => new PaintGrid(size), RangeError);
    const game = new PaintGrid();
    for (const [axis, index] of [['row', 4], ['column', -1], ['tile', 1], ['row', '0'], ['column', 2.5]]) {
        assert.equal(game.paint(axis, index), false);
    }
    assert.equal(game.moves.length, 0);
    assert.deepEqual(game.colors(), replay(4, []));
});
