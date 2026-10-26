import { createState, analyze, act, neighborCount } from './spreading-game.mjs';
import { SpreadingPlayback } from './spreading-playback.mjs';
const copy = {
    en: {
        language: '言語', initial: 'Initially black', black: 'Black now', moves: 'Cells added', available: 'Legal next cells',
        start: 'Try this layout', retry: 'Choose another removal', edit: 'Edit initial layout', undo: 'Undo', reset: 'Reset', show: 'Mark legal next cells',
        legend: '● Black cell · × Cell turned white by the opponent · + Legal next cell',
        editGuide: 'Click cells to set the initial layout.', removeGuide: 'Click one black cell to turn it white.', growGuide: 'Black cells fill automatically, one every 0.2 seconds.',
        editStatus: 'Editing the initial layout.', removeStatus: 'Choose the cell the opponent turns white.',
        complete: 'For this removal: the entire grid is black.', stuck: 'For this removal: no further move is possible; white cells remain.',
        pause: 'Pause', resume: 'Resume', running: 'For this removal: filling automatically.', pending: 'Paused. Resume or choose a legal cell.', invalid: 'That cell cannot be chosen in this step.',
        board: s => `${s} by ${s} grid`,
        cell: (r,c,b,k,removed) => `Row ${r}, column ${c}: ${b ? 'black' : 'white'}, ${k} black neighbors${removed ? ', opponent’s chosen cell' : ''}`,
        removal: (r,c) => `Opponent’s choice: row ${r}, column ${c}.`,
    },
    ja: {
        language: 'Language', initial: '最初の黒マス', black: '現在の黒マス', moves: '塗り足した数', available: '次に塗れるマス',
        start: 'この配置を試す', retry: '消すマスを選び直す', edit: '初期配置を編集', undo: '1手戻す', reset: 'リセット', show: '次に塗れるマスを表示',
        legend: '● 黒マス　× 相手が白に戻したマス　+ 次に塗れるマス',
        editGuide: 'マスを押して最初の配置を作ります．', removeGuide: '白に戻す黒マスを一つ押してください．', growGuide: '0.2秒ごとに1マスずつ，自動で黒く塗ります．',
        editStatus: '最初の配置を編集中です．', removeStatus: '相手が白に戻すマスを選んでください．',
        complete: 'このマスを白に戻した場合：全マスが黒になりました．', stuck: 'このマスを白に戻した場合：白マスを残して操作できなくなりました．',
        pause: '一時停止', resume: '再開', running: 'このマスを白に戻した場合：自動で塗っています．', pending: '一時停止中です．再開するか，塗れるマスを選んでください．', invalid: '今の段階では，そのマスは選べません．',
        board: s => `${s}行${s}列の方眼`,
        cell: (r,c,b,k,removed) => `${r}行${c}列：${b ? '黒' : '白'}，隣接する黒マス${k}個${removed ? '，相手が白に戻したマス' : ''}`,
        removal: (r,c) => `相手が白に戻した位置：${r}行${c}列．`,
    },
};
const root = document.getElementById('spreading-cells');
const board = document.getElementById('spreading-board');
const sizeSelect = document.getElementById('spreading-size');
const language = document.getElementById('spreading-language');
const show = document.getElementById('spreading-show');
const control = id => document.getElementById(`spreading-${id}`);
let state = createState(Number(sizeSelect.value)), history = [], active = 0, invalid = false;
const playback = new SpreadingPlayback(() => state, next => { history.push(state); state = next; invalid = false; }, () => render());
function render(focusIndex) {
    const focusedCell = board.contains(document.activeElement) ? Number(document.activeElement.dataset.index) : undefined;
    if (focusIndex === undefined && Number.isInteger(focusedCell)) focusIndex = focusedCell;
    const t = copy[language.value], info = analyze(state);
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    for (const key of ['initial','black','moves','available']) control(key).textContent = key === 'moves' ? state.moves : key === 'available' && state.phase !== 'grow' ? '—' : info[key];
    control('guide').textContent = t[`${state.phase}Guide`];
    for (const action of ['start','retry','edit']) control(action).disabled = act(state, action) === null;
    control('undo').disabled = !history.length;
    control('reset').disabled = !history.length && !state.cells.some(Boolean);
    show.disabled = state.phase !== 'grow';
    control('pause').textContent = playback.running ? t.pause : t.resume;
    control('pause').disabled = state.phase !== 'grow' || !info.available;
    board.setAttribute('aria-label', t.board(state.size));
    board.style.setProperty('--size', state.size);
    const parts = [];
    for (let i = 0; i < state.size; i++) for (const axis of ['row','column']) {
        const label = document.createElement('span'); label.className = 'spreading-coordinate'; label.textContent = i + 1; label.setAttribute('aria-hidden', 'true');
        label.style.gridRow = axis === 'row' ? i + 2 : 1; label.style.gridColumn = axis === 'column' ? i + 2 : 1; parts.push(label);
    }
    state.cells.forEach((black, i) => {
        const r = Math.floor(i / state.size), c = i % state.size, button = document.createElement('button');
        button.type = 'button'; button.className = 'spreading-cell'; button.dataset.index = i; button.tabIndex = i === active ? 0 : -1;
        button.style.gridRow = r + 2; button.style.gridColumn = c + 2;
        button.setAttribute('aria-pressed', String(black)); button.setAttribute('aria-disabled', String(playback.running || act(state, 'cell', i) === null));
        button.setAttribute('aria-label', t.cell(r + 1, c + 1, black, neighborCount(state, i), state.removed === i));
        const mark = document.createElement('span'); mark.setAttribute('aria-hidden', 'true');
        mark.textContent = state.removed === i ? '×' : black ? '●' : show.checked && state.phase === 'grow' && info.legal[i] ? '+' : '';
        button.append(mark); parts.push(button);
    });
    const left = board.parentElement.scrollLeft;
    board.replaceChildren(...parts); board.parentElement.scrollLeft = left;
    const message = control('message');
    message.textContent = invalid ? t.invalid : state.phase !== 'grow' ? t[`${state.phase}Status`] : info.complete ? t.complete : info.stuck ? t.stuck : playback.running ? t.running : t.pending;
    message.dataset.state = info.complete ? 'complete' : info.stuck || invalid ? 'blocked' : '';
    control('removal').textContent = state.removed === null ? '' : t.removal(Math.floor(state.removed / state.size) + 1, state.removed % state.size + 1);
    if (focusIndex !== undefined) board.querySelector(`[data-index="${focusIndex}"]`).focus({preventScroll: true});
}
function apply(action, index) {
    if (action === 'cell' && playback.running) return;
    const wasRemoving = state.phase === 'remove';
    const next = act(state, action, index); invalid = !next;
    if (action !== 'cell') playback.stop();
    if (next) { history.push(state); state = next; }
    if (next && action === 'cell' && wasRemoving) playback.start();
    if (action !== 'cell' && next) active = action === 'start' || action === 'retry' ? state.cells.findIndex(Boolean) : 0;
    render(action === 'cell' ? index : next ? active : undefined);
}
board.addEventListener('click', event => {
    const button = event.target.closest('.spreading-cell'); if (!button) return;
    active = Number(button.dataset.index); apply('cell', active);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('.spreading-cell'); if (!button) return;
    const i = Number(button.dataset.index), r = Math.floor(i / state.size), c = i % state.size;
    const next = {ArrowLeft: c ? i - 1 : i, ArrowRight: c < state.size - 1 ? i + 1 : i, ArrowUp: r ? i - state.size : i, ArrowDown: r < state.size - 1 ? i + state.size : i, Home: event.ctrlKey ? 0 : r * state.size, End: event.ctrlKey ? state.cells.length - 1 : (r + 1) * state.size - 1}[event.key];
    if (next === undefined) return; event.preventDefault(); active = next; button.tabIndex = -1;
    const target = board.querySelector(`[data-index="${next}"]`); target.tabIndex = 0; target.focus();
});
for (const action of ['start','retry','edit']) control(action).addEventListener('click', () => apply(action));
control('pause').addEventListener('click', () => { if (playback.running) playback.stop(); else playback.start(); invalid = false; render(); });
control('undo').addEventListener('click', () => { playback.stop(); if (history.length) { state = history.pop(); invalid = false; render(); if (control('undo').disabled) { board.querySelector(`[data-index="${active}"]`).focus(); } } });
function reset() { playback.stop(); state = createState(Number(sizeSelect.value)); history = []; active = 0; invalid = false; render(); board.parentElement.scrollLeft = 0; }
control('reset').addEventListener('click', reset);
sizeSelect.addEventListener('change', reset);
language.addEventListener('change', () => render());
show.addEventListener('change', () => render());
window.addEventListener('pagehide', () => { playback.stop(); render(); });
render(); root.hidden = false;
