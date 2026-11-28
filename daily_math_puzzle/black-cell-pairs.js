import { BlackCellPairsGame } from './black-cell-pairs-game.mjs';

const app = document.getElementById('black-cell-pairs');
const board = document.getElementById('pairs-board');
const languageSelect = document.getElementById('pairs-language');
const sizeSelect = document.getElementById('pairs-size');
const undoButton = document.getElementById('pairs-undo');
const resetButton = document.getElementById('pairs-reset');
const status = document.getElementById('pairs-status');
let game = new BlackCellPairsGame(Number(sizeSelect.value));
let language = languageSelect.value;
let focusedIndex = 0;

const copy = {
    en: {
        language: '言語', languageName: 'Language', size: 'Grid size',
        instruction: 'Click a cell to switch between black and white.',
        black: 'Black cells', undo: 'Undo', reset: 'Reset',
        empty: 'Paint at least one cell.', valid: 'All pairs are distinct.',
        repeated: (pair, count) => `Repeated pair: ${pair} · ${count} cells highlighted.`,
        grid: n => `${n} by ${n} grid`,
        cell: (row, column, pair, highlighted) => `Row ${row}, column ${column}, `
            + (pair ? `black, pair ${pair}` : 'white')
            + (highlighted ? ', highlighted repeated pair' : ''),
    },
    ja: {
        language: 'Language', languageName: '言語', size: '盤面の大きさ',
        instruction: 'マスを押すと白黒が切り替わります．',
        black: '黒いマス', undo: '1手戻す', reset: 'リセット',
        empty: '1マス以上を黒く塗ってください．', valid: 'すべての組が異なります．',
        repeated: (pair, count) => `重複する組：${pair}（${count}マスを強調表示）`,
        grid: n => `${n}行${n}列のマス目`,
        cell: (row, column, pair, highlighted) => `${row}行${column}列，`
            + (pair ? `黒，組${pair}` : '白')
            + (highlighted ? '，重複する組を強調表示' : ''),
    },
};
const pairText = pair => `(${pair[0]},${pair[1]})`;

function buildBoard() {
    board.replaceChildren();
    board.style.setProperty('--grid-size', game.n);
    for (let index = 0; index < game.cells.length; index++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pairs-cell';
        button.dataset.index = index;
        board.append(button);
    }
}

function setFocus(index, moveFocus = false) {
    focusedIndex = index;
    for (const button of board.children) button.tabIndex = Number(button.dataset.index) === index ? 0 : -1;
    if (moveFocus) board.children[index].focus({ preventScroll: true });
}

function render() {
    const text = copy[language];
    const analysis = game.analysis;
    const highlighted = new Set(analysis.duplicate?.indices ?? []);
    app.lang = language;
    app.querySelectorAll('[data-copy]').forEach(element => {
        element.textContent = text[element.dataset.copy];
    });
    document.getElementById('pairs-language-label').lang = language === 'en' ? 'ja' : 'en';
    languageSelect.setAttribute('aria-label', text.languageName);
    sizeSelect.setAttribute('aria-label', text.size);
    board.setAttribute('aria-label', text.grid(game.n));
    document.getElementById('pairs-black').textContent = analysis.black;
    for (const button of board.children) {
        const index = Number(button.dataset.index);
        const pair = analysis.labels[index];
        button.textContent = pair ? pairText(pair) : '';
        button.setAttribute('aria-pressed', String(game.cells[index]));
        button.classList.toggle('is-duplicate', highlighted.has(index));
        button.setAttribute('aria-label', text.cell(
            Math.floor(index / game.n) + 1, index % game.n + 1,
            pair ? pairText(pair) : null, highlighted.has(index),
        ));
    }
    status.dataset.state = analysis.black === 0 ? 'empty' : analysis.duplicate ? 'duplicate' : 'valid';
    status.textContent = analysis.black === 0 ? text.empty : analysis.duplicate
        ? text.repeated(pairText(analysis.duplicate.pair), analysis.duplicate.indices.length) : text.valid;
    undoButton.disabled = game.history.length === 0;
    resetButton.disabled = analysis.black === 0 && game.history.length === 0;
    setFocus(focusedIndex);
}

board.addEventListener('click', event => {
    const button = event.target.closest('.pairs-cell');
    if (!button || !board.contains(button)) return;
    const index = Number(button.dataset.index);
    game.toggle(index);
    focusedIndex = index;
    render();
    setFocus(index, true);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('.pairs-cell');
    if (!button) return;
    const index = Number(button.dataset.index);
    const row = Math.floor(index / game.n);
    const column = index % game.n;
    let next = index;
    if (event.key === 'ArrowLeft') next = row * game.n + Math.max(0, column - 1);
    else if (event.key === 'ArrowRight') next = row * game.n + Math.min(game.n - 1, column + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * game.n + column;
    else if (event.key === 'ArrowDown') next = Math.min(game.n - 1, row + 1) * game.n + column;
    else if (event.key === 'Home') next = event.ctrlKey ? 0 : row * game.n;
    else if (event.key === 'End') next = event.ctrlKey ? game.cells.length - 1 : (row + 1) * game.n - 1;
    else return;
    event.preventDefault();
    setFocus(next, true);
});
undoButton.addEventListener('click', () => {
    const index = game.undo();
    if (index === null) return;
    focusedIndex = index;
    render();
    setFocus(index, true);
});
resetButton.addEventListener('click', () => {
    game.reset();
    focusedIndex = 0;
    render();
    setFocus(0, true);
});
sizeSelect.addEventListener('change', () => {
    game = new BlackCellPairsGame(Number(sizeSelect.value));
    focusedIndex = 0;
    buildBoard();
    render();
});
languageSelect.addEventListener('change', () => {
    language = languageSelect.value;
    render();
});
buildBoard();
render();
app.hidden = false;
