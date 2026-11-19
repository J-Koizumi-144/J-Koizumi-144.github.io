import { BOARD_SIZES, availableFlips, createSession, playMove, undoMove, resetSession } from './domino-flips-game.mjs';

const root = document.getElementById('domino-flips');
const board = document.getElementById('flip-board');
board.tabIndex = -1;
const sizeSelect = document.getElementById('flip-size');
const languageSelect = document.getElementById('flip-language');
const autoButton = document.getElementById('flip-auto');
const undoButton = document.getElementById('flip-undo');
const resetButton = document.getElementById('flip-reset');
const newButton = document.getElementById('flip-new');
const status = document.getElementById('flip-status');
const copy = {
    en: {
        size: 'Board', language: '言語', instruction: 'Tap a marked square to turn the two tiles.',
        moves: 'Moves', available: 'Available flips', auto: 'Autoplay', pause: 'Pause', undo: 'Undo', reset: 'Reset', newBoard: 'New tiling',
        stopped: 'No moves left.', running: 'Playing…',
        board: (r, c) => `${r} rows by ${c} columns. Use arrow keys to choose a marked square.`,
        square: (r, c, vertical) => `Row ${r + 1}, column ${c + 1}: turn ${vertical ? 'vertical tiles to horizontal' : 'horizontal tiles to vertical'}`,
    },
    ja: {
        size: '盤面', language: 'Language', instruction: '印のある場所を押すと，2枚のタイルが回ります．',
        moves: '操作回数', available: '操作できる場所', auto: '自動で操作', pause: '一時停止', undo: '1手戻す', reset: 'リセット', newBoard: '別の初期配置',
        stopped: '操作できなくなりました．', running: '自動操作中…',
        board: (r, c) => `${r}行${c}列の盤面．矢印キーで操作する場所を選べます．`,
        square: (r, c, vertical) => `${r + 1}行${c + 1}列を左上とする正方形：${vertical ? '縦から横' : '横から縦'}へ`,
    },
};
let state = createSession(6, 6);
let language = 'en';
let timer = null;
let running = false;
let focusKey = null;

for (const [rows, cols] of BOARD_SIZES) {
    const option = document.createElement('option');
    option.value = `${rows}x${cols}`;
    option.textContent = `${rows} × ${cols}`;
    option.selected = rows === 6 && cols === 6;
    sizeSelect.append(option);
}

function stop() {
    running = false;
    clearTimeout(timer);
    timer = null;
}

function rectFor(move, className) {
    return `<rect class="${className}" x="${move.col * 64 + 4}" y="${move.row * 64 + 4}" width="120" height="120" rx="6"/>`;
}

function highlight(move) {
    const layer = board.querySelector('#flip-highlight-layer');
    layer.innerHTML = move ? rectFor(move, 'flip-highlight') : '';
}

function drawBoard(choices, restoreFocus) {
    const { rows, cols, tiles } = state;
    board.style.setProperty('--rows', rows);
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--board-width', `${cols * 72}px`);
    board.setAttribute('aria-label', copy[language].board(rows, cols));
    const pieces = [];
    for (let cell = 0; cell < tiles.length; cell++) {
        const r = Math.floor(cell / cols), c = cell % cols;
        pieces.push(`<rect class="${(r + c) % 2 === 0 ? 'flip-black' : 'flip-white'}" x="${c * 64}" y="${r * 64}" width="64" height="64"/>`);
    }
    for (let cell = 0; cell < tiles.length; cell++) {
        if (cell > tiles[cell]) continue;
        const r = Math.floor(cell / cols), c = cell % cols, vertical = tiles[cell] - cell === cols;
        const attributes = `x="${c * 64 + 8}" y="${r * 64 + 8}" width="${vertical ? 48 : 112}" height="${vertical ? 112 : 48}" rx="5"`;
        pieces.push(`<g data-cells="${cell},${tiles[cell]}"><rect class="flip-tile-fill" ${attributes}/><rect class="flip-tile-outline" ${attributes}/><rect class="flip-tile-edge" ${attributes}/></g>`);
    }
    board.innerHTML = `<svg viewBox="0 0 ${cols * 64} ${rows * 64}" aria-hidden="true">${pieces.join('')}<g id="flip-highlight-layer"></g></svg>`;
    if (!choices.some(move => `${move.row},${move.col}` === focusKey)) {
        const previous = focusKey?.split(',').map(Number);
        const nearest = previous ? choices.slice().sort((a, b) =>
            Math.abs(a.row - previous[0]) + Math.abs(a.col - previous[1]) - Math.abs(b.row - previous[0]) - Math.abs(b.col - previous[1]))[0] : choices[0];
        focusKey = nearest ? `${nearest.row},${nearest.col}` : null;
    }
    for (const move of choices) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'flip-choice';
        button.dataset.key = `${move.row},${move.col}`;
        button.dataset.row = move.row;
        button.dataset.col = move.col;
        button.style.left = `${100 * (move.col + 1) / cols}%`;
        button.style.top = `${100 * (move.row + 1) / rows}%`;
        button.tabIndex = button.dataset.key === focusKey ? 0 : -1;
        button.setAttribute('aria-label', copy[language].square(move.row, move.col, move.orientation === 'vertical'));
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 1 0 .5 7"/><path d="M20 3v5h-5"/></svg>';
        button.addEventListener('pointerenter', () => highlight(move));
        button.addEventListener('pointerleave', () => highlight(null));
        button.addEventListener('focus', () => {
            focusKey = button.dataset.key;
            for (const item of board.querySelectorAll('button')) item.tabIndex = item === button ? 0 : -1;
            highlight(move);
        });
        button.addEventListener('blur', () => highlight(null));
        button.addEventListener('click', () => {
            stop();
            playMove(state, move.row, move.col);
            focusKey = null;
            render(false);
            board.focus({ preventScroll: true });
        });
        board.append(button);
    }
    if (restoreFocus) {
        const target = [...board.querySelectorAll('button')].find(button => button.dataset.key === focusKey);
        (target ?? undoButton).focus({ preventScroll: true });
    }
}

