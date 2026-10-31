import { ChocolateGame } from './chocolate-game.mjs';

const copy = {
    en: {
        language: '言語', moves: 'Moves', equal: 'Equal splits', pieces: 'Pieces', singles: 'Single squares',
        instruction: 'Select a piece, choose a direction and position, then press Break.',
        direction: 'Direction', vertical: 'Vertical', horizontal: 'Horizontal', position: 'Position',
        break: 'Break', undo: 'Undo', reset: 'Reset', choose: 'Select a piece.',
        single: 'This piece is already one square.', done: 'All pieces are single squares.',
        board: n => `${n} by ${n} chocolate bar`,
        piece: (p, i) => `Piece ${i + 1}: ${p.w} columns by ${p.h} rows, row ${p.y + 1}, column ${p.x + 1}`,
        selection: p => `Selected: ${p.w} columns × ${p.h} rows (${p.w * p.h} squares).`,
        offset: (axis, k) => axis === 'vertical' ? `${k} from left` : `${k} from top`,
        split: (a, b) => `Split into ${a} and ${b} squares${a === b ? ' (equal)' : ''}.`,
    },
    ja: {
        language: 'Language', moves: '操作回数', equal: '等分の回数', pieces: 'かけら', singles: '単独のマス',
        instruction: 'かけらを選び，方向と位置を指定して「割る」を押します．',
        direction: '方向', vertical: '縦', horizontal: '横', position: '位置',
        break: '割る', undo: '1手戻す', reset: 'リセット', choose: 'かけらを選んでください．',
        single: 'このかけらはすでに1マスです．', done: 'すべて1マスずつになりました．',
        board: n => `${n}行${n}列の板チョコ`,
        piece: (p, i) => `かけら${i + 1}：横${p.w}マス，縦${p.h}マス，${p.y + 1}行${p.x + 1}列から`,
        selection: p => `選択中：横${p.w} × 縦${p.h}（${p.w * p.h}マス）．`,
        offset: (axis, k) => axis === 'vertical' ? `左から${k}マス` : `上から${k}マス`,
        split: (a, b) => `${a}マスと${b}マスに分けました${a === b ? '（等分）' : ''}．`,
    },
};

const root = document.getElementById('chocolate-game');
const byId = id => document.getElementById(`chocolate-${id}`);
const board = byId('board');
const language = byId('language');
const size = byId('size');
const axis = byId('direction');
const offset = byId('position');
let game = new ChocolateGame(Number(size.value));
let selected = null;
let active = 0;
let lastSplit = null;

function render(focusPiece = false) {
    const t = copy[language.value];
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    const a = game.analysis;
    for (const key of ['moves', 'equal', 'pieces', 'singles']) byId(key).textContent = a[key];
    const piece = selected === null ? null : game.pieces[selected];
    if (piece && (axis.value === 'vertical' ? piece.w : piece.h) === 1) {
        axis.value = piece.w > 1 ? 'vertical' : 'horizontal';
    }
    for (const option of axis.options) option.disabled = !piece || (option.value === 'vertical' ? piece.w : piece.h) < 2;
    const length = piece ? (axis.value === 'vertical' ? piece.w : piece.h) : 1;
    const oldOffset = Number(offset.value);
    offset.replaceChildren(...Array.from({ length: length - 1 }, (_, i) => {
        const option = document.createElement('option');
        option.value = i + 1;
        option.textContent = t.offset(axis.value, i + 1);
        return option;
    }));
    if (oldOffset > 0 && oldOffset < length) offset.value = oldOffset;
    axis.disabled = !piece || piece.w * piece.h === 1;
    offset.disabled = length < 2;
    byId('break').disabled = length < 2;
    byId('undo').disabled = a.moves === 0;
    byId('reset').disabled = a.moves === 0 && selected === null;
    byId('selection').textContent = piece ? t.selection(piece) + (piece.w * piece.h === 1 ? ' ' + t.single : '') : t.choose;
    byId('status').textContent = a.complete ? t.done : lastSplit ? t.split(...lastSplit) : '';
    byId('status').dataset.state = a.complete ? 'complete' : '';
    board.style.setProperty('--size', game.size);
    board.setAttribute('aria-label', t.board(game.size));
    active = Math.min(active, game.pieces.length - 1);
    board.replaceChildren(...game.pieces.map((p, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'chocolate-piece'; button.dataset.index = i;
        button.dataset.single = String(p.w * p.h === 1);
        button.style.gridColumn = `${p.x + 1} / span ${p.w}`;
        button.style.gridRow = `${p.y + 1} / span ${p.h}`;
        button.setAttribute('aria-label', t.piece(p, i));
        button.setAttribute('aria-pressed', String(i === selected));
        button.tabIndex = i === active ? 0 : -1;
        const label = document.createElement('span'); label.textContent = p.w * p.h === 1 ? '1' : `${p.w}×${p.h}`;
        button.append(label);
        if (i === selected && length > 1) {
            const line = document.createElement('i'); line.className = `cut-preview ${axis.value}`;
            line.setAttribute('aria-hidden', 'true');
            line.style.setProperty('--cut', `${Number(offset.value) / length * 100}%`);
            button.append(line);
        }
        return button;
    }));
    if (focusPiece) board.children[active].focus({ preventScroll: true });
}

board.addEventListener('click', event => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    active = Number(button.dataset.index);
    selected = active; offset.value = '1'; render(true);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    let next = Number(button.dataset.index);
    if (['ArrowRight', 'ArrowDown'].includes(event.key)) next++;
    else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next--;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = game.pieces.length - 1;
    else return;
    event.preventDefault(); active = Math.max(0, Math.min(game.pieces.length - 1, next));
    for (const el of board.children) el.tabIndex = Number(el.dataset.index) === active ? 0 : -1;
    board.children[active].focus();
});
byId('break').addEventListener('click', () => {
    const p = game.pieces[selected];
    if (!p) return;
    const first = Number(offset.value) * (axis.value === 'vertical' ? p.h : p.w);
    const second = p.w * p.h - first;
    if (!game.split(selected, axis.value, Number(offset.value))) return;
    lastSplit = [first, second]; active = selected; selected = null; render(true);
});
byId('undo').addEventListener('click', () => {
    const index = game.undo();
    if (index === null) return;
    active = selected = index; lastSplit = null; render(true);
});
byId('reset').addEventListener('click', () => { game.reset(); active = 0; selected = null; lastSplit = null; render(true); });
size.addEventListener('change', () => {
    game = new ChocolateGame(Number(size.value)); active = 0; selected = null; lastSplit = null; render();
});
language.addEventListener('change', () => render());
axis.addEventListener('change', () => { offset.value = '1'; render(); });
offset.addEventListener('change', () => render());
render(); root.hidden = false;
