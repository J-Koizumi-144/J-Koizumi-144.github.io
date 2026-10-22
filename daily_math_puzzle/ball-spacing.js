import { BallGame } from './ball-game.mjs';
const copy = {
    en: {
        language: '言語', distinct: 'Distinct values', valid: 'Pairs meeting the condition', minimum: 'Required gap',
        swap: 'Swap', undo: 'Undo', reset: 'Reset', records: 'Balls between each pair',
        choose: 'Select two balls, then press Swap.', second: 'Select one more ball.', ready: 'Ready to swap.',
        same: 'These balls have the same label. Choose another ball.', complete: 'All pairs meet the condition.',
        incomplete: 'Some pairs are too close.', board: 'Balls in a row',
        ball: (p, v) => `Position ${p}, ball ${v}`, record: (v, g, ok) => `Label ${v}: ${g} balls between, ${ok ? 'condition met' : 'too close'}`,
    },
    ja: {
        language: 'Language', distinct: '値の種類数', valid: '条件を満たす対', minimum: '間の個数の下限',
        swap: '交換する', undo: '1手戻す', reset: 'リセット', records: '同じ数のボールの間の個数',
        choose: 'ボールを2個選び，交換してください．', second: 'もう1個選んでください．', ready: '選んだ2個を交換できます．',
        same: '同じ数のボールです．別のボールを選んでください．', complete: 'すべての対が条件を満たしています．',
        incomplete: '間の個数が足りない対があります．', board: '一列に並んだボール',
        ball: (p, v) => `位置${p}，ボール${v}`, record: (v, g, ok) => `数${v}：間に${g}個，${ok ? '条件を満たす' : '個数不足'}`,
    },
};
const root = document.getElementById('ball-game');
const board = document.getElementById('ball-board');
const language = document.getElementById('ball-language');
const size = document.getElementById('ball-size');
const swap = document.getElementById('ball-swap');
const undo = document.getElementById('ball-undo');
let game = new BallGame(Number(size.value));
let selected = [];
let active = 0;
let buttons = [];
function buildBoard() {
    board.replaceChildren();
    buttons = game.balls.map((_, i) => {
        const slot = document.createElement('div');
        slot.className = 'ball-slot';
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'number-ball'; button.dataset.position = i;
        const position = document.createElement('span');
        position.className = 'ball-position'; position.textContent = i + 1; position.setAttribute('aria-hidden', 'true');
        slot.append(button, position); board.append(slot); return button;
    });
}
function render() {
    const t = copy[language.value], a = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    board.setAttribute('aria-label', t.board);
    buttons.forEach((button, i) => {
        button.textContent = game.balls[i];
        button.tabIndex = i === active ? 0 : -1;
        button.setAttribute('aria-pressed', String(selected.includes(i)));
        button.setAttribute('aria-label', t.ball(i + 1, game.balls[i]));
    });
    document.getElementById('ball-distinct').textContent = a.distinct;
    document.getElementById('ball-valid').textContent = `${a.valid} / ${game.n}`;
    document.getElementById('ball-minimum').textContent = game.n - 2;
    const records = document.getElementById('ball-records');
    records.replaceChildren(...a.records.map(record => {
        const item = document.createElement('li');
        item.textContent = `${record.label}: ${record.gap} ${record.valid ? '✓' : '×'}`;
        item.setAttribute('aria-label', t.record(record.label, record.gap, record.valid));
        item.dataset.valid = record.valid; return item;
    }));
    const same = selected.length === 2 && game.balls[selected[0]] === game.balls[selected[1]];
    swap.disabled = selected.length !== 2 || same;
    undo.disabled = !game.history.length;
    document.getElementById('ball-selection').textContent = t[same ? 'same' : selected.length === 2 ? 'ready' : selected.length ? 'second' : 'choose'];
    const message = document.getElementById('ball-message');
    message.textContent = t[a.complete ? 'complete' : 'incomplete'];
    message.dataset.state = a.complete ? 'complete' : '';
}
board.addEventListener('click', event => {
    const button = event.target.closest('button[data-position]');
    if (!button) return;
    active = Number(button.dataset.position);
    if (selected.includes(active)) selected = selected.filter(i => i !== active);
    else if (selected.length === 2) selected = [selected[0], active];
    else selected.push(active);
    render();
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-position]');
    if (!button) return;
    const current = Number(button.dataset.position);
    let next;
    if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
    else if (event.key === 'ArrowRight') next = Math.min(buttons.length - 1, current + 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault(); active = next;
    button.tabIndex = -1; buttons[next].tabIndex = 0; buttons[next].focus();
});
swap.addEventListener('click', () => { if (game.swap(...selected)) { selected = []; render(); } });
undo.addEventListener('click', () => { game.undo(); selected = []; render(); });
function reset() {
    game = new BallGame(Number(size.value)); selected = []; active = 0;
    buildBoard(); render(); root.querySelector('.ball-scroll').scrollLeft = 0;
}
document.getElementById('ball-reset').addEventListener('click', reset);
size.addEventListener('change', reset);
language.addEventListener('change', render);
buildBoard(); render(); root.hidden = false;
