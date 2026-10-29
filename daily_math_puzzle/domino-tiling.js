import { DominoGame } from './domino-game.mjs';
const copy = {
    en: {
        language: '言語', orientation: 'Orientation', h: 'Horizontal →', v: 'Vertical ↓',
        instruction: 'Click an empty cell to place a tile to its right or below; click a tile to remove it.',
        tiles: 'Tiles', empty: 'Empty cells', distinct: 'Different row counts', rowCounts: 'Horizontal tiles in each row',
        repeated: 'Mark equal row counts', undo: 'Undo', reset: 'Reset',
        placed: 'Tile placed.', removed: 'Tile removed.', edge: 'The tile would extend outside the board.',
        overlap: 'A tile already occupies one of these cells.', invalid: 'Choose a cell on the board.',
        undone: 'Last move undone.', ready: 'Place a tile.', complete: 'All conditions met.',
        incomplete: 'Tiling incomplete.', full: 'Board covered; some row counts are equal.',
        row: (r, count) => `Row ${r}: ${count} horizontal tiles`,
        cell: (r, c, partner, cols) => `Row ${r}, column ${c}: ${partner < 0 ? 'empty' : `tile joins row ${Math.floor(partner / cols) + 1}, column ${partner % cols + 1}; click to remove`}`,
        board: (n, c) => `${n} rows by ${c} columns`,
    },
    ja: {
        language: 'Language', orientation: '向き', h: '横向き →', v: '縦向き ↓',
        instruction: '空きマスを押すと右または下へタイルを置き，タイルを押すと取り除きます．',
        tiles: 'タイル', empty: '空きマス', distinct: '行の枚数の種類', rowCounts: '各行の横向きの枚数',
        repeated: '同じ枚数の行に印を付ける', undo: '1手戻す', reset: 'リセット',
        placed: 'タイルを置きました．', removed: 'タイルを取り除きました．', edge: 'タイルが盤面からはみ出します．',
        overlap: 'タイルが重なります．', invalid: '盤面のマスを選んでください．',
        undone: '1手戻しました．', ready: 'タイルを置いてください．', complete: 'すべての条件を満たしています．',
        incomplete: 'まだ空きマスがあります．', full: '敷き詰め済みですが，同じ枚数の行があります．',
        row: (r, count) => `${r}行：横向き${count}枚`,
        cell: (r, c, partner, cols) => `${r}行${c}列：${partner < 0 ? '空き' : `${Math.floor(partner / cols) + 1}行${partner % cols + 1}列と同じタイル，押すと取り除く`}`,
        board: (n, c) => `${n}行${c}列の盤面`,
    },
};
const root = document.getElementById('domino-game');
const board = document.getElementById('domino-board');
const size = document.getElementById('domino-size');
const language = document.getElementById('domino-language');
const orientation = document.getElementById('domino-orientation');
const repeated = document.getElementById('domino-repeated');
const undo = document.getElementById('domino-undo');
const reset = document.getElementById('domino-reset');
let game = new DominoGame(Number(size.value));
let active = 0;
let operation = 'ready';
function render(focus) {
    const t = copy[language.value];
    const a = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    undo.disabled = game.history.length === 0;
    reset.disabled = a.tiles === 0 && game.history.length === 0;
    document.getElementById('domino-tiles').textContent = a.tiles;
    document.getElementById('domino-empty').textContent = a.empty;
    document.getElementById('domino-distinct').textContent = `${a.distinct} / ${game.n}`;
    board.style.setProperty('--columns', game.columns);
    board.setAttribute('aria-label', t.board(game.n, game.columns));
    const children = [];
    for (let row = 0; row < game.n; row++) {
        const label = document.createElement('span');
        label.className = 'domino-row-label';
        label.textContent = row + 1;
        label.style.gridRow = row + 1;
        label.style.gridColumn = 1;
        label.setAttribute('aria-hidden', 'true');
        children.push(label);
        const count = document.createElement('span');
        count.className = 'domino-row-count';
        count.classList.toggle('same-count', repeated.checked && a.repeated[row]);
        count.textContent = `${a.rows[row]}${repeated.checked && a.repeated[row] ? ' *' : ''}`;
        count.setAttribute('aria-label', t.row(row + 1, a.rows[row]));
        count.style.gridRow = row + 1;
        count.style.gridColumn = game.columns + 2;
        children.push(count);
    }
    game.cells.forEach((partner, i) => {
        const cell = document.createElement('button');
        const row = Math.floor(i / game.columns), col = i % game.columns;
        cell.type = 'button';
        cell.className = 'domino-cell';
        cell.dataset.index = i;
        cell.style.gridRow = row + 1;
        cell.style.gridColumn = col + 2;
        cell.tabIndex = i === active ? 0 : -1;
        cell.setAttribute('aria-label', t.cell(row + 1, col + 1, partner, game.columns));
        if (partner >= 0) {
            const horizontal = Math.floor(partner / game.columns) === row;
            cell.classList.add(horizontal ? 'horizontal' : 'vertical');
            cell.classList.add(partner > i ? 'tile-start' : 'tile-end');
            cell.textContent = horizontal ? '─' : '│';
        }
        children.push(cell);
    });
    board.replaceChildren(...children);
    const op = document.getElementById('domino-operation');
    op.textContent = t[operation];
    op.dataset.state = ['edge', 'overlap', 'invalid'].includes(operation) ? 'blocked' : '';
    const status = document.getElementById('domino-status');
    status.textContent = t[a.complete ? 'complete' : a.empty ? 'incomplete' : 'full'];
    status.dataset.state = a.complete ? 'complete' : '';
    if (focus !== undefined) board.querySelector(`[data-index="${focus}"]`).focus({ preventScroll: true });
}
board.addEventListener('click', event => {
    const cell = event.target.closest('.domino-cell');
    if (!cell) return;
    active = Number(cell.dataset.index);
    if (game.cells[active] >= 0) { game.remove(active); operation = 'removed'; }
    else operation = game.place(active, orientation.value);
    render(active);
});
board.addEventListener('keydown', event => {
    const cell = event.target.closest('.domino-cell');
    if (!cell) return;
    const i = Number(cell.dataset.index), row = Math.floor(i / game.columns), col = i % game.columns;
    let next;
    switch (event.key) {
        case 'ArrowLeft': next = col ? i - 1 : i; break;
        case 'ArrowRight': next = col < game.columns - 1 ? i + 1 : i; break;
        case 'ArrowUp': next = row ? i - game.columns : i; break;
        case 'ArrowDown': next = row < game.n - 1 ? i + game.columns : i; break;
        case 'Home': next = event.ctrlKey ? 0 : row * game.columns; break;
        case 'End': next = event.ctrlKey ? game.cells.length - 1 : (row + 1) * game.columns - 1; break;
        default: return;
    }
    event.preventDefault();
    active = next;
    cell.tabIndex = -1;
    const target = board.querySelector(`[data-index="${next}"]`);
    target.tabIndex = 0;
    target.focus();
});
undo.addEventListener('click', () => {
    const i = game.undo();
    if (i !== false) { active = i; operation = 'undone'; render(i); }
});
function clear() { game = new DominoGame(Number(size.value)); active = 0; operation = 'ready'; render(); }
reset.addEventListener('click', clear);
size.addEventListener('change', clear);
language.addEventListener('change', () => render());
repeated.addEventListener('change', () => render());
orientation.addEventListener('change', () => { operation = 'ready'; render(); });
render();
root.hidden = false;
