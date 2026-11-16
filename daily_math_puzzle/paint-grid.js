import { GRID_SIZES, PaintGrid, boundaryEdges } from './paint-grid-game.mjs';

const app = document.querySelector('#paint-game');
const board = app.querySelector('#paint-board');
const language = app.querySelector('#paint-language');
const sizeSelect = app.querySelector('#paint-size');
const undo = app.querySelector('#paint-undo');
const reset = app.querySelector('#paint-reset');
const movesLabel = app.querySelector('[data-text="moves"]');
const labels = {
    en: {
        size: 'Grid size', length: 'Boundary length', moves: 'Moves', done: 'All moves complete',
        undo: 'Undo', reset: 'Reset', otherLanguage: '言語',
        instruction: 'Tap a button on the left to paint a row red, or one above the grid to paint a column blue.',
        ready: 'Ready to paint.', cleared: 'Grid cleared.', undone: 'Last move undone.',
        red: 'red', blue: 'blue', white: 'white',
        gridName: size => `${size} by ${size} painting grid`,
        brush: (axis, i, used) => used
            ? `${axis === 'row' ? 'Row' : 'Column'} ${i} (used)`
            : `Paint ${axis} ${i} ${axis === 'row' ? 'red' : 'blue'}`,
        played: (axis, i) => `${axis === 'row' ? 'Row' : 'Column'} ${i} painted ${axis === 'row' ? 'red' : 'blue'}.`,
        summary: (length, moves, total) => `Boundary length ${length}. ${moves} of ${total} moves.`,
    },
    ja: {
        size: '盤面の大きさ', length: '境界線の長さ', moves: '手数', done: 'すべての操作が完了',
        undo: '1手戻す', reset: 'リセット', otherLanguage: 'Language',
        instruction: '左のボタンでその行を赤く、上のボタンでその列を青く塗れます。',
        ready: '塗り始められます。', cleared: '白い盤面に戻しました。', undone: '1手戻しました。',
        red: '赤', blue: '青', white: '白',
        gridName: size => `縦横${size}マスの方眼`,
        brush: (axis, i, used) => {
            const line = axis === 'row' ? `${i}行目` : `${i}列目`;
            return used ? `${line}（操作済み）` : `${line}を${axis === 'row' ? '赤' : '青'}く塗る`;
        },
        played: (axis, i) => axis === 'row' ? `${i}行目を赤く塗りました。` : `${i}列目を青く塗りました。`,
        summary: (length, moves, total) => `境界線の長さ${length}。全${total}手中${moves}手。`,
    },
};

let game = new PaintGrid();
let cells;
let rowButtons;
let columnButtons;
let status = { key: 'ready' };
const t = () => labels[language.value];

function makeBrush(axis, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'paint-brush';
    button.dataset.axis = axis;
    button.dataset.index = index;
    const face = document.createElement('span');
    face.className = 'brush-face';
    face.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('span');
    icon.className = 'brush-icon';
    face.append(String(index + 1), icon);
    button.append(face);
    return button;
}

function rebuildBoard() {
    // Padding for a header is part of the tap target. Cells share the same pitch.
    board.style.setProperty('--board-width', (game.size + 1) * 58 + 'px');
    const head = document.createElement('thead');
    const body = document.createElement('tbody');
    const headers = head.insertRow();
    const corner = headers.insertCell();
    corner.className = 'paint-corner';
    corner.setAttribute('aria-hidden', 'true');
    columnButtons = [];
    rowButtons = [];
    cells = [];
    for (let col = 0; col < game.size; col++) {
        const th = document.createElement('th');
        th.scope = 'col';
        const button = makeBrush('column', col);
        th.append(button);
        headers.append(th);
        columnButtons.push(button);
    }
    for (let row = 0; row < game.size; row++) {
        const tr = body.insertRow();
        const th = document.createElement('th');
        th.scope = 'row';
        const button = makeBrush('row', row);
        th.append(button);
        tr.append(th);
        rowButtons.push(button);
        cells.push(Array.from({ length: game.size }, () => tr.insertCell()));
    }
    board.replaceChildren(head, body);
}

