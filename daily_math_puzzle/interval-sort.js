import { MIN_COLUMNS, MAX_COLUMNS, DEFAULT_COLUMNS, createState, randomPermutation, sortInterval, undoMove, resetState, isDecreasing } from './interval-sort-game.mjs';

const root = document.getElementById('interval-sort');
const byId = id => document.getElementById(id);
const copy = {
    en: {
        size: 'Columns', language: '言語', instruction: 'Choose the two ends of an interval.',
        top: 'Top row', bottom: 'Bottom row', sorted: '✓ Decreasing', unsorted: 'Not sorted',
        moves: 'Moves', selection: 'Selected columns', none: 'None',
        sort: 'Sort interval', undo: 'Undo', reset: 'Reset', shuffle: 'Shuffle & restart',
        ready: 'Select two different columns.', otherEnd: 'Choose the other end.',
        selected: (a, b) => `Columns ${a}–${b} selected.`,
        applied: (a, b) => `Sorted columns ${a}–${b}.`,
        complete: 'Both rows are in decreasing order.',
        undone: 'Move undone.', resetDone: 'Back to the same starting rows.',
        shuffled: 'Started with a new bottom row.',
        cell: (row, col, value) => `${row === 0 ? 'Top' : 'Bottom'} row, column ${col}, number ${value}`,
    },
    ja: {
        size: '列数', language: 'Language', instruction: '区間の両端の列を選んでください．',
        top: '上の行', bottom: '下の行', sorted: '✓ 大きい順', unsorted: '未整列',
        moves: '手数', selection: '選んだ列', none: 'なし',
        sort: '区間を並べ替える', undo: '1手戻す', reset: 'リセット', shuffle: 'ランダムで始める',
        ready: '異なる2列を選んでください．', otherEnd: 'もう一方の端を選んでください．',
        selected: (a, b) => `${a}〜${b}列を選択中．`,
        applied: (a, b) => `${a}〜${b}列を並べ替えました．`,
        complete: '上下の行が大きい順に並びました．',
        undone: '1手戻しました．', resetDone: '同じ初期配置に戻しました．',
        shuffled: '下の行を変えて始めました．',
        cell: (row, col, value) => `${row === 0 ? '上' : '下'}の行，${col}列，数は${value}`,
    },
};

let language = 'en';
let state = createState(DEFAULT_COLUMNS, randomPermutation(DEFAULT_COLUMNS));
let anchor = null, endpoint = null;
let message = { key: 'ready', args: [] };
const grids = [byId('sort-top'), byId('sort-bottom')];

function setMessage(key, ...args) { message = { key, args }; }
function range() { return endpoint === null ? null : [Math.min(anchor, endpoint), Math.max(anchor, endpoint)]; }
function clearSelection() { anchor = null; endpoint = null; }

function makeCells() {
    grids.forEach((grid, row) => {
        grid.style.setProperty('--sort-columns', state.n);
        grid.replaceChildren(...Array.from({ length: state.n }, (_, col) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sort-cell';
            button.dataset.row = row;
            button.dataset.col = col;
            button.setAttribute('aria-pressed', 'false');
            return button;
        }));
    });
}

function render() {
    const t = copy[language];
    root.lang = language;
    root.querySelectorAll('[data-copy]').forEach(element => { element.textContent = t[element.dataset.copy]; });
    byId('sort-language-label').lang = language === 'en' ? 'ja' : 'en';
    const selected = range();
    grids.forEach((grid, row) => {
        const numbers = row === 0 ? state.top : state.bottom;
        [...grid.children].forEach((button, col) => {
            button.textContent = numbers[col];
            button.setAttribute('aria-label', t.cell(row, col + 1, numbers[col]));
            const pressed = selected ? col >= selected[0] && col <= selected[1] : col === anchor;
            button.setAttribute('aria-pressed', String(pressed));
            button.disabled = state.n === 1;
        });
        const sorted = isDecreasing(numbers);
        const badge = byId(row === 0 ? 'sort-top-state' : 'sort-bottom-state');
        badge.textContent = sorted ? t.sorted : t.unsorted;
        badge.dataset.sorted = String(sorted);
    });
    byId('sort-moves').textContent = state.history.length;
    byId('sort-selection').textContent = selected ? `${selected[0] + 1}–${selected[1] + 1}` : anchor === null ? t.none : anchor + 1;
    byId('sort-apply').disabled = !selected;
    byId('sort-undo').disabled = state.history.length === 0;
    byId('sort-reset').disabled = state.history.length === 0 && anchor === null;
    byId('sort-shuffle').disabled = state.n === 1;
    const complete = isDecreasing(state.top) && isDecreasing(state.bottom);
    const status = byId('sort-message');
    status.dataset.state = complete ? 'complete' : 'playing';
    const value = complete ? t.complete : t[message.key];
    status.textContent = typeof value === 'function' ? value(...message.args) : value;
}

function chooseColumn(col) {
    if (state.n === 1) return;
    if (anchor === null || endpoint !== null) {
        anchor = col; endpoint = null;
        setMessage('otherEnd');
    } else if (col === anchor) {
        clearSelection(); setMessage('ready');
    } else {
        endpoint = col;
        setMessage('selected', range()[0] + 1, range()[1] + 1);
    }
    render();
}

root.addEventListener('click', event => {
    const cell = event.target.closest('.sort-cell');
    if (cell) chooseColumn(Number(cell.dataset.col));
});

root.addEventListener('keydown', event => {
    const cell = event.target.closest('.sort-cell');
    if (event.key === 'Escape') {
        clearSelection(); setMessage('ready'); render();
        return;
    }
    if (!cell) return;
    let row = Number(cell.dataset.row), col = Number(cell.dataset.col);
    if (event.key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (event.key === 'ArrowRight') col = Math.min(state.n - 1, col + 1);
    else if (event.key === 'ArrowUp') row = 0;
    else if (event.key === 'ArrowDown') row = 1;
    else if (event.key === 'Home') col = 0;
    else if (event.key === 'End') col = state.n - 1;
    else return;
    event.preventDefault();
    grids[row].children[col].focus();
});

byId('sort-apply').addEventListener('click', () => {
    const selected = range();
    if (!selected) return;
    state = sortInterval(state, ...selected);
    setMessage('applied', selected[0] + 1, selected[1] + 1);
    render();
});
byId('sort-undo').addEventListener('click', () => {
    if (!state.history.length) return;
    [anchor, endpoint] = state.history.at(-1).range;
    state = undoMove(state);
    setMessage('undone'); render();
});
byId('sort-reset').addEventListener('click', () => {
    state = resetState(state); clearSelection();
    setMessage('resetDone'); render();
});
byId('sort-shuffle').addEventListener('click', () => {
    state = createState(state.n, randomPermutation(state.n, Math.random, state.initialBottom));
    clearSelection(); setMessage('shuffled'); render();
});
for (let n = MIN_COLUMNS; n <= MAX_COLUMNS; n++) {
    const option = document.createElement('option');
    option.value = n; option.textContent = n;
    byId('sort-size').append(option);
}
byId('sort-size').value = state.n;
byId('sort-size').addEventListener('change', event => {
    state = createState(Number(event.target.value), randomPermutation(Number(event.target.value)));
    clearSelection(); setMessage('ready'); makeCells(); render();
});
byId('sort-language').addEventListener('change', event => {
    language = event.target.value; render();
});
makeCells();
render();
root.hidden = false;
