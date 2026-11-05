import test from 'node:test';
import assert from 'node:assert/strict';
import { PairDifferenceGame } from '../daily_math_puzzle/pair-difference-game.mjs';

function pair(game, a, b) {
    assert.equal(game.select(a), true);
    assert.equal(game.select(b), true);
    assert.equal(game.pair(), true);
}
test('selection, unavailable cards, differences and completion', () => {
    const game = new PairDifferenceGame(3);
    assert.equal(game.pair(), false);
    assert.equal(game.select(0), false);
    assert.equal(game.select(7), false);
    assert.equal(game.select(2), true);
    assert.equal(game.select(2), true);
    assert.deepEqual(game.selected, []);
    game.select(6); game.select(2);
    assert.equal(game.select(1), false);
    assert.equal(game.pair(), true);
    assert.equal(game.select(6), false);
    assert.equal(game.total, 4);
    pair(game, 3, 5);
    assert.equal(game.total, 6);
    assert.equal(game.complete, false);
    pair(game, 4, 1);
    assert.equal(game.total, 9);
    assert.equal(game.complete, true);
    assert.deepEqual(game.available, []);
});
test('unpair and undo restore totals, cards, and completion', () => {
    const game = new PairDifferenceGame(2);
    pair(game, 1, 3); pair(game, 2, 4);
    assert.equal(game.remove(-1), false);
    assert.equal(game.remove(2), false);
    assert.equal(game.remove(0), true);
    assert.equal(game.complete, false);
    assert.deepEqual(game.available, [1, 3]);
    assert.equal(game.total, 2);
    assert.equal(game.undo(), true);
    assert.equal(game.complete, true);
    assert.equal(game.total, 4);
    game.undo(); game.undo();
    assert.deepEqual(game.available, [1, 2, 3, 4]);
    assert.equal(game.total, 0);
    assert.equal(game.undo(), false);
});
test('size limits and reset by replacement', () => {
    for (const n of [0, -1, 13, 2.5, NaN, '3']) assert.throws(() => new PairDifferenceGame(n), RangeError);
    for (const n of [1, 12]) {
        const game = new PairDifferenceGame(n);
        assert.equal(game.available.length, 2 * n);
        pair(game, 2 * n, 1);
        assert.equal(game.total, 2 * n - 1);
        const fresh = new PairDifferenceGame(n);
        assert.equal(fresh.history.length, 0);
        assert.equal(fresh.total, 0);
        assert.equal(fresh.complete, false);
    }
});
test('every small pairing agrees with an independent distance count', () => {
    function* matchings(cards, pairs = []) {
        if (!cards.length) { yield pairs; return; }
        for (let i = 1; i < cards.length; i++) {
            yield* matchings(cards.filter((_, j) => j !== 0 && j !== i), [...pairs, [cards[0], cards[i]]]);
        }
    }
    for (let n = 1; n <= 5; n++) {
        for (const matching of matchings(Array.from({ length: 2 * n }, (_, i) => i + 1))) {
            const game = new PairDifferenceGame(n);
            let expected = 0;
            for (const [a, b] of matching) {
                pair(game, b, a);
                for (let step = a; step < b; step++) expected++;
                assert.equal(game.total, expected);
            }
            assert.equal(game.complete, true);
        }
    }
});