function refresh() {
    const words = t();
    app.lang = language.value;
    app.querySelectorAll('[data-text]').forEach(el => { el.textContent = words[el.dataset.text]; });
    const languageLabel = app.querySelector('#paint-lang-label');
    languageLabel.lang = language.value === 'en' ? 'ja' : 'en';
    languageLabel.textContent = words.otherLanguage;
    app.querySelector('#paint-instruction').textContent = words.instruction;
    board.setAttribute('aria-label', words.gridName(game.size));
    for (const button of [...columnButtons, ...rowButtons]) {
        const axis = button.dataset.axis;
        const index = Number(button.dataset.index);
        const used = !game.canPaint(axis, index);
        button.setAttribute('aria-disabled', String(used));
        button.setAttribute('aria-label', words.brush(axis, index + 1, used));
        button.querySelector('.brush-icon').textContent = used ? '✓' : axis === 'row' ? '→' : '↓';
    }
    const colors = game.colors();
    const edges = boundaryEdges(colors);
    for (const [row, line] of colors.entries()) {
        for (const [col, color] of line.entries()) {
            const cell = cells[row][col];
            cell.dataset.color = color;
            cell.className = '';
            cell.setAttribute('aria-label', words[color]);
        }
    }
    for (const edge of edges) cells[edge.row][edge.column].classList.add('edge-' + edge.side);
    const moves = game.moves.length;
    const total = 2 * game.size;
    app.querySelector('#paint-length').textContent = edges.length;
    app.querySelector('#paint-moves').textContent = moves;
    app.querySelector('#paint-total').textContent = ' / ' + total;
    app.querySelector('.paint-stats').dataset.complete = game.complete;
    movesLabel.textContent = game.complete ? words.done : words.moves;
    undo.disabled = reset.disabled = moves === 0;
    const message = status.key === 'played' ? words.played(status.axis, status.index + 1) : words[status.key];
    app.querySelector('#paint-status').textContent =
        [message, words.summary(edges.length, moves, total), game.complete ? words.done : ''].filter(Boolean).join(' ');
}

board.addEventListener('click', event => {
    const button = event.target.closest('button[data-axis]');
    if (!button) return;
    const axis = button.dataset.axis;
    const index = Number(button.dataset.index);
    if (!game.paint(axis, index)) return;
    status = { key: 'played', axis, index };
    refresh();
});

board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-axis]');
    if (!button) return;
    const axis = button.dataset.axis;
    const buttons = axis === 'row' ? rowButtons : columnButtons;
    let index = Number(button.dataset.index);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else if (event.key === (axis === 'row' ? 'ArrowUp' : 'ArrowLeft')) index--;
    else if (event.key === (axis === 'row' ? 'ArrowDown' : 'ArrowRight')) index++;
    else return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(index, buttons.length - 1))].focus();
});

undo.addEventListener('click', () => {
    const move = game.undo();
    if (!move) return;
    status = { key: 'undone' };
    refresh();
    if (undo.disabled) (move.axis === 'row' ? rowButtons : columnButtons)[move.index].focus();
});
reset.addEventListener('click', () => {
    game.reset();
    status = { key: 'cleared' };
    refresh();
    columnButtons[0].focus();
});
sizeSelect.addEventListener('change', () => {
    const size = Number(sizeSelect.value);
    if (!GRID_SIZES.includes(size)) {
        sizeSelect.value = String(game.size);
        return;
    }
    game = new PaintGrid(size);
    status = { key: 'ready' };
    rebuildBoard();
    refresh();
});
language.addEventListener('change', refresh);
for (const size of GRID_SIZES) sizeSelect.add(new Option(`${size} × ${size}`, String(size)));
sizeSelect.value = String(game.size);
rebuildBoard();
refresh();
app.hidden = false;
