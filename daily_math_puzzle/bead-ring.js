import { BeadRing, MAX_BEADS } from './bead-ring-game.mjs';

const root = document.getElementById('bead-game');
const el = id => root.querySelector('#' + id);
const board = el('ring-board');
const words = {
    en: {
        language: '言語', length: 'Beads', guide: 'Tap a bead to switch its color.',
        patterns: 'Distinct patterns', changes: 'Color changes', direction: 'Clockwise',
        mark: 'Color changes here', undo: 'Undo', reset: 'Reset', group: 'Bead ring',
        bead: 'Bead', black: 'black', white: 'white',
        complete: 'All patterns appear.', incomplete: 'Some patterns are still missing.'
    },
    ja: {
        language: 'Language', length: '玉の数', guide: '玉を押すと白黒が切り替わります．',
        patterns: '現れた模様の種類', changes: '色の変わり目', direction: '時計回り',
        mark: '色が変わる場所', undo: '1手戻す', reset: 'リセット', group: '玉の輪',
        bead: '玉', black: '黒', white: '白',
        complete: 'すべての模様が現れました．', incomplete: 'まだ現れていない模様があります．'
    }
};
let game = new BeadRing();
let buttons = [];
let marks = [];

function update() {
    const t = words[el('ring-language').value];
    root.lang = el('ring-language').value;
    root.querySelectorAll('[data-label]').forEach(node => { node.textContent = t[node.dataset.label]; });
    board.setAttribute('aria-label', t.group);
    const { patterns, changes, complete } = game.inspect();
    const changed = new Set(changes);
    buttons.forEach((button, i) => {
        const black = game.beads[i];
        button.setAttribute('aria-pressed', String(black));
        button.setAttribute('aria-label', t.bead + ' ' + (i + 1) + ' (' + (black ? t.black : t.white) + ')');
        marks[i].hidden = !changed.has(i);
    });
    el('ring-patterns').textContent = patterns + ' / ' + 2 ** game.n;
    el('ring-changes').textContent = changes.length;
    el('ring-message').textContent = complete ? t.complete : t.incomplete;
    el('ring-message').dataset.state = complete ? 'complete' : '';
    el('ring-undo').disabled = !game.history.length;
    el('ring-reset').disabled = !game.history.length;
}

function layout() {
    const length = game.beads.length;
    const radius = Math.max(84, Math.ceil(29 / Math.sin(Math.PI / length)));
    const center = radius + 28;
    board.style.setProperty('--side', (2 * center) + 'px');
    function position(node, index) {
        const angle = (index / length - 0.25) * 2 * Math.PI;
        node.style.left = (center + radius * Math.cos(angle)) + 'px';
        node.style.top = (center + radius * Math.sin(angle)) + 'px';
    }
    for (const node of [...buttons, ...marks]) node.remove();
    marks = game.beads.map((_, index) => {
        const mark = document.createElement('span');
        mark.className = 'change-mark';
        mark.setAttribute('aria-hidden', 'true');
        position(mark, index + 0.5);
        board.append(mark);
        return mark;
    });
    buttons = game.beads.map((_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ring-bead';
        button.textContent = index + 1;
        position(button, index);
        button.addEventListener('click', () => { game.flip(index); update(); });
        button.addEventListener('keydown', event => {
            const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1,
                ArrowUp: index - 1, Home: 0, End: length - 1 }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            buttons[(next + length) % length].focus();
        });
        board.append(button);
        return button;
    });
    update();
}

function setSizes(n, length) {
    game = new BeadRing(n, length);
    el('ring-length').replaceChildren();
    for (let i = n; i <= MAX_BEADS; i++) el('ring-length').add(new Option(i, i));
    el('ring-length').value = String(length);
    layout();
}

el('ring-n').addEventListener('change', event => {
    const n = Number(event.target.value);
    setSizes(n, Math.max(n, game.beads.length));
});
el('ring-length').addEventListener('change', event => setSizes(game.n, Number(event.target.value)));
el('ring-language').addEventListener('change', update);
el('ring-undo').addEventListener('click', () => { game.undo(); update(); });
el('ring-reset').addEventListener('click', () => { game = new BeadRing(game.n, game.beads.length); update(); });
setSizes(game.n, game.beads.length);
root.hidden = false;
