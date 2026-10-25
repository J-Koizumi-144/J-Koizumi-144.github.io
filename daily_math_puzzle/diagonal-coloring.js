import { DiagonalGame } from './diagonal-game.mjs';

const copy = {
    en: {
        language: '言語', diagonal: 'Black on diagonal', black: 'Black cells', rows: 'Invalid rows', columns: 'Invalid columns',
        undo: 'Undo', reset: 'Reset', errors: 'Show invalid lines',
        guide: 'Click a cell to change its color. Numbers beside the grid count black cells.',
        legend: '• Main diagonal', done: 'All conditions met.', pending: 'Conditions not yet met.',
        board: s => `${s} by ${s} grid`, cell: (r, c, b) => `Row ${r}, column ${c}: ${b ? 'black' : 'white'}${r === c ? ', diagonal' : ''}`,
        line: (axis, i, x) => `${axis === 'row' ? 'Row' : 'Column'} ${i}: ${x.count} black; ${x.valid ? 'valid' : [x.count === 0 ? 'empty' : '', x.count > 0 && !x.consecutive ? 'not consecutive' : '', !x.distinct ? 'repeated count' : ''].filter(Boolean).join(', ')}`,
        summary: (d, r, c) => `${d} black on diagonal; ${r} invalid rows; ${c} invalid columns.`,
    },
    ja: {
        language: 'Language', diagonal: '対角線の黒マス', black: '黒マスの総数', rows: '不適合の行', columns: '不適合の列',
        undo: '1手戻す', reset: 'リセット', errors: '不適合の行・列を表示',
        guide: 'マスを押すと白黒が切り替わります．盤面の外の数は黒マスの個数です．',
        legend: '• 左上から右下への対角線', done: 'すべての条件を満たしています．', pending: 'まだ条件を満たしていません．',
        board: s => `${s}行${s}列の方眼`, cell: (r, c, b) => `${r}行${c}列：${b ? '黒' : '白'}${r === c ? '，対角線上' : ''}`,
        line: (axis, i, x) => `${i}${axis === 'row' ? '行' : '列'}：黒${x.count}個，${x.valid ? '適合' : [x.count === 0 ? '空' : '', x.count > 0 && !x.consecutive ? '連続していない' : '', !x.distinct ? '同じ個数がある' : ''].filter(Boolean).join('，')}`,
        summary: (d, r, c) => `対角線の黒マス${d}個，不適合の行${r}本，列${c}本．`,
    },
};
const root = document.getElementById('diagonal-game');
const board = document.getElementById('diagonal-board');
const sizeSelect = document.getElementById('diagonal-size');
const language = document.getElementById('diagonal-language');
const errors = document.getElementById('diagonal-errors');
const undo = document.getElementById('diagonal-undo');
const resetButton = document.getElementById('diagonal-reset');
let game = new DiagonalGame(Number(sizeSelect.value));
let active = 0;
function render(focusIndex) {
    const t = copy[language.value];
    const state = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    for (const [id, value] of Object.entries({ 'diagonal-count': state.diagonal, 'diagonal-black': state.black, 'diagonal-rows': state.invalidRows, 'diagonal-columns': state.invalidColumns })) document.getElementById(id).textContent = value;
    undo.disabled = game.history.length === 0;
    resetButton.disabled = game.history.length === 0;
    board.setAttribute('aria-label', t.board(game.size));
    board.style.setProperty('--size', game.size);
    const parts = [];
    for (const axis of ['row', 'column']) {
        const info = axis === 'row' ? state.rows : state.columns;
        info.forEach((line, i) => {
            const label = document.createElement('span');
            label.className = 'diagonal-count';
            label.textContent = line.count;
            label.title = t.line(axis, i + 1, line);
            label.setAttribute('aria-label', label.title);
            label.classList.toggle('invalid', errors.checked && !line.valid);
            label.style.gridRow = axis === 'row' ? i + 2 : 1;
            label.style.gridColumn = axis === 'column' ? i + 2 : 1;
            parts.push(label);
        });
    }
    game.cells.forEach((filled, index) => {
        const r = Math.floor(index / game.size), c = index % game.size;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'diagonal-cell';
        button.dataset.index = index;
        button.style.gridRow = r + 2;
        button.style.gridColumn = c + 2;
        button.tabIndex = index === active ? 0 : -1;
        button.setAttribute('aria-label', t.cell(r + 1, c + 1, filled));
        button.setAttribute('aria-pressed', String(filled));
        if (r === c) { const dot = document.createElement('span'); dot.textContent = '•'; dot.setAttribute('aria-hidden', 'true'); button.append(dot); }
        parts.push(button);
    });
    const scroller = board.parentElement;
    const left = scroller.scrollLeft;
    board.replaceChildren(...parts);
    scroller.scrollLeft = left;
    const message = document.getElementById('diagonal-message');
    message.textContent = state.valid ? t.done : t.pending;
    message.dataset.state = state.valid ? 'complete' : '';
    document.getElementById('diagonal-summary').textContent = t.summary(state.diagonal, state.invalidRows, state.invalidColumns);
    if (focusIndex !== undefined) board.querySelector(`[data-index="${focusIndex}"]`).focus({ preventScroll: true });
}
board.addEventListener('click', event => {
    const button = event.target.closest('.diagonal-cell');
    if (!button) return;
    active = Number(button.dataset.index);
    game.toggle(active);
    render(active);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('.diagonal-cell');
    if (!button) return;
    const index = Number(button.dataset.index), row = Math.floor(index / game.size), col = index % game.size;
    const next = { ArrowLeft: col ? index - 1 : index, ArrowRight: col < game.size - 1 ? index + 1 : index, ArrowUp: row ? index - game.size : index, ArrowDown: row < game.size - 1 ? index + game.size : index, Home: event.ctrlKey ? 0 : row * game.size, End: event.ctrlKey ? game.cells.length - 1 : (row + 1) * game.size - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    active = next;
    button.tabIndex = -1;
    const target = board.querySelector(`[data-index="${next}"]`);
    target.tabIndex = 0;
    target.focus();
});
undo.addEventListener('click', () => {
    const index = game.undo();
    if (index !== false) { active = index; render(index); board.querySelector(`[data-index="${index}"]`).scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
});
function reset() {
    game = new DiagonalGame(Number(sizeSelect.value));
    active = 0;
    render();
    board.parentElement.scrollLeft = 0;
}
resetButton.addEventListener('click', reset);
sizeSelect.addEventListener('change', reset);
language.addEventListener('change', () => render());
errors.addEventListener('change', () => render());
render();
root.hidden = false;
