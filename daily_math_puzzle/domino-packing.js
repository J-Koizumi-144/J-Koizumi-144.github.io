import { BOARD_SIZES, DominoPackingGame } from './domino-packing-game.mjs';

const words = {
    en: {
        language: '言語', size: 'Board size', dominoes: 'Dominoes', empty: 'Empty cells',
        available: 'Available placements', remove: 'Delete domino', undo: 'Undo', reset: 'Reset',
        guide: 'Click two adjacent empty cells to place a domino; select a domino and press Delete domino to remove it.',
        ready: 'Select an empty cell.', first: 'Choose an adjacent empty cell.',
        selected: 'Domino selected.', cleared: 'Selection cleared.', placed: 'Domino placed.',
        removed: 'Domino deleted.', undone: 'Last move undone.', resetDone: 'Board cleared.',
        nonadjacent: 'The two cells must share an edge.', occupied: 'Both cells must be empty.',
        invalid: 'Choose a cell on the board.', stopped: 'No further dominoes can be placed.',
        board: (rows, cols) => `${rows} rows by ${cols} columns`,
        cell: (row, col, partner, cols, pending, selected, neighbor) => {
            const position = `Row ${row}, column ${col}`;
            if (partner >= 0) return `${position}: domino joined to row ${Math.floor(partner / cols) + 1}, column ${partner % cols + 1}${selected ? ', selected' : ', select to delete'}`;
            return `${position}: empty${pending ? ', first cell selected' : neighbor ? ', choose to place a domino' : ''}`;
        },
    },
    ja: {
        language: 'Language', size: '盤面の大きさ', dominoes: 'ドミノ', empty: '空きマス',
        available: '置ける場所', remove: '削除', undo: '1手戻す', reset: 'リセット',
        guide: '隣り合う空きマス2つで配置，ドミノを選択して「削除」で取り除きます．',
        ready: '空きマスを選んでください．', first: '隣り合う空きマスを選んでください．',
        selected: 'ドミノを選択しました．', cleared: '選択を解除しました．', placed: 'ドミノを置きました．',
        removed: 'ドミノを削除しました．', undone: '1手戻しました．', resetDone: '盤面を空にしました．',
        nonadjacent: '辺を共有する2マスを選んでください．', occupied: '空きマスを2つ選んでください．',
        invalid: '盤面のマスを選んでください．', stopped: 'これ以上ドミノを置けません．',
        board: (rows, cols) => `縦${rows}マス，横${cols}マスの盤面`,
        cell: (row, col, partner, cols, pending, selected, neighbor) => {
            const position = `${row}行${col}列`;
            if (partner >= 0) return `${position}：${Math.floor(partner / cols) + 1}行${partner % cols + 1}列と同じドミノ，${selected ? '選択中' : '選択して削除できます'}`;
            return `${position}：空き${pending ? '，1マス目として選択中' : neighbor ? '，選ぶとドミノを置けます' : ''}`;
        },
    },
};

const root = document.getElementById('packing-game');
const board = document.getElementById('packing-board');
const size = document.getElementById('packing-size');
const language = document.getElementById('packing-language');
const remove = document.getElementById('packing-delete');
const undo = document.getElementById('packing-undo');
const reset = document.getElementById('packing-reset');
let game = new DominoPackingGame();
let active = 0;
let operation = 'ready';

for (const [rows, columns] of BOARD_SIZES) {
    const option = new Option(`${rows} × ${columns}`, `${rows}x${columns}`);
    option.selected = rows === 4 && columns === 6;
    size.add(option);
}

