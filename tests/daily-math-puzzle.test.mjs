import test from 'node:test';
import assert from 'node:assert/strict';
import { CoinGame } from '../daily_math_puzzle/coin-game.mjs';

function combine(game, a, b) {
    game.selected = [];
    game.select(a);
    game.select(b);
    assert.equal(game.canMerge, true);
    const id = game.merge();
    assert.notEqual(id, false);
    assert.equal(game.piles.reduce((sum, pile) => sum + pile.size, 0), game.total);
    assert.equal(game.piles.length + game.history.length, game.total);
    return id;
}

test('starts with exactly 2^n+1 distinct single-coin piles; rejects unsupported n', () => {
    for (let n = 1; n <= 6; n++) {
        const game = new CoinGame(n);
        assert.equal(game.piles.length, 2 ** n + 1);
        assert.equal(new Set(game.piles.map(pile => pile.id)).size, game.total);
        assert.ok(game.piles.every(pile => pile.size === 1));
        assert.equal(game.unequal, 0);
        assert.equal(game.canMerge, false);
        assert.equal(game.undo(), false);
    }
    for (const n of [0, 7, -1, 2.5, NaN, '3']) assert.throws(() => new CoinGame(n), RangeError);
});

test('counts only unequal merges and accepts the inclusive 2:1 boundary', () => {
    const game = new CoinGame(1);
    const id = combine(game, 0, 1);
    assert.equal(game.unequal, 0);
    combine(game, id, 2);
    assert.equal(game.unequal, 1);
    assert.equal(game.complete, true);
    assert.equal(game.stuck, false);
    assert.equal(game.piles[0].size, 3);
    assert.equal(game.history.length, 2);
});

test('cannot merge a single pile with itself or merge a pair with ratio above 2', () => {
    const game = new CoinGame(2);
    game.select(0);
    game.select(0);
    assert.deepEqual(game.selected, []);
    const a = combine(game, 0, 1);
    const b = combine(game, 2, 3);
    const c = combine(game, a, b);
    game.select(c);
    game.select(4);
    const before = JSON.stringify(game);
    assert.equal(game.canMerge, false);
    assert.equal(game.merge(), false);
    assert.equal(JSON.stringify(game), before);
    assert.equal(game.stuck, true);
});

test('undo restores the exact piles, counts, and identifiers, including after completion', () => {
    const game = new CoinGame(1);
    const initial = JSON.stringify(game);
    const merged = combine(game, 0, 1);
    const intermediate = JSON.stringify(game);
    combine(game, merged, 2);
    game.undo();
    assert.equal(JSON.stringify(game), intermediate);
    game.undo();
    assert.equal(JSON.stringify(game), initial);
});

test('selection supports deselection and replacement without changing piles', () => {
    const game = new CoinGame(2);
    game.select(0);
    game.select(1);
    game.select(2);
    assert.deepEqual(game.selected, [0, 2]);
    game.select(0);
    assert.deepEqual(game.selected, [2]);
    game.select(9999);
    assert.deepEqual(game.selected, [2]);
    assert.equal(game.piles.length, 5);
});

test('the recursive construction finishes legally with n unequal merges for every supported n', () => {
    function powerOfTwo(game, ids) {
        if (ids.length === 1) return ids[0];
        const half = ids.length / 2;
        return combine(game, powerOfTwo(game, ids.slice(0, half)), powerOfTwo(game, ids.slice(half)));
    }
    function oddPile(game, ids) {
        if (ids.length === 1) return ids[0];
        if (ids.length === 3) return combine(game, powerOfTwo(game, ids.slice(0, 2)), ids[2]);
        const half = (ids.length - 1) / 2;
        return combine(game, powerOfTwo(game, ids.slice(0, half)), oddPile(game, ids.slice(half)));
    }
    for (let n = 1; n <= 6; n++) {
        const game = new CoinGame(n);
        oddPile(game, game.piles.map(pile => pile.id));
        assert.equal(game.complete, true);
        assert.equal(game.unequal, n);
        assert.equal(game.history.length, 2 ** n);
        while (game.undo()) assert.equal(game.piles.reduce((sum, pile) => sum + pile.size, 0), game.total);
        assert.equal(game.piles.length, game.total);
        assert.equal(game.unequal, 0);
    }
});

test('all reachable states for n=1,2,3 conserve coins and report dead ends correctly', () => {
    for (let n = 1; n <= 3; n++) {
        const seen = new Set();
        function visit(game) {
            const key = game.piles.map(pile => pile.size).sort((a, b) => a - b).join(',');
            if (seen.has(key)) return;
            seen.add(key);
            const legal = [];
            for (let i = 0; i < game.piles.length; i++) {
                for (let j = i + 1; j < game.piles.length; j++) {
                    const a = game.piles[i], b = game.piles[j];
                    if (Math.max(a.size, b.size) <= 2 * Math.min(a.size, b.size)) legal.push([a.id, b.id]);
                }
            }
            assert.equal(game.stuck, !game.complete && legal.length === 0);
            for (const [a, b] of legal) {
                const before = JSON.stringify(game);
                combine(game, a, b);
                visit(game);
                game.undo();
                assert.equal(JSON.stringify(game), before);
            }
        }
        visit(new CoinGame(n));
        assert.ok(seen.size > n);
    }
});
