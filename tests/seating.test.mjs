import assert from "node:assert/strict";
import { test } from "node:test";
import { SeatingGame } from "../daily_math_puzzle/seating-game.mjs";

test("scores merged occupied blocks and restores all state", () => {
    const game = new SeatingGame(8);
    assert.equal(game.sit(2), true);
    assert.equal(game.sit(4), true);
    assert.equal(game.sit(3), true);
    assert.deepEqual(game.moves.map(move => move.points), [1, 1, 3]);
    assert.equal(game.total, 5);
    assert.equal(game.sit(3), false);
    assert.equal(game.sit(-1), false);
    assert.equal(game.sit(8), false);
    game.undo();
    assert.equal(game.total, 2);
    assert.equal(game.order[3], 0);
    assert.equal(game.sit(3), true);
    assert.equal(game.total, 5);
});

test("all seating orders of four seats agree with independent block count", () => {
    function permutations(items) {
        if (!items.length) return [[]];
        return items.flatMap((item, i) =>
            permutations(items.filter((_, j) => i !== j)).map(rest => [item, ...rest]));
    }
    for (const order of permutations([0, 1, 2, 3])) {
        const game = new SeatingGame(4);
        const occupied = new Set();
        let total = 0;
        for (const seat of order) {
            occupied.add(seat);
            let block = 1;
            for (let i = seat - 1; occupied.has(i); i--) block++;
            for (let i = seat + 1; occupied.has(i); i++) block++;
            total += block;
            assert.equal(game.sit(seat), true);
            assert.equal(game.moves.at(-1).points, block);
            assert.equal(game.total, total);
        }
    }
    for (const size of [0, 3, 33]) assert.throws(() => new SeatingGame(size), RangeError);
});
