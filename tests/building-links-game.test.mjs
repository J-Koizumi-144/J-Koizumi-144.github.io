import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_HEIGHT, MAX_HEIGHT, newGame, moveBuilding, undoMove, communication } from '../daily_math_puzzle/building-links-game.mjs';

function* permutations(values) {
    if (!values.length) { yield []; return; }
    for (const h of values) {
        for (const rest of permutations(values.filter(v => v !== h))) yield [h, ...rest];
    }
}

test('each size starts with the two fixed ends and one building of each inner height', () => {
    for (let n = MIN_HEIGHT; n <= MAX_HEIGHT; n++) {
        const { order, history } = newGame(n);
        assert.equal(order[0], n);
        assert.equal(order.at(-1), n);
        assert.deepEqual(order.slice(1, -1).sort((a, b) => a - b), Array.from({ length: n - 1 }, (_, i) => i + 1));
        assert.deepEqual(history, []);
    }
    for (const n of [MIN_HEIGHT - 1, MAX_HEIGHT + 1, 3.5, NaN]) assert.throws(() => newGame(n), RangeError);
});

test('moving inserts at the destination, fixes the ends, and can be undone one gesture at a time', () => {
    const start = newGame(6);
    const first = moveBuilding(start, 1, 4);
    assert.deepEqual(first.order, [6, 4, 1, 3, 2, 5, 6]);
    const second = moveBuilding(first, 5, 1);
    assert.deepEqual(second.order, [6, 5, 4, 1, 3, 2, 6]);
    assert.deepEqual(undoMove(second), first);
    assert.deepEqual(undoMove(undoMove(second)), start);
    assert.equal(undoMove(start), start);
    for (const [from, to] of [[0, 2], [2, 0], [1, 6], [6, 1], [1, 1], [-1, 1], [1, 2.5], [1, 10]]) {
        assert.equal(moveBuilding(start, from, to), start);
    }
});

test('all links, their floors, and the degrees agree with the definition for every small ordering', () => {
    for (let n = 2; n <= 8; n++) {
        const inner = Array.from({ length: n - 1 }, (_, i) => i + 1);
        for (const arrangement of permutations(inner)) {
            const row = [n, ...arrangement, n];
            const expectedLinks = [];
            const degrees = Array(row.length).fill(0);
            for (let a = 0; a < row.length; a++) {
                for (let b = a + 1; b < row.length; b++) {
                    if (!row.slice(a + 1, b).every(h => h < row[a] && h < row[b])) continue;
                    expectedLinks.push({ left: a, right: b, floor: Math.min(row[a], row[b]) });
                    degrees[a]++;
                    degrees[b]++;
                }
            }
            assert.deepEqual(communication(row), { links: expectedLinks, degrees });
        }
    }
});
