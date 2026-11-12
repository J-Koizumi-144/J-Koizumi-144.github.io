import { boardSizes, CoinCrossGame } from './coin-cross-game.mjs';

const words = {
    en: {
        size: 'Board size', language: '言語', moves: 'Moves', tails: 'Tails up',
        undo: 'Undo', reset: 'Reset', complete: 'All coins are tails up.',
        marks: ['H', 'T'], faces: ['heads', 'tails'],
        board: n => `${n} by ${n} coin board`,
        cell: (row, column, face) => `Row ${row}, column ${column}, ${face}`,
        summary: (moves, tails, total) => `Moves: ${moves}. Tails up: ${tails} of ${total}.`,
    },
    ja: {
        size: '盤面の大きさ', language: 'Language', moves: '操作回数', tails: '裏向きの枚数',
        undo: '1手戻す', reset: 'リセット', complete: 'すべてのコインが裏向きになりました．',
        marks: ['表', '裏'], faces: ['表', '裏'],
        board: n => `${n}行${n}列のコインの盤面`,
        cell: (row, column, face) => `${row}行${column}列，${face}`,
        summary: (moves, tails, total) => `${moves}回の操作，${total}枚中${tails}枚が裏向き．`,
    },
};

const root = document.getElementById('coin-cross');
const board = document.getElementById('cross-board');
const language = document.getElementById('cross-language');
const languageLabel = document.getElementById('cross-language-label');
const size = document.getElementById('cross-size');
const moves = document.getElementById('cross-moves');
const tails = document.getElementById('cross-tails');
const total = document.getElementById('cross-total');
const complete = document.getElementById('cross-complete');
const announcement = document.getElementById('cross-announcement');
const undo = document.getElementById('cross-undo');
const reset = document.getElementById('cross-reset');
let game = new CoinCrossGame();
let active = 0;

for (const n of boardSizes) size.add(new Option(`${n} × ${n}`, String(n)));
size.value = String(game.size);

function makeBoard() {
    active = 0;
    board.style.setProperty('--side', game.size);
    const buttons = game.cells.map((_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cross-cell';
        button.dataset.index = index;
        button.tabIndex = index === active ? 0 : -1;
        button.innerHTML = '<span class="cross-token" aria-hidden="true"><span class="cross-head"></span><span class="cross-tail"></span></span>';
        return button;
    });
    board.replaceChildren(...buttons);
}

function labelControls() {
    const t = words[language.value];
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    languageLabel.lang = language.value === 'en' ? 'ja' : 'en';
    languageLabel.textContent = t.language;
    board.setAttribute('aria-label', t.board(game.size));
    for (const button of board.children) {
        button.querySelector('.cross-head').textContent = t.marks[0];
        button.querySelector('.cross-tail').textContent = t.marks[1];
    }
}

function render() {
    const t = words[language.value];
    const count = game.tails;
    const turns = game.history.length;
    game.cells.forEach((isTails, index) => {
        const button = board.children[index];
        const row = Math.floor(index / game.size) + 1;
        const column = index % game.size + 1;
        button.setAttribute('aria-label', t.cell(row, column, t.faces[Number(isTails)]));
        button.setAttribute('aria-pressed', String(isTails));
    });
    moves.textContent = turns;
    tails.textContent = count;
    total.textContent = game.cells.length;
    undo.disabled = reset.disabled = turns === 0;
    complete.hidden = !game.complete;
    announcement.textContent = t.summary(turns, count, game.cells.length)
        + (game.complete ? ' ' + t.complete : '');
}

function focusCell(index) {
    board.children[active].tabIndex = -1;
    active = index;
    const button = board.children[active];
    button.tabIndex = 0;
    button.focus({ preventScroll: true });
}

board.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const index = Number(button.dataset.index);
    game.play(index);
    render();
    focusCell(index);
});

board.addEventListener('keydown', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const index = Number(button.dataset.index);
    const column = index % game.size;
    let next;
    switch (event.key) {
        case 'ArrowLeft': next = column > 0 ? index - 1 : index; break;
        case 'ArrowRight': next = column < game.size - 1 ? index + 1 : index; break;
        case 'ArrowUp': next = index >= game.size ? index - game.size : index; break;
        case 'ArrowDown': next = index + game.size < game.cells.length ? index + game.size : index; break;
        case 'Home': next = index - column; break;
        case 'End': next = index - column + game.size - 1; break;
        default: return;
    }
    event.preventDefault();
    focusCell(next);
});

undo.addEventListener('click', () => {
    const index = game.undo();
    if (index === null) return;
    render();
    focusCell(index);
});
reset.addEventListener('click', () => {
    game.reset();
    render();
    focusCell(0);
});
size.addEventListener('change', () => {
    game = new CoinCrossGame(Number(size.value));
    makeBoard();
    labelControls();
    render();
});
language.addEventListener('change', () => {
    labelControls();
    render();
});

makeBoard();
labelControls();
render();
root.hidden = false;
