import { BOARD_SIZE, randomShape, totalBoxes, hasBox, cellAction, createState, reflect, editBox, resetWalk, isComplete } from './young-reflections-game.mjs';

const app = document.querySelector('#young-reflections');
const board = app.querySelector('#young-board');
const languageSelect = app.querySelector('#young-language');
const boxInput = app.querySelector('#young-box-count');
const randomButton = app.querySelector('#young-random');
const undoButton = app.querySelector('#young-undo');
const resetButton = app.querySelector('#young-reset');
const status = app.querySelector('#young-status');
const inputError = app.querySelector('#young-count-error');
let language = 'en';
let state = createState(randomShape(15));
let history = [];
let focusedCell = 0;
let notice = '';

const text = {
    en: {
        language: '言語', boxes: 'Boxes', random: 'Random', horizontal: 'Flip row', vertical: 'Flip column',
        undo: 'Undo', reset: 'Reset walk', visited: 'Visited', moves: 'Moves',
        instruction: 'Use + / − to edit; the walk restarts.', complete: 'All boxes visited!',
        invalid: 'Enter a whole number from 1 to 64.', blocked: 'Use a marked + or − to edit.',
        board: '8 by 8 board. Use arrow keys to move and Enter or Space to edit.',
        current: 'Black box', visitedBox: 'Visited box', unvisited: 'Unvisited box', empty: 'Empty cell',
        add: 'Add a box', remove: 'Remove this box', locked: 'Cannot edit this cell',
        cell: (row, column) => `Row ${row}, column ${column}`,
    },
    ja: {
        language: 'Language', boxes: '箱の数', random: 'ランダム生成', horizontal: '左右反転', vertical: '上下反転',
        undo: '1手戻す', reset: '最初から', visited: '訪問済み', moves: '操作回数',
        instruction: '＋／−で箱を編集すると，訪問履歴をリセットします．', complete: 'すべての箱を訪れました！',
        invalid: '1〜64の整数を入力してください．', blocked: '＋か−のある位置で編集できます．',
        board: '8行8列の盤面．矢印キーで移動し，EnterまたはSpaceで編集します．',
        current: '黒い箱', visitedBox: '訪問済みの箱', unvisited: '未訪問の箱', empty: '箱のない位置',
        add: '箱を追加', remove: 'この箱を削除', locked: 'この位置では編集できません',
        cell: (row, column) => `${row}行${column}列`,
    },
};

const cells = [];
for (let row = 0; row < BOARD_SIZE; row++) {
    const rowElement = document.createElement('div');
    rowElement.className = 'young-row';
    rowElement.setAttribute('role', 'row');
    for (let column = 0; column < BOARD_SIZE; column++) {
        const cell = row * BOARD_SIZE + column;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'young-cell';
        button.dataset.row = row;
        button.dataset.column = column;
        button.dataset.cell = cell;
        button.setAttribute('role', 'gridcell');
        button.innerHTML = '<span class="young-edit-mark" aria-hidden="true"></span>';
        button.addEventListener('click', () => {
            const next = editBox(state, cell);
            focusedCell = cell;
            if (next === state) {
                notice = 'blocked';
            } else {
                history.push(state);
                state = next;
                boxInput.value = totalBoxes(state.shape);
                notice = '';
            }
            render();
        });
        button.addEventListener('focus', () => {
            focusedCell = cell;
            for (const candidate of cells) candidate.tabIndex = candidate === button ? 0 : -1;
        });
        button.addEventListener('keydown', event => {
            let target = cell;
            if (event.key === 'ArrowRight') target = row * BOARD_SIZE + Math.min(column + 1, BOARD_SIZE - 1);
            else if (event.key === 'ArrowLeft') target = row * BOARD_SIZE + Math.max(column - 1, 0);
            else if (event.key === 'ArrowDown') target = Math.min(row + 1, BOARD_SIZE - 1) * BOARD_SIZE + column;
            else if (event.key === 'ArrowUp') target = Math.max(row - 1, 0) * BOARD_SIZE + column;
            else if (event.key === 'Home') target = event.ctrlKey ? 0 : row * BOARD_SIZE;
            else if (event.key === 'End') target = event.ctrlKey ? BOARD_SIZE ** 2 - 1 : row * BOARD_SIZE + BOARD_SIZE - 1;
            else return;
            event.preventDefault();
            cells[target].focus();
        });
        cells.push(button);
        rowElement.append(button);
    }
    board.append(rowElement);
}

const outlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
outlineSvg.classList.add('young-outline');
outlineSvg.setAttribute('viewBox', `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
outlineSvg.setAttribute('preserveAspectRatio', 'none');
outlineSvg.setAttribute('aria-hidden', 'true');
outlineSvg.setAttribute('focusable', 'false');
const outlinePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
outlineSvg.append(outlinePath);
board.append(outlineSvg);

function validateCount() {
    const value = boxInput.valueAsNumber;
    const valid = Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE ** 2;
    randomButton.disabled = !valid;
    boxInput.setAttribute('aria-invalid', String(!valid));
    inputError.textContent = valid ? '' : text[language].invalid;
    inputError.hidden = valid;
    return valid;
}

function render() {
    const copy = text[language];
    app.lang = language;
    for (const label of app.querySelectorAll('[data-copy]')) label.textContent = copy[label.dataset.copy];
    app.querySelector('#young-language-label').lang = language === 'en' ? 'ja' : 'en';
    board.setAttribute('aria-label', copy.board);
    const complete = isComplete(state);
    board.classList.toggle('is-complete', complete);
    app.dataset.complete = String(complete);
    const perimeter = ['M 0 0', `H ${state.shape[0]}`];
    for (let row = 0; row < BOARD_SIZE && state.shape[row] > 0; row++) {
        perimeter.push(`V ${row + 1}`, `H ${state.shape[row + 1] ?? 0}`);
    }
    outlinePath.setAttribute('d', [...perimeter, 'Z'].join(' '));
    app.querySelector('#young-visited').textContent = `${state.visited.size} / ${totalBoxes(state.shape)}`;
    app.querySelector('#young-moves').textContent = state.moves;
    for (let cell = 0; cell < cells.length; cell++) {
        const button = cells[cell];
        const present = hasBox(state.shape, cell);
        const current = state.current === cell;
        const visited = state.visited.has(cell);
        const action = cellAction(state.shape, cell);
        button.dataset.present = String(present);
        button.dataset.current = String(current);
        button.dataset.visited = String(visited);
        button.dataset.action = action ?? '';
        button.setAttribute('aria-disabled', String(!action));
        button.tabIndex = focusedCell === cell ? 0 : -1;
        if (current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
        const kind = current ? copy.current : visited ? copy.visitedBox : present ? copy.unvisited : copy.empty;
        const label = `${copy.cell(Math.floor(cell / BOARD_SIZE) + 1, cell % BOARD_SIZE + 1)}: ${kind}. ${copy[action ?? 'locked']}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        button.firstElementChild.textContent = action === 'add' ? '+' : action === 'remove' ? '−' : '';
    }
    undoButton.disabled = history.length === 0;
    resetButton.disabled = state.moves === 0 && state.current === 0 && state.visited.size === 1;
    status.textContent = complete ? copy.complete : notice ? copy[notice] : '';
    status.dataset.state = complete ? 'complete' : 'playing';
    validateCount();
}

for (const direction of ['horizontal', 'vertical']) {
    app.querySelector(`#young-${direction}`).addEventListener('click', () => {
        history.push(state);
        state = reflect(state, direction);
        notice = '';
        render();
    });
}
undoButton.addEventListener('click', () => {
    if (!history.length) return;
    state = history.pop();
    boxInput.value = totalBoxes(state.shape);
    notice = '';
    render();
});
resetButton.addEventListener('click', () => {
    state = resetWalk(state);
    history = [];
    notice = '';
    render();
});
app.querySelector('#young-generation').addEventListener('submit', event => {
    event.preventDefault();
    if (!validateCount()) return;
    state = createState(randomShape(boxInput.valueAsNumber));
    history = [];
    notice = '';
    render();
});
boxInput.addEventListener('input', validateCount);
languageSelect.addEventListener('change', () => {
    language = languageSelect.value;
    render();
});
render();
app.hidden = false;