function render(focusIndex) {
    if (focusIndex === undefined && board.contains(document.activeElement)) {
        focusIndex = Number(document.activeElement.dataset.index);
    }
    const t = words[language.value];
    const analysis = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-word]').forEach(element => { element.textContent = t[element.dataset.word]; });
    document.getElementById('packing-total').textContent = analysis.dominoes;
    document.getElementById('packing-empty').textContent = analysis.empty;
    document.getElementById('packing-available').textContent = analysis.available;
    remove.disabled = game.selected === null;
    undo.disabled = game.history.length === 0;
    reset.disabled = analysis.dominoes === 0 && game.history.length === 0 && game.pending === null;
    board.style.setProperty('--columns', game.columns);
    board.style.setProperty('--rows', game.rows);
    board.setAttribute('aria-label', t.board(game.rows, game.columns));
    const children = [];
    game.cells.forEach((partner, index) => {
        const row = Math.floor(index / game.columns);
        const column = index % game.columns;
        const selected = partner >= 0 && game.selected === Math.min(index, partner);
        const pending = game.pending === index;
        const neighbor = partner === -1 && game.pending !== null && game.adjacent(game.pending, index);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'packing-cell';
        cell.dataset.index = index;
        cell.style.gridRow = row + 1;
        cell.style.gridColumn = column + 1;
        cell.tabIndex = active === index ? 0 : -1;
        cell.classList.toggle('occupied', partner >= 0);
        cell.classList.toggle('pending', pending);
        cell.classList.toggle('neighbor', neighbor);
        cell.classList.toggle('selected', selected);
        cell.setAttribute('aria-pressed', String(pending || selected));
        cell.setAttribute('aria-label', t.cell(row + 1, column + 1, partner, game.columns, pending, selected, neighbor));
        if (pending) cell.textContent = '1';
        if (neighbor) cell.textContent = '+';
        if (selected && index < partner) {
            const mark = document.createElement('span');
            mark.className = 'packing-selection-mark';
            mark.textContent = '✓';
            mark.setAttribute('aria-hidden', 'true');
            cell.append(mark);
        }
        children.push(cell);
        if (partner > index) {
            const horizontal = Math.floor(partner / game.columns) === row;
            const domino = document.createElement('span');
            domino.className = `packing-domino ${horizontal ? 'horizontal' : 'vertical'}${selected ? ' selected' : ''}`;
            domino.setAttribute('aria-hidden', 'true');
            domino.style.gridColumn = `${column + 1} / span ${horizontal ? 2 : 1}`;
            domino.style.gridRow = `${row + 1} / span ${horizontal ? 1 : 2}`;
            children.push(domino);
        }
    });
    board.replaceChildren(...children);
    const message = document.getElementById('packing-message');
    message.textContent = t[operation];
    message.dataset.state = ['nonadjacent', 'occupied', 'invalid'].includes(operation) ? 'blocked' : '';
    const status = document.getElementById('packing-status');
    status.textContent = analysis.stopped ? t.stopped : '';
    status.dataset.state = analysis.stopped ? 'complete' : '';
    if (focusIndex !== undefined) board.querySelector(`[data-index="${focusIndex}"]`)?.focus({ preventScroll: true });
}

board.addEventListener('click', event => {
    const cell = event.target.closest('.packing-cell');
    if (!cell) return;
    active = Number(cell.dataset.index);
    operation = game.choose(active);
    render(active);
});

board.addEventListener('keydown', event => {
    const cell = event.target.closest('.packing-cell');
    if (!cell) return;
    const index = Number(cell.dataset.index);
    const row = Math.floor(index / game.columns);
    const column = index % game.columns;
    let next;
    switch (event.key) {
        case 'ArrowLeft': next = column > 0 ? index - 1 : index; break;
        case 'ArrowRight': next = column + 1 < game.columns ? index + 1 : index; break;
        case 'ArrowUp': next = row > 0 ? index - game.columns : index; break;
        case 'ArrowDown': next = row + 1 < game.rows ? index + game.columns : index; break;
        case 'Home': next = event.ctrlKey ? 0 : row * game.columns; break;
        case 'End': next = event.ctrlKey ? game.cells.length - 1 : (row + 1) * game.columns - 1; break;
        case 'Escape':
            event.preventDefault();
            game.clearSelection();
            operation = 'cleared';
            render(index);
            return;
        default: return;
    }
    event.preventDefault();
    active = next;
    cell.tabIndex = -1;
    const target = board.querySelector(`[data-index="${next}"]`);
    target.tabIndex = 0;
    target.focus({ preventScroll: true });
});

remove.addEventListener('click', () => {
    const index = game.selected;
    if (!game.removeSelected()) return;
    active = index;
    operation = 'removed';
    render(active);
});
undo.addEventListener('click', () => {
    const index = game.undo();
    if (index === false) return;
    active = index;
    operation = 'undone';
    render(active);
});
reset.addEventListener('click', () => {
    game.reset();
    active = 0;
    operation = 'resetDone';
    render(active);
});
size.addEventListener('change', () => {
    const [rows, columns] = size.value.split('x').map(Number);
    game = new DominoPackingGame(rows, columns);
    active = 0;
    operation = 'ready';
    render();
});
language.addEventListener('change', () => render());
render();
root.hidden = false;
