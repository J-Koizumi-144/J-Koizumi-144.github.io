import test from 'node:test';
import assert from 'node:assert/strict';
import { BallBoxes, MAX_PER_COLOR, shuffledBalls } from '../daily_math_puzzle/ball-boxes-game.mjs';

const row = word => Array.from(word, c => c === 'R' ? 'red' : 'white');
function pair(game, a, b) {
    game.selectBox(a);
    game.selectBox(b);
    return game.merge();
}

test('size choices contain equal numbers of both colors', () => {
    for (let n = 1; n <= MAX_PER_COLOR; n++) {
        const balls = shuffledBalls(n);
        assert.equal(balls.filter(c => c === 'red').length, n);
        assert.equal(balls.filter(c => c === 'white').length, n);
    }
    for (const bad of [0, 1.5, MAX_PER_COLOR + 1]) assert.throws(() => shuffledBalls(bad));
    assert.throws(() => new BallBoxes(row('RR')));
});

test('selection uses physical order, adjacency and an explicit confirmation', () => {
    const game = new BallBoxes(row('WRRW'));
    game.selectBox(3);
    game.selectBox(0);
    assert.equal(game.selectionState, 'notAdjacent');
    assert.equal(game.merge(), false);
    game.selectBox(2);
    assert.equal(game.selectionState, 'wrongRatio');
    assert.equal(game.merge(), false);
    game.selectBox(3);
    game.selectBox(2);
    assert.equal(game.selectionState, 'chooseTwo');
    game.selectBox(1);
    game.selectBox(0);
    assert.equal(game.selectionState, 'ready');
    assert.equal(game.boxes.length, 4);
    assert.ok(game.merge());
    assert.deepEqual(game.boxes[0], { start: 0, size: 2, red: 1 });
    assert.deepEqual(game.selected, []);
    assert.deepEqual(game.balls, row('WRRW'));
});

test('equal ratios merge, history restores boundaries and reset retains the arrangement', () => {
    const game = new BallBoxes(row('WRWR'));
    assert.ok(pair(game, 0, 1));
    assert.ok(pair(game, 1, 2));
    const before = game.boxes;
    assert.ok(pair(game, 1, 0));
    assert.deepEqual(game.boxes, [{ start: 0, size: 4, red: 2 }]);
    assert.equal(game.stuck, false);
    assert.ok(game.undo());
    assert.deepEqual(game.boxes, before);
    game.startPlay();
    assert.deepEqual(game.boxes.map(b => b.size), [1, 1, 1, 1]);
    assert.deepEqual(game.balls, row('WRWR'));
    assert.equal(game.undo(), false);
    assert.ok(new BallBoxes(row('RW')).stuck);
});

test('moving a ball inserts it at the destination and keeps the others in order', () => {
    const game = new BallBoxes(row('WRRW'));
    assert.equal(game.moveBall(0, 2), false);
    assert.ok(pair(game, 0, 1));
    game.startEditing();
    assert.equal(game.boxes.length, 0);
    assert.ok(game.moveBall(0, 2));
    assert.deepEqual(game.balls, row('RRWW'));
    assert.ok(game.moveBall(3, 1));
    assert.deepEqual(game.balls, row('RWRW'));
    assert.equal(game.moveBall(1, -1), false);
    assert.equal(game.merge(), false);
    game.startPlay();
    assert.equal(game.history.length, 0);
    assert.deepEqual(game.boxes.map(b => b.red), [1, 0, 1, 0]);
});

test('every reachable small partition has its actual intervals, counts and legal moves', () => {
    for (let n = 1; n <= 3; n++) {
        const length = 2 * n;
        for (let bits = 0; bits < 2 ** length; bits++) {
            const balls = Array.from({ length }, (_, i) => bits & (1 << i) ? 'red' : 'white');
            if (balls.filter(c => c === 'red').length !== n) continue;
            const game = new BallBoxes(balls);
            const seen = new Set();
            function check(chunks) {
                const key = chunks.map(c => c.length).join(',');
                if (seen.has(key)) return;
                seen.add(key);
                let start = 0;
                const portions = [];
                chunks.forEach((chunk, i) => {
                    const red = chunk.filter(c => c === 'red').length;
                    assert.deepEqual(game.boxes[i], { start, size: chunk.length, red });
                    start += chunk.length;
                    portions.push(red / chunk.length);
                });
                const legal = portions.map((p, i) => i + 1 < portions.length && p <= portions[i + 1]);
                assert.equal(game.stuck, chunks.length > 1 && !legal.includes(true));
                legal.forEach((allowed, i) => {
                    assert.equal(game.canMergeAt(i), allowed);
                    if (!allowed) return;
                    assert.ok(pair(game, i + 1, i));
                    check([...chunks.slice(0, i), chunks[i].concat(chunks[i + 1]), ...chunks.slice(i + 2)]);
                    assert.ok(game.undo());
                });
            }
            check(balls.map(color => [color]));
        }
    }
});
