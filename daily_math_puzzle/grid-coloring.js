import { GridGame } from './grid-game.mjs';

const copy = {
    en: {
        language: '言語', black: 'Black cells', rows: 'Empty rows', columns: 'Empty columns',
        squares: 'Invalid 2 × 2', errors: 'Show errors', undo: 'Undo', reset: 'Reset',
        board: size => `${size} by ${size} grid`,
        cell: (row, column, filled) => `Row ${row}, column ${column}: ${filled ? 'black' : 'white'}`,
        row: index => `Row ${index}`, column: index => `Column ${index}`,
        choose: 'Click a cell to change its color.', done: 'All conditions met.',
        summary: (black, rows, columns, squares) => `${black} black cells; ${rows} empty rows; ${columns} empty columns; ${squares} invalid 2 by 2 squares.`,
    },
    ja: {
        language: 'Language', black: '黒マス', rows: '空の行', columns: '空の列',
        squares: '不適合の 2 × 2', errors: '不備を表示', undo: '1手戻す', reset: 'リセット',
        board: size => `${size}行${size}列の方眼`,
        cell: (row, column, filled) => `${row}行${column}列：${filled ? '黒' : '白'}`,
        row: index => `${index}行`, column: index => `${index}列`,
        choose: 'マスを押すと白黒が切り替わります．', done: 'すべての条件を満たしています．',
        summary: (black, rows, columns, squares) => `黒マス${black}個，空の行${rows}本，空の列${columns}本，不適合の小正方形${squares}個．`,
    },
};

const root = document.getElementById('grid-game');
const board = document.getElementById('coloring-board');
const message = document.getElementById('grid-message');
const undoButton = document.getElementById('undo-cell');
const sizeSelect = document.getElementById('grid-size');
const languageSelect = document.getElementById('grid-language');
const errorsCheckbox = document.getElementById('show-grid-errors');
let game = new GridGame(Number(sizeSelect.value));
let activeIndex = 0;

function render(focusIndex) {
    const t = copy[languageSelect.value];
    const state = game.analysis;
    root.lang = languageSelect.value;
    root.querySelectorAll('[data-label]').forEach(element => {
        element.textContent = t[element.dataset.label];
    });
    for (const [id, value] of Object.entries({
        'black-total': state.black, 'empty-rows': state.emptyRows,
        'empty-columns': state.emptyColumns, 'invalid-squares': state.invalidSquares.length,
    })) document.getElementById(id).textContent = value;
    undoButton.disabled = game.history.length === 0;
    board.setAttribute('aria-label', t.board(game.size));
    board.style.setProperty('--grid-size', game.size);
    const children = [];
    for (let index = 0; index < game.size; index++) {
        for (const axis of ['row', 'column']) {
            const label = document.createElement('span');
            label.className = 'grid-coordinate';
            label.textContent = index + 1;
            label.title = t[axis](index + 1);
            label.setAttribute('aria-hidden', 'true');
            label.style.gridRow = axis === 'row' ? index + 2 : 1;
            label.style.gridColumn = axis === 'column' ? index + 2 : 1;
            const empty = (axis === 'row' ? state.rows : state.columns)[index] === 0;
            label.classList.toggle('grid-error', errorsCheckbox.checked && empty);
            children.push(label);
        }
    }
    game.cells.forEach((filled, index) => {
        const row = Math.floor(index / game.size);
        const column = index % game.size;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'grid-cell';
        button.dataset.index = index;
        button.style.gridRow = row + 2;
        button.style.gridColumn = column + 2;
        button.tabIndex = index === activeIndex ? 0 : -1;
        button.setAttribute('aria-label', t.cell(row + 1, column + 1, filled));
        button.setAttribute('aria-pressed', String(filled));
        children.push(button);
    });
    if (errorsCheckbox.checked) {
        for (const { row, column } of state.invalidSquares) {
            const marker = document.createElement('span');
            marker.className = 'grid-square-error';
            marker.textContent = '×';
            marker.style.gridRow = `${row + 2} / span 2`;
            marker.style.gridColumn = `${column + 2} / span 2`;
            marker.setAttribute('aria-hidden', 'true');
            children.push(marker);
        }
    }
    board.replaceChildren(...children);
    message.textContent = state.valid ? t.done : t.choose;
    message.dataset.state = state.valid ? 'complete' : '';
    document.getElementById('grid-summary').textContent = t.summary(
        state.black, state.emptyRows, state.emptyColumns, state.invalidSquares.length,
    );
    if (focusIndex !== undefined) {
        board.querySelector(`[data-index="${focusIndex}"]`).focus({ preventScroll: true });
    }
}

board.addEventListener('click', event => {
    const button = event.target.closest('.grid-cell');
    if (!button) return;
    activeIndex = Number(button.dataset.index);
    game.toggle(activeIndex);
    render(activeIndex);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('.grid-cell');
    if (!button) return;
    const index = Number(button.dataset.index);
    const row = Math.floor(index / game.size);
    const column = index % game.size;
    let next;
    switch (event.key) {
        case 'ArrowLeft': next = column > 0 ? index - 1 : index; break;
        case 'ArrowRight': next = column < game.size - 1 ? index + 1 : index; break;
        case 'ArrowUp': next = row > 0 ? index - game.size : index; break;
        case 'ArrowDown': next = row < game.size - 1 ? index + game.size : index; break;
        default: return;
    }
    event.preventDefault();
    activeIndex = next;
    button.tabIndex = -1;
    const target = board.querySelector(`[data-index="${next}"]`);
    target.tabIndex = 0;
    target.focus();
});
undoButton.addEventListener('click', () => {
    const index = game.undo();
    if (index !== false) {
        activeIndex = index;
        render(index);
    }
});
function reset() {
    game = new GridGame(Number(sizeSelect.value));
    activeIndex = 0;
    render();
}
document.getElementById('reset-grid').addEventListener('click', reset);
sizeSelect.addEventListener('change', reset);
languageSelect.addEventListener('change', () => render());
errorsCheckbox.addEventListener('change', () => render());
render();
root.hidden = false;
