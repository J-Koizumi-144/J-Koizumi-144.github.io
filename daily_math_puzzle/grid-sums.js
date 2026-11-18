import { GridSums, MIN_SIZE, MAX_SIZE, randomBoard } from './grid-sums-game.mjs';

const app = document.getElementById('grid-sums');
const size = app.querySelector('#sum-size');
const language = app.querySelector('#sum-language');
const languageLabel = app.querySelector('#sum-language-label');
const originalTable = app.querySelector('#sum-original');
const replacementTable = app.querySelector('#sum-replacement');
const message = app.querySelector('#sum-message');
const undoButton = app.querySelector('#sum-undo');
const resetButton = app.querySelector('#sum-reset');

const words = {
    en: {
        original: 'Original', replacement: '0 / 3 grid', language: '言語', size: 'Grid size n',
        instruction: 'Click a cell in the 0 / 3 grid to switch between 0 and 3.',
        newBoard: 'New board', undo: 'Undo', reset: 'Reset',
        cell: (row, col, value) => `Row ${row + 1}, column ${col + 1}: ${value}`,
        sum: (axis, index, value) => `${axis === 'rows' ? 'Row' : 'Column'} ${index + 1} sum: ${value}`,
        target: value => `Target: ${value}`, matched: 'Matched',
        rows: (count, n) => `Rows matched: ${count} / ${n}`,
        columns: (count, n) => `Columns matched: ${count} / ${n}`,
        complete: '✓ All row and column sums match.',
    },
    ja: {
        original: '元の盤面', replacement: '0・3の盤面', language: 'Language', size: '盤面の大きさ n',
        instruction: '0・3の盤面のマスを押すと，0と3が切り替わります．',
        newBoard: '新しい盤面', undo: '1手戻す', reset: 'リセット',
        cell: (row, col, value) => `${row + 1}行${col + 1}列：${value}`,
        sum: (axis, index, value) => `${index + 1}${axis === 'rows' ? '行' : '列'}の和：${value}`,
        target: value => `目標：${value}`, matched: '一致',
        rows: (count, n) => `行の一致：${count} / ${n}`,
        columns: (count, n) => `列の一致：${count} / ${n}`,
        complete: '✓ すべての行と列の和が一致しました．',
    },
};
let game = new GridSums(randomBoard(4));

function makeSum(axis, index) {
    const header = document.createElement('th');
    header.scope = axis === 'rows' ? 'row' : 'col';
    header.dataset.axis = axis;
    header.dataset.index = index;
    const value = document.createElement('span');
    value.className = 'sum-value';
    header.append(value);
    return header;
}

function buildTable(table, editable) {
    const caption = document.createElement('caption');
    caption.dataset.copy = editable ? 'replacement' : 'original';
    const colgroup = document.createElement('colgroup');
    const sumColumn = document.createElement('col');
    sumColumn.className = 'sum-header-column';
    const cells = document.createElement('col');
    cells.span = game.n;
    colgroup.append(sumColumn, cells);
    const head = document.createElement('thead');
    const top = document.createElement('tr');
    const corner = document.createElement('td');
    corner.setAttribute('aria-hidden', 'true');
    top.append(corner);
    for (let col = 0; col < game.n; col++) top.append(makeSum('columns', col));
    head.append(top);
    const body = document.createElement('tbody');
    for (let row = 0; row < game.n; row++) {
        const line = document.createElement('tr');
        line.append(makeSum('rows', row));
        for (let col = 0; col < game.n; col++) {
            const td = document.createElement('td');
            const cell = document.createElement(editable ? 'button' : 'span');
            cell.className = 'sum-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            if (editable) {
                cell.type = 'button';
                cell.tabIndex = row === 0 && col === 0 ? 0 : -1;
            }
            td.append(cell);
            line.append(td);
        }
        body.append(line);
    }
    table.replaceChildren(caption, colgroup, head, body);
}

