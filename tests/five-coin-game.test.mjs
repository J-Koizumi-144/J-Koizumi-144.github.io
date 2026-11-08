import test from 'node:test';
import assert from 'node:assert/strict';
import FiveCoinGame from '../daily_math_puzzle/five-coin-game.js';

test('all supported sizes start heads up; rejects invalid sizes and indices', () => {
    for (let n = 5; n <= 12; n++) {
        const game = new FiveCoinGame(n);
        assert.deepEqual(game.analysis, { heads: n, tails: 0, moves: 0, complete: false });
        assert.equal(game.undo(), false);
        for (const index of [-1, n, 1.5, NaN, '0', null]) assert.equal(game.flip(index), false);
        assert.equal(game.history.length, 0);
        for (let center = 0; center < n; center++) {
            assert.equal(new Set(game.affected(center)).size, 5);
        }
    }
    for (const n of [4, 13, 5.5, NaN, '9', null]) assert.throws(() => new FiveCoinGame(n), RangeError);
});

test('all small configurations agree with independent circular-distance calculations', () => {
    for (let n = 5; n <= 9; n++) {
        for (let mask = 0; mask < 2 ** n; mask++) {
            const original = Array.from({ length: n }, (_, i) => Boolean(mask & (1 << i)));
            for (let center = 0; center < n; center++) {
                const game = new FiveCoinGame(n);
                game.coins = [...original];
                const expected = original.map((heads, i) => {
                    const distance = Math.min(Math.abs(i - center), n - Math.abs(i - center));
                    return original[center] && distance <= 2 ? !heads : heads;
                });
                assert.equal(game.flip(center), original[center]);
                assert.deepEqual(game.coins, expected);
                assert.equal(game.analysis.heads, expected.filter(Boolean).length);
                assert.equal(game.analysis.tails, expected.filter(value => !value).length);
                assert.equal(game.analysis.complete, expected.every(value => !value));
                assert.equal(game.analysis.moves, Number(original[center]));
                if (original[center]) {
                    assert.equal(game.undo(), true);
                    assert.deepEqual(game.coins, original);
                    assert.equal(game.analysis.moves, 0);
                }
            }
        }
    }
});

test('undo restores whole move history and reset restores the initial state', () => {
    for (let n = 5; n <= 12; n++) {
        const game = new FiveCoinGame(n);
        const snapshots = [];
        for (let turn = 0; turn < 30; turn++) {
            const legal = game.coins.flatMap((heads, index) => heads ? [index] : []);
            if (!legal.length) break;
            snapshots.push(JSON.stringify(game));
            assert.equal(game.flip(legal[(turn * 7) % legal.length]), true);
        }
        while (snapshots.length) {
            assert.equal(game.undo(), true);
            assert.equal(JSON.stringify(game), snapshots.pop());
        }
        game.flip(n - 1);
        game.reset();
        assert.deepEqual(game, new FiveCoinGame(n));
    }
});

test('an all-tails board is complete and cannot make another move', () => {
    const game = new FiveCoinGame(12);
    game.coins.fill(false);
    assert.equal(game.analysis.complete, true);
    for (let center = 0; center < game.n; center++) assert.equal(game.flip(center), false);
    assert.equal(game.analysis.moves, 0);
});
