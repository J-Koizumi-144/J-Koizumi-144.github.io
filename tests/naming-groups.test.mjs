import test from 'node:test';
import assert from 'node:assert/strict';
import { NamingGame } from '../daily_math_puzzle/naming-game.mjs';

const five = [[1, 2], [0, 3], [0, 4], [1, 4], [2, 3]];

test('every nomination has two distinct other people at each supported size', () => {
    for (const n of [1, 2, 3]) {
        const game = new NamingGame(n);
        assert.equal(game.size, 5 * n);
        game.names.forEach((pair, person) => {
            assert.equal(new Set(pair).size, 2);
            pair.forEach(target => assert.ok(target >= 0 && target < game.size && target !== person));
        });
    }
    assert.throws(() => new NamingGame(0), RangeError);
    assert.throws(() => new NamingGame(4), RangeError);
});

test('changing a nomination clears the group before it can become incompatible', () => {
    const game = new NamingGame(1, five);
    assert.deepEqual(game.analysis, { selected: 0, valid: false });
    game.toggle(0); game.toggle(3);
    assert.deepEqual(game.analysis, { selected: 2, valid: true });
    assert.equal(game.name(0, 0, 3), true);
    assert.deepEqual(game.analysis, { selected: 0, valid: false });
    assert.equal(game.toggle(0), true);
    assert.equal(game.toggle(3), false);
    assert.equal(game.undo(), true);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.group, [true, false, false, true, false]);
    assert.deepEqual(game.names[0], [1, 2]);
});

test('a person cannot join when either direction of nomination reaches the group', () => {
    const game = new NamingGame(1, [[1, 2], [3, 4], [3, 4], [0, 4], [1, 2]]);
    assert.equal(game.toggle(0), true);
    assert.equal(game.groupBlockReason(1), 'named');
    assert.equal(game.groupBlockReason(3), 'names');
    assert.equal(game.groupBlockReason(4), null);
    assert.equal(game.toggle(1), false);
    assert.equal(game.toggle(3), false);
    assert.equal(game.history.length, 1);
    assert.equal(game.toggle(4), true);
    assert.deepEqual(game.analysis, { selected: 2, valid: true });
    assert.equal(game.toggle(0), true);
    assert.equal(game.group[0], false);
    assert.equal(game.undo(), true);
    assert.equal(game.group[0], true);
});

test('names remain distinct, edits clear the group, undo and reset restore state', () => {
    const game = new NamingGame(1, five);
    game.toggle(0); game.toggle(3);
    assert.equal(game.name(0, 0, 4), true);
    assert.deepEqual(game.group, [false, false, false, false, false]);
    assert.equal(game.name(0, 1, 4), false);
    assert.equal(game.name(0, 1, 0), false);
    assert.equal(game.name(0, 1, 5), false);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.group, [true, false, false, true, false]);
    assert.deepEqual(game.names[0], [1, 2]);
    assert.equal(game.reset(), true);
    assert.deepEqual(game.analysis, { selected: 0, valid: false });
    assert.equal(game.undo(), false);
});

test('name buttons allow a temporary gap, then restore exactly two nominations', () => {
    const game = new NamingGame(1, five);
    game.toggle(0); game.toggle(3);
    assert.equal(game.analysis.valid, true);
    assert.equal(game.toggleName(0, 1), true);
    assert.deepEqual(game.names[0], [2]);
    assert.deepEqual(game.group, [false, false, false, false, false]);
    assert.equal(game.analysis.valid, false);
    assert.equal(game.toggleName(0, 0), false);
    assert.equal(game.toggleName(0, 5), false);
    assert.equal(game.toggleName(0, 3), true);
    assert.deepEqual(game.names[0], [2, 3]);
    assert.equal(game.toggleName(0, 4), false);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.names[0], [2]);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.names[0], [1, 2]);
    assert.deepEqual(game.group, [true, false, false, true, false]);
    assert.equal(game.analysis.valid, true);
});

test('finishing an edit can clear a newly selected group and undo restores it', () => {
    const game = new NamingGame(1, five);
    game.toggle(0); game.toggle(3);
    assert.equal(game.clearGroup(), true);
    assert.deepEqual(game.group, [false, false, false, false, false]);
    assert.equal(game.clearGroup(), false);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.group, [true, false, false, true, false]);
});

test('randomizing changes nominations, completes gaps, clears the group, and can be undone', () => {
    for (const n of [1, 2, 3]) {
        const game = new NamingGame(n);
        game.toggle(0);
        const before = game.snapshot();
        assert.equal(game.randomize(), true);
        assert.ok(game.names.some((pair, person) =>
            pair.some(target => !before.names[person].includes(target))));
        assert.ok(game.names.every((pair, person) => pair.length === 2 &&
            new Set(pair).size === 2 && pair.every(target => target !== person && target < game.size)));
        assert.equal(game.analysis.selected, 0);
        assert.equal(game.undo(), true);
        assert.deepEqual(game.snapshot(), before);

        game.toggleName(0, game.names[0][0]);
        const incomplete = game.snapshot();
        assert.equal(incomplete.names[0].length, 1);
        game.randomize();
        assert.ok(game.names.every(pair => pair.length === 2));
        assert.equal(game.undo(), true);
        assert.deepEqual(game.snapshot(), incomplete);
    }
});
