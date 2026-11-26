import { N_VALUES, createSession, evaluateTable, toggleNumber, undoMove, resetColors } from './column-colors-game.mjs';

const root = document.getElementById('column-colors');
const board = document.getElementById('colors-board');
const sizeSelect = document.getElementById('colors-size');
const languageSelect = document.getElementById('colors-language');
const undoButton = document.getElementById('colors-undo');
const resetButton = document.getElementById('colors-reset');
const newButton = document.getElementById('colors-new');
const status = document.getElementById('colors-status');
const copy = {
    en: {
        language: '言語',
        instruction: 'Tap a number to switch all its cells between red and blue.',
        score: 'Score', target: 'Target', undo: 'Undo', reset: 'Reset colors', newTable: 'New table',
        red: 'Red', blue: 'Blue', point: 'Scoring column',
        board: count => `A’s table, 2 rows and ${count} columns. Use arrow keys to move between cells.`,
        cell: (row, col, number, color) => `${row === 0 ? 'Top' : 'Bottom'}, column ${col + 1}: ${number}, ${color}. Switch all ${number}s to ${color === 'red' ? 'blue' : 'red'}.`,
        progress: (score, n) => score >= n ? `Target reached · ${score} / ${n}` : `Score ${score} / ${n}`,
    },
    ja: {
        language: 'Language',
        instruction: '数字を押すと，同じ数字のマスがすべて赤・青に切り替わります．',
        score: '得点', target: '目標', undo: '1手戻す', reset: '色をリセット', newTable: '別の表',
        red: '赤', blue: '青', point: '得点になる列',
        board: count => `Aさんが書き込んだ2行${count}列の表．矢印キーでマスを移動できます．`,
        cell: (row, col, number, color) => `${col + 1}列目の${row === 0 ? '上' : '下'}：${number}，${color === 'red' ? '赤' : '青'}．すべての${number}を${color === 'red' ? '青' : '赤'}にする．`,
        progress: (score, n) => score >= n ? `目標達成 · ${score} / ${n}` : `得点 ${score} / ${n}`,
    },
};
let state = createSession();
let language = 'en';
let focusKey = '0-0';

for (const n of N_VALUES) sizeSelect.add(new Option(String(n), String(n), false, n === state.n));

function buildBoard() {
    board.replaceChildren();
    board.style.setProperty('--count', state.bottom.length);
    for (let column = 0; column < state.bottom.length; column++) {
        const pair = document.createElement('div');
        pair.className = 'colors-column';
        pair.dataset.column = column;
        for (let row = 0; row < 2; row++) {
            const number = row === 0 ? column + 1 : state.bottom[column];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'colors-cell';
            button.dataset.number = number;
            button.dataset.row = row;
            button.dataset.column = column;
            button.dataset.key = `${row}-${column}`;
            button.innerHTML = `<span class="colors-number">${number}</span><span class="colors-symbol" aria-hidden="true"></span>`;
            pair.append(button);
        }
        const mark = document.createElement('span');
        mark.className = 'colors-mark';
        mark.setAttribute('aria-hidden', 'true');
        pair.append(mark);
        board.append(pair);
    }
    focusKey = '0-0';
    fitBoard();
}

function fitBoard() {
    const available = Math.max(44, board.clientWidth);
    const columns = Math.max(1, Math.min(state.bottom.length, Math.floor(available / 44)));
    board.style.setProperty('--columns', columns);
}

function render() {
    const labels = copy[language];
    const result = evaluateTable(state.bottom, state.colors);
    root.lang = language;
    for (const element of root.querySelectorAll('[data-copy]')) element.textContent = labels[element.dataset.copy];
    document.getElementById('colors-language-label').lang = language === 'en' ? 'ja' : 'en';
    board.setAttribute('aria-label', labels.board(state.bottom.length));
    board.dataset.complete = String(result.complete);
    document.getElementById('colors-score').textContent = result.score;
    document.getElementById('colors-target').textContent = state.n;
    for (const button of board.querySelectorAll('.colors-cell')) {
        const number = Number(button.dataset.number);
        const color = state.colors[number - 1];
        button.dataset.color = color;
        button.setAttribute('aria-pressed', String(color === 'red'));
        button.setAttribute('aria-label', labels.cell(Number(button.dataset.row), Number(button.dataset.column), number, color));
        button.querySelector('.colors-symbol').textContent = color === 'red' ? '●' : '◆';
        button.tabIndex = button.dataset.key === focusKey ? 0 : -1;
    }
    for (const pair of board.children) {
        const scores = result.columns[Number(pair.dataset.column)];
        pair.dataset.scoring = String(scores);
        pair.querySelector('.colors-mark').textContent = scores ? '✓' : '';
    }
    status.dataset.state = result.complete ? 'complete' : 'active';
    status.textContent = labels.progress(result.score, state.n);
    undoButton.disabled = state.history.length === 0;
    resetButton.disabled = state.history.length === 0;
}

function newTable() {
    state = createSession(Number(sizeSelect.value));
    buildBoard();
    render();
}

board.addEventListener('click', event => {
    const button = event.target.closest('.colors-cell');
    if (!button) return;
    focusKey = button.dataset.key;
    toggleNumber(state, Number(button.dataset.number));
    render();
});
board.addEventListener('focusin', event => {
    const button = event.target.closest('.colors-cell');
    if (!button) return;
    focusKey = button.dataset.key;
    for (const item of board.querySelectorAll('.colors-cell')) item.tabIndex = item === button ? 0 : -1;
});
board.addEventListener('keydown', event => {
    const current = event.target.closest('.colors-cell');
    if (!current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const perLine = Number(board.style.getPropertyValue('--columns'));
    const count = state.bottom.length;
    let row = Number(current.dataset.row);
    let column = Number(current.dataset.column);
    if (event.key === 'Home') column = 0;
    if (event.key === 'End') column = count - 1;
    if (event.key === 'ArrowLeft') column = Math.max(0, column - 1);
    if (event.key === 'ArrowRight') column = Math.min(count - 1, column + 1);
    if (event.key === 'ArrowDown') {
        if (row === 0) row = 1;
        else if (column + perLine < count) { column += perLine; row = 0; }
    }
    if (event.key === 'ArrowUp') {
        if (row === 1) row = 0;
        else if (column - perLine >= 0) { column -= perLine; row = 1; }
    }
    board.querySelector(`[data-key="${row}-${column}"]`).focus();
});
sizeSelect.addEventListener('change', newTable);
newButton.addEventListener('click', newTable);
undoButton.addEventListener('click', () => { undoMove(state); render(); });
resetButton.addEventListener('click', () => { resetColors(state); render(); });
languageSelect.addEventListener('change', () => { language = languageSelect.value; render(); });

buildBoard();
render();
root.hidden = false;
fitBoard();
new ResizeObserver(fitBoard).observe(board);
