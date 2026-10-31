import { ChocolateGame, cutOffset } from './chocolate-game.mjs?v=arrows';

const copy = {
    en: {
        language: '言語', moves: 'Moves', equal: 'Equal splits', pieces: 'Pieces', singles: 'Single squares',
        instruction: 'Select a piece, then press an arrow above or to the left of the bar to cut along that line.',
        undo: 'Undo', reset: 'Reset', choose: 'Select the next piece to cut.',
        single: 'This piece is already one square.', done: 'All pieces are single squares.',
        board: n => `${n} by ${n} chocolate bar`,
        piece: (p, i) => `Piece ${i + 1}: ${p.w} by ${p.h}, starting at row ${p.y + 1}, column ${p.x + 1}`,
        selection: p => `Selected: ${p.w} × ${p.h} (${p.w * p.h} ${p.w * p.h === 1 ? 'square' : 'squares'}).`,
        vertical: k => `Cut between columns ${k} and ${k + 1}`,
        horizontal: k => `Cut between rows ${k} and ${k + 1}`,
        split: (a, b) => `Split into ${a} and ${b} squares${a === b ? ' (equal)' : ''}.`,
    },
    ja: {
        language: 'Language', moves: '操作回数', equal: '等分の回数', pieces: 'かけら', singles: '単独のマス',
        instruction: 'かけらを選び，盤面の上か左にある矢印を押すと，その線で割れます．',
        undo: '1手戻す', reset: 'リセット', choose: '次に割るかけらを選んでください．',
        single: 'このかけらはすでに1マスです．', done: 'すべて1マスずつになりました．',
        board: n => `${n}行${n}列の板チョコ`,
        piece: (p, i) => `かけら${i + 1}：横${p.w}マス，縦${p.h}マス，${p.y + 1}行${p.x + 1}列から`,
        selection: p => `選択中：横${p.w} × 縦${p.h}（${p.w * p.h}マス）．`,
        vertical: k => `${k}列目と${k + 1}列目の間で割る`,
        horizontal: k => `${k}行目と${k + 1}行目の間で割る`,
        split: (a, b) => `${a}マスと${b}マスに分けました${a === b ? '（等分）' : ''}．`,
    },
};

const root = document.getElementById('chocolate-game');
const byId = id => document.getElementById(`chocolate-${id}`);
const board = byId('board');
const language = byId('language');
const size = byId('size');
let game = new ChocolateGame(Number(size.value));
let selected = 0;
let active = 0;
let lastSplit = null;

const guide = document.createElement('i');
guide.setAttribute('aria-hidden', 'true');

function renderArrows(axis, piece, t) {
    byId(axis).replaceChildren(...Array.from({ length: game.size - 1 }, (_, i) => {
        const line = i + 1;
        const offset = cutOffset(piece, axis, line);
        const arrow = document.createElement('button');
        arrow.type = 'button';
        arrow.className = 'cut-arrow';
        arrow.setAttribute('aria-label', t[axis](line));
        arrow.title = t[axis](line);
        arrow.disabled = offset === null;
        if (arrow.disabled) return arrow;

        const preview = () => {
            guide.className = `cut-preview ${axis}`;
            guide.style.setProperty('--offset', offset);
            board.children[selected].append(guide);
        };
        arrow.addEventListener('pointerenter', preview);
        arrow.addEventListener('pointerleave', () => { if (!arrow.matches(':focus-visible')) guide.remove(); });
        arrow.addEventListener('focus', preview);
        arrow.addEventListener('blur', () => guide.remove());
        arrow.addEventListener('click', () => {
            if (!game.split(selected, axis, offset)) return;
            const first = offset * (axis === 'vertical' ? piece.h : piece.w);
            lastSplit = [first, piece.w * piece.h - first];
            active = selected; selected = null; render(true);
        });
        return arrow;
    }));
}

function render(focusPiece = false) {
    const t = copy[language.value];
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    const a = game.analysis;
    for (const key of ['moves', 'equal', 'pieces', 'singles']) byId(key).textContent = a[key];
    const piece = game.pieces[selected];
    byId('undo').disabled = a.moves === 0;
    byId('reset').disabled = a.moves === 0;
    byId('selection').textContent = piece ? t.selection(piece) + (piece.w * piece.h === 1 ? ' ' + t.single : '') : a.complete ? '' : t.choose;
    byId('status').textContent = a.complete ? t.done : lastSplit ? t.split(...lastSplit) : '';
    byId('status').dataset.state = a.complete ? 'complete' : '';
    board.style.setProperty('--size', game.size);
    board.setAttribute('aria-label', t.board(game.size));
    active = Math.min(active, game.pieces.length - 1);
    guide.remove();
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
        return button;
    }));
    renderArrows('vertical', piece, t);
    renderArrows('horizontal', piece, t);
    if (focusPiece) board.children[active].focus({ preventScroll: true });
}

board.addEventListener('click', event => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    selected = active = Number(button.dataset.index); render(true);
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
byId('undo').addEventListener('click', () => {
    const index = game.undo();
    if (index === null) return;
    active = selected = index; lastSplit = null; render(true);
});
byId('reset').addEventListener('click', () => { game.reset(); active = selected = 0; lastSplit = null; render(true); });
size.addEventListener('change', () => {
    game = new ChocolateGame(Number(size.value)); active = selected = 0; lastSplit = null; render();
});
language.addEventListener('change', () => render());
render(); root.hidden = false;