function render(restoreFocus = board.contains(document.activeElement)) {
    const choices = availableFlips(state.tiles, state.rows, state.cols);
    if (!choices.length) stop();
    const labels = copy[language];
    root.lang = language;
    for (const item of root.querySelectorAll('[data-copy]')) item.textContent = labels[item.dataset.copy];
    document.getElementById('flip-language-label').lang = language === 'en' ? 'ja' : 'en';
    document.getElementById('flip-moves').textContent = state.history.length;
    document.getElementById('flip-available').textContent = choices.length;
    autoButton.textContent = running ? labels.pause : labels.auto;
    autoButton.setAttribute('aria-pressed', String(running));
    autoButton.disabled = choices.length === 0;
    undoButton.disabled = state.history.length === 0;
    resetButton.disabled = state.history.length === 0;
    status.dataset.state = choices.length ? 'active' : 'complete';
    status.textContent = choices.length ? (running ? labels.running : '') : labels.stopped;
    drawBoard(choices, restoreFocus);
}

function schedule() {
    timer = setTimeout(() => {
        if (!running) return;
        const choices = availableFlips(state.tiles, state.rows, state.cols);
        if (!choices.length) { stop(); render(); return; }
        const move = choices[Math.floor(Math.random() * choices.length)];
        playMove(state, move.row, move.col);
        render();
        if (running) schedule();
    }, 360);
}

autoButton.addEventListener('click', () => {
    if (running) stop();
    else { running = true; schedule(); }
    render();
});
undoButton.addEventListener('click', () => { stop(); undoMove(state); render(); });
resetButton.addEventListener('click', () => { stop(); resetSession(state); render(); });
newButton.addEventListener('click', () => { stop(); state = createSession(state.rows, state.cols); focusKey = null; render(); });
sizeSelect.addEventListener('change', () => {
    stop();
    const [rows, cols] = sizeSelect.value.split('x').map(Number);
    state = createSession(rows, cols);
    focusKey = null;
    render();
});
languageSelect.addEventListener('change', () => { language = languageSelect.value; render(); });
board.addEventListener('keydown', event => {
    const current = event.target.closest('button');
    if ((!current && event.target !== board) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...board.querySelectorAll('button')];
    let next;
    if (!current) next = ['End', 'ArrowLeft', 'ArrowUp'].includes(event.key) ? buttons.at(-1) : buttons[0];
    else if (event.key === 'Home') next = buttons[0];
    else if (event.key === 'End') next = buttons.at(-1);
    else {
        const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
        const axis = horizontal ? 'col' : 'row', cross = horizontal ? 'row' : 'col';
        const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
        const candidates = buttons.filter(button => (Number(button.dataset[axis]) - Number(current.dataset[axis])) * direction > 0);
        const distance = button => Math.abs(Number(button.dataset[cross]) - Number(current.dataset[cross])) * 20 + Math.abs(Number(button.dataset[axis]) - Number(current.dataset[axis]));
        next = candidates.sort((a, b) => distance(a) - distance(b))[0];
    }
    next?.focus({ preventScroll: true });
});
window.addEventListener('pagehide', stop);
render();
root.hidden = false;