function update() {
    const lang = language.value;
    const t = words[lang];
    const status = game.status;
    app.lang = lang;
    replacementTable.dataset.complete = String(status.complete);
    languageLabel.lang = lang === 'en' ? 'ja' : 'en';
    languageLabel.textContent = t.language;
    size.setAttribute('aria-label', t.size);
    app.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t[node.dataset.copy]; });
    for (const [table, board, editable] of [
        [originalTable, game.original, false], [replacementTable, game.board, true],
    ]) {
        table.querySelectorAll('.sum-cell').forEach(cell => {
            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);
            const value = board[row][col];
            cell.textContent = value;
            cell.dataset.value = value;
            cell.setAttribute('aria-label', t.cell(row, col, value));
            if (editable) cell.setAttribute('aria-pressed', String(value === 3));
        });
        table.querySelectorAll('th[data-axis]').forEach(header => {
            const axis = header.dataset.axis;
            const index = Number(header.dataset.index);
            const value = (editable ? status.sums : game.target)[axis][index];
            const matched = editable && status[axis][index];
            header.querySelector('.sum-value').textContent = value;
            header.dataset.match = String(matched);
            const label = [t.sum(axis, index, value)];
            if (editable) label.push(t.target(game.target[axis][index]));
            if (matched) label.push(t.matched);
            header.setAttribute('aria-label', label.join(' · '));
        });
    }
    const lines = status.complete ? [t.complete] : [
        t.rows(status.rows.filter(Boolean).length, game.n),
        t.columns(status.columns.filter(Boolean).length, game.n),
    ];
    message.replaceChildren(...lines.map(text => {
        const span = document.createElement('span');
        span.textContent = text;
        return span;
    }));
    message.dataset.state = status.complete ? 'complete' : 'playing';
    undoButton.disabled = !game.history.length;
    resetButton.disabled = !game.board.some(row => row.some(Boolean));
}

function newBoard() {
    game = new GridSums(randomBoard(Number(size.value)));
    buildTable(originalTable, false);
    buildTable(replacementTable, true);
    update();
}

function setActiveCell(cell, focus = false) {
    replacementTable.querySelectorAll('button').forEach(button => { button.tabIndex = button === cell ? 0 : -1; });
    if (focus) cell.focus();
}

replacementTable.addEventListener('click', event => {
    const cell = event.target.closest('button.sum-cell');
    if (!cell) return;
    setActiveCell(cell);
    game.toggle(Number(cell.dataset.row), Number(cell.dataset.col));
    update();
});
replacementTable.addEventListener('keydown', event => {
    const cell = event.target.closest('button.sum-cell');
    if (!cell) return;
    let row = Number(cell.dataset.row);
    let col = Number(cell.dataset.col);
    if (event.key === 'ArrowLeft') col--;
    else if (event.key === 'ArrowRight') col++;
    else if (event.key === 'ArrowUp') row--;
    else if (event.key === 'ArrowDown') row++;
    else if (event.key === 'Home') { col = 0; if (event.ctrlKey) row = 0; }
    else if (event.key === 'End') { col = game.n - 1; if (event.ctrlKey) row = game.n - 1; }
    else return;
    event.preventDefault();
    row = Math.max(0, Math.min(game.n - 1, row));
    col = Math.max(0, Math.min(game.n - 1, col));
    setActiveCell(replacementTable.querySelector(`[data-row="${row}"][data-col="${col}"]`), true);
});

for (let n = MIN_SIZE; n <= MAX_SIZE; n++) {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = n;
    size.append(option);
}
size.value = game.n;
size.addEventListener('change', newBoard);
language.addEventListener('change', update);
app.querySelector('#sum-new').addEventListener('click', newBoard);
undoButton.addEventListener('click', () => { game.undo(); update(); });
resetButton.addEventListener('click', () => { game.reset(); update(); });
buildTable(originalTable, false);
buildTable(replacementTable, true);
update();
app.hidden = false;
