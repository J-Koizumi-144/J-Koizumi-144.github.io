import { SwapGame, shuffledCards } from './simultaneous-swap-game.mjs';

const copy = {
    en: {
        language: '言語', size: 'Cards', rounds: 'Rounds used', pairs: 'Pairs selected',
        undo: 'Undo', reset: 'Reset', shuffle: 'New shuffle', clear: 'Clear pairs',
        guide: 'Select two cards to connect them; tap a paired card to unlink it.',
        choose: 'Select two cards.', pending: 'Select one more card.',
        ready: 'Ready to swap all selected pairs.', empty: 'No pairs selected. An empty round is allowed.',
        sorted: 'In increasing order.', success: 'Sorted in two rounds.',
        ended: 'Two rounds used. Undo or reset to try again.', moving: 'Swapping…',
        apply: n => n ? `Swap all (${n} ${n === 1 ? 'pair' : 'pairs'})` : 'Use empty round',
        board: 'Cards, from left to right',
        card: (v, p) => `Card ${v}, position ${p}`,
        paired: (id, other) => `Pair ${id} with card ${other}. Select to unlink.`,
        selected: 'Selected. Choose a partner.',
    },
    ja: {
        language: 'Language', size: '枚数', rounds: '操作回数', pairs: '選んだ組',
        undo: '1手戻す', reset: 'リセット', shuffle: '新しい並び', clear: '選択を解除',
        guide: '2枚押すと組になり，組のカードをもう一度押すと解除できます．',
        choose: 'カードを2枚選んでください．', pending: 'もう1枚選んでください．',
        ready: '選んだ組を一斉に交換できます．', empty: '0組のまま操作してもかまいません．',
        sorted: '左から小さい順になっています．', success: '2回の操作で並べ直せました．',
        ended: '2回操作しました．戻すかリセットして試せます．', moving: '交換中…',
        apply: n => n ? `${n}組を一斉に交換` : '0組で操作する',
        board: '左から順に並んだカード',
        card: (v, p) => `左から${p}枚目，カード${v}`,
        paired: (id, other) => `${other}との組${id}．押すと解除します．`,
        selected: '選択中．相手のカードを選んでください．',
    },
};
const root = document.getElementById('swap-game');
const board = document.getElementById('swap-cards');
const svg = document.getElementById('swap-arcs');
const language = document.getElementById('swap-language');
const size = document.getElementById('swap-size');
const apply = document.getElementById('swap-apply');
const undo = document.getElementById('swap-undo');
const clear = document.getElementById('swap-clear');
const message = document.getElementById('swap-message');
const colors = ['#087b7f', '#aa4b27', '#6d57a2', '#3865a5'];
let game = new SwapGame(shuffledCards(Number(size.value)));
let busy = false;
const ns = 'http://www.w3.org/2000/svg';
function element(tag, attrs = {}) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
}
function drawArcs() {
    svg.replaceChildren();
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width) return;
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const buttons = [...board.children];
    const defs = element('defs');
    svg.append(defs);
    game.pairs.forEach(([a, b], index) => {
        const color = colors[index];
        const marker = element('marker', { id: `swap-tip-${index}`, viewBox: '0 0 10 10',
            refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
        marker.append(element('path', { d: 'M 1 1 L 8 5 L 1 9', fill: 'none', stroke: color, 'stroke-width': 1.7 }));
        defs.append(marker);
        const left = buttons[a].getBoundingClientRect();
        const right = buttons[b].getBoundingClientRect();
        const x1 = left.x + left.width / 2 - bounds.x;
        const x2 = right.x + right.width / 2 - bounds.x;
        const y = bounds.height - 9;
        const lift = 19 + (b - a) / (game.cards.length - 1) * (bounds.height - 51);
        const d = `M ${x1} ${y} C ${x1} ${y - lift * 1.33}, ${x2} ${y - lift * 1.33}, ${x2} ${y}`;
        svg.append(element('path', { d, class: 'swap-arc', stroke: color,
            'marker-start': `url(#swap-tip-${index})`, 'marker-end': `url(#swap-tip-${index})` }));
        const labelOffset = game.cards.length > 6 ? (index % 2 ? 10 : -10) : 0;
        const label = element('text', { x: (x1 + x2) / 2 + labelOffset, y: y - lift - 8, fill: color, class: 'arc-label' });
        label.textContent = String.fromCharCode(65 + index);
        svg.append(label);
    });
}
function render(focusIndex) {
    const t = copy[language.value];
    root.lang = language.value;
    root.dataset.cardCount = game.cards.length;
    root.setAttribute('aria-busy', String(busy));
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    board.setAttribute('aria-label', t.board);
    language.setAttribute('aria-label', t.language);
    size.setAttribute('aria-label', t.size);
    document.getElementById('swap-rounds').textContent = `${game.rounds} / 2`;
    document.getElementById('swap-pairs').textContent = String(game.pairs.length);
    apply.textContent = t.apply(game.pairs.length);
    apply.disabled = busy || !game.canApply;
    undo.disabled = busy || !game.history.length;
    clear.disabled = busy || (!game.pairs.length && game.pending === null);
    board.style.setProperty('--card-count', game.cards.length);
    board.replaceChildren(...game.cards.map((value, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'number-card';
        button.dataset.index = index;
        button.dataset.value = value;
        button.textContent = value;
        button.disabled = busy || game.finished;
        const pair = game.pairs.findIndex(p => p.includes(index));
        const selected = game.pending === index;
        button.setAttribute('aria-pressed', String(pair !== -1 || selected));
        let label = t.card(value, index + 1);
        if (pair !== -1) {
            const id = String.fromCharCode(65 + pair);
            const other = game.pairs[pair].find(x => x !== index);
            button.style.setProperty('--pair-color', colors[pair]);
            const badge = document.createElement('span');
            badge.className = 'pair-badge'; badge.textContent = id; badge.setAttribute('aria-hidden', 'true');
            button.append(badge);
            label += `. ${t.paired(id, game.cards[other])}`;
        } else if (selected) {
            button.classList.add('is-pending');
            label += `. ${t.selected}`;
        }
        button.setAttribute('aria-label', label);
        button.addEventListener('click', () => { if (!busy && game.select(index)) render(index); });
        button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const count = game.cards.length;
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 :
                (index + (event.key === 'ArrowLeft' ? -1 : 1) + count) % count;
            board.children[next]?.focus();
        });
        return button;
    }));
    message.dataset.state = game.sorted ? 'complete' : game.finished ? 'blocked' : '';
    message.textContent = game.finished ? (game.sorted ? t.success : t.ended) :
        game.pending !== null ? t.pending : game.pairs.length ? t.ready : game.sorted ? t.sorted : t.choose;
    drawArcs();
    if (focusIndex !== undefined) board.children[focusIndex]?.focus({ preventScroll: true });
}
apply.addEventListener('click', async () => {
    if (busy || !game.canApply) return;
    const buttons = [...board.children];
    const pairs = game.pairs.map(p => [...p]);
    if (!game.apply()) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    root.querySelectorAll('button, select').forEach(el => { el.disabled = true; });
    message.textContent = copy[language.value].moving;
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480;
    const animations = [];
    for (const [a, b] of pairs) {
        const dx = buttons[b].getBoundingClientRect().x - buttons[a].getBoundingClientRect().x;
        for (const [i, delta, dy] of [[a, dx, -10], [b, -dx, 10]]) {
            animations.push(buttons[i].animate([
                { transform: 'translate(0, 0)' },
                { transform: `translate(${delta / 2}px, ${dy}px)` },
                { transform: `translate(${delta}px, 0)` },
            ], { duration, easing: 'ease-in-out', fill: 'forwards' }));
        }
    }
    await Promise.allSettled(animations.map(animation => animation.finished));
    animations.forEach(animation => animation.cancel());
    busy = false;
    root.querySelectorAll('button, select').forEach(el => { el.disabled = false; });
    render();
    (game.finished ? undo : apply).focus({ preventScroll: true });
});
undo.addEventListener('click', () => { if (!busy && game.undo()) render(); });
clear.addEventListener('click', () => { if (!busy) { game.clear(); render(); } });
document.getElementById('swap-reset').addEventListener('click', () => { if (!busy) { game.reset(); render(); } });
function reshuffle() { if (!busy) { game = new SwapGame(shuffledCards(Number(size.value))); render(); } }
document.getElementById('swap-shuffle').addEventListener('click', reshuffle);
size.addEventListener('change', reshuffle);
language.addEventListener('change', () => render());
root.hidden = false;
render();
new ResizeObserver(() => { if (!busy) drawArcs(); }).observe(board);
