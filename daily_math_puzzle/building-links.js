import { DEFAULT_HEIGHT, MIN_HEIGHT, MAX_HEIGHT, newGame, reorder, moveBuilding, undoMove, communication } from './building-links-game.mjs';

const root = document.getElementById('building-links');
const board = root.querySelector('#sky-board');
const drawing = board.querySelector('.sky-drawing');
const targets = board.querySelector('.sky-targets');
const size = root.querySelector('#sky-size');
const language = root.querySelector('#sky-language');
const leftButton = root.querySelector('#sky-left');
const rightButton = root.querySelector('#sky-right');
const undo = root.querySelector('#sky-undo');
const reset = root.querySelector('#sky-reset');
const evenCount = root.querySelector('#sky-even-count');
const oddCount = root.querySelector('#sky-odd-count');
const complete = root.querySelector('#sky-complete');
const announcement = root.querySelector('#sky-announcement');

const labels = {
    en: {
        heightSetting: 'End height', height: 'Height', partners: 'Partners', even: 'Even', odd: 'Odd',
        complete: 'Every building has an even number of partners.',
        hint: 'Drag an inner building, or select one and use the arrows.',
        undo: 'Undo', reset: 'Reset', left: 'Move left', right: 'Move right', board: 'Row of buildings',
        tower: (h, d, pos, side) => 'Position ' + pos + ', height ' + h + ', ' + d + ' partners, '
            + (d % 2 ? 'odd' : 'even') + (side ? ', fixed ' + side + ' end' : ''),
        status: (even, total) => even + ' of ' + total + ' buildings have an even number of partners.',
    },
    ja: {
        heightSetting: '両端の高さ', height: '高さ', partners: '相手数', even: '偶数', odd: '奇数',
        complete: 'すべてのビルの通信相手が偶数です．',
        hint: '内側のビルをドラッグするか，ビルを選んで矢印で動かします．',
        undo: '1手戻す', reset: 'リセット', left: '左に動かす', right: '右に動かす', board: '一列に並ぶビル',
        tower: (h, d, pos, side) => '左から' + pos + '棟目，高さ' + h + '，通信相手' + d + '棟，'
            + (d % 2 ? '奇数' : '偶数') + (side ? '，' + (side === 'left' ? '左端' : '右端') + 'で固定' : ''),
        status: (even, total) => total + '棟のうち' + even + '棟の通信相手が偶数です．',
    },
};

let game = newGame();
let selected = null; // The interior height follows its building as it moves.
let drag = null;
let lang = 'en';
let layout;
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

function measure() {
    const width = board.clientWidth;
    const n = game.order[0];
    const compact = width < 480;
    const lead = compact ? 44 : 65;
    const right = compact ? 5 : 14;
    const step = (width - lead - right) / (n + 1);
    const unit = Math.min(compact ? 42 : 52, (compact ? 214 : 255) / n);
    const facade = Math.min(step * 0.64, unit * 0.83, 43);
    const ground = 24 + n * unit;
    return { width, height: ground + 38, lead, right, step, unit, facade, ground };
}

function center(index) {
    return layout.lead + (index + 0.5) * layout.step;
}

function draw(order, degrees, links) {
    const { width, height, lead, right, ground, unit, facade, step } = layout;
    const positions = order.map((_, i) => center(i));
    if (drag?.active) {
        const space = Math.max(0, Math.min(step / 2, step - facade - 5));
        const snap = positions[drag.to];
        positions[drag.to] = clamp(drag.center, snap - space, snap + space);
    }
    const floorY = f => ground - (f - 0.5) * unit;
    const text = labels[lang];
    const shapes = ['<g text-anchor="end" dominant-baseline="central">'];
    for (let f = 1; f <= order[0]; f++) {
        const y = floorY(f);
        shapes.push('<line class="sky-grid" x1="' + (lead - 3) + '" x2="' + (width - right) + '" y1="' + y + '" y2="' + y + '"/>',
            '<text class="sky-level" x="' + (lead - 8) + '" y="' + y + '">' + f + '</text>');
    }
    shapes.push('</g><g class="sky-caption" dominant-baseline="central" text-anchor="start">',
        '<text x="6" y="12">' + text.height + '</text>',
        '<text x="6" y="' + (ground + 19) + '">' + text.partners + '</text></g>');
    shapes.push('<line class="sky-ground" x1="' + (lead - 3) + '" x2="' + (width - right) + '" y1="' + ground + '" y2="' + ground + '"/>');

    order.forEach((h, i) => {
        const x = positions[i];
        const wallX = x - facade / 2;
        const roof = ground - h * unit;
        const parity = degrees[i] % 2 === 0 ? 'even' : 'odd';
        const fixed = i === 0 || i === order.length - 1;
        const countTarget = !fixed && order.length > 3 ? ' data-index="' + i + '"' : '';
        shapes.push('<g class="sky-tower ' + parity + '" data-slot="' + i + '" data-height="' + h + '" data-partners="' + degrees[i] + '">');
        if (!fixed && selected === h) {
            shapes.push('<rect class="sky-selection" x="' + (wallX - 3) + '" y="' + (roof - 3)
                + '" width="' + (facade + 6) + '" height="' + (h * unit + 5) + '" rx="2"/>');
        }
        shapes.push('<rect class="sky-wall" x="' + wallX + '" y="' + roof + '" width="' + facade + '" height="' + h * unit + '"/>');
        if (fixed) {
            shapes.push('<g class="sky-lock" transform="translate(' + x + ' ' + floorY(1) + ')"><path d="M-2.5,-1 V-3 a2.5,2.5 0 0 1 5,0 v2"/><rect x="-4" y="-1" width="8" height="6" rx="0.8"/></g>');
        }
        shapes.push('<text class="sky-height" x="' + x + '" y="' + floorY(h) + '" text-anchor="middle" dominant-baseline="central">' + h + '</text></g>',
            '<text class="sky-degree ' + parity + '"' + countTarget + ' x="' + x + '" y="' + (ground + 19)
            + '" text-anchor="middle" dominant-baseline="central">' + degrees[i] + '</text>');
    });

    for (const { left, right: end, floor } of links) {
        const x1 = positions[left] + facade / 2;
        const x2 = positions[end] - facade / 2;
        const y = floorY(floor);
        shapes.push('<line class="sky-wire" data-left="' + left + '" data-right="' + end + '" data-floor="' + floor
            + '" x1="' + x1 + '" x2="' + x2 + '" y1="' + y + '" y2="' + y + '"/>',
            '<circle class="sky-port" cx="' + x1 + '" cy="' + y + '" r="1.7"/><circle class="sky-port" cx="' + x2 + '" cy="' + y + '" r="1.7"/>');
    }
    board.style.height = height + 'px';
    drawing.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    drawing.innerHTML = shapes.join('');

    if (targets.children.length !== order.length) {
        targets.replaceChildren(...order.map(() => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sky-target';
            return b;
        }));
    }
    order.forEach((h, i) => {
        const b = targets.children[i];
        const side = i === 0 ? 'left' : i === order.length - 1 ? 'right' : '';
        const roof = ground - h * unit;
        const label = text.tower(h, degrees[i], i + 1, side);
        b.style.left = (positions[i] - facade / 2) + 'px';
        b.style.width = facade + 'px';
        b.style.top = roof + 'px';
        b.style.height = (ground - roof) + 'px';
        b.dataset.index = i;
        b.disabled = Boolean(side) || order.length === 3;
        b.setAttribute('aria-pressed', String(!side && selected === h));
        b.setAttribute('aria-label', label);
        b.title = label;
        if (!b.disabled) b.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
        else b.removeAttribute('aria-keyshortcuts');
    });
}

function render(announce = false) {
    layout = measure();
    if (!layout.width) return;
    const order = drag?.active ? reorder(game.order, drag.from, drag.to) : game.order;
    const { degrees, links } = communication(order);
    const even = degrees.filter(d => d % 2 === 0).length;
    draw(order, degrees, links);
    evenCount.textContent = even;
    oddCount.textContent = order.length - even;
    complete.hidden = even !== order.length;
    const pos = order.indexOf(selected);
    leftButton.disabled = pos <= 1;
    rightButton.disabled = pos < 1 || pos >= order.length - 2;
    undo.disabled = !game.history.length;
    reset.disabled = game.order.every((h, i) => h === game.initial[i]);
    if (announce) announcement.textContent = labels[lang].status(even, order.length);
}

function setLanguage(value) {
    lang = value === 'ja' ? 'ja' : 'en';
    root.lang = lang;
    const languageLabel = root.querySelector('#sky-language-label');
    languageLabel.lang = lang === 'en' ? 'ja' : 'en';
    languageLabel.textContent = lang === 'en' ? '言語' : 'Language';
    const text = labels[lang];
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = text[el.dataset.label]; });
    board.setAttribute('aria-label', text.board);
    for (const [button, title] of [[leftButton, text.left], [rightButton, text.right]]) {
        button.setAttribute('aria-label', title);
        button.title = title;
    }
    announcement.textContent = '';
    render();
}

function finishDrag(commit) {
    if (!drag) return;
    const finished = drag;
    drag = null;
    board.classList.remove('is-dragging');
    if (board.hasPointerCapture(finished.id)) board.releasePointerCapture(finished.id);
    if (!commit) selected = finished.previousSelection;
    if (commit && finished.active) game = moveBuilding(game, finished.from, finished.to);
    render(commit && finished.active);
    if (commit && finished.active) targets.children[game.order.indexOf(selected)]?.focus({ preventScroll: true });
}

function updateDrag(event) {
    const dx = event.clientX - drag.startX;
    if (!drag.active && Math.abs(dx) < 4) return;
    drag.active = true;
    drag.center = center(drag.from) + dx;
    drag.to = clamp(Math.floor((drag.center - layout.lead) / layout.step), 1, game.order.length - 2);
    board.classList.add('is-dragging');
    render();
}

let pressOrigin = null;
document.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) {
        // Touch browsers can target a nearby button even when the finger landed in a gap.
        pressOrigin = document.elementFromPoint(event.clientX, event.clientY);
    }
}, true);
board.addEventListener('pointerdown', event => {
    const hit = pressOrigin?.closest('.sky-target, .sky-degree[data-index]');
    const b = hit && targets.children[Number(hit.dataset.index)];
    if (!b || b.disabled || !event.isPrimary || event.button !== 0 || drag) return;
    const from = Number(b.dataset.index);
    drag = { id: event.pointerId, from, to: from, active: false,
        startX: event.clientX, center: center(from), previousSelection: selected };
    selected = game.order[from];
    b.focus({ preventScroll: true });
    board.setPointerCapture(event.pointerId);
    render();
});
board.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) updateDrag(event);
});
board.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    updateDrag(event);
    const bounds = board.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right
        && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    finishDrag(inside);
});
for (const type of ['pointercancel', 'lostpointercapture']) {
    board.addEventListener(type, event => { if (drag?.id === event.pointerId) finishDrag(false); });
}
function clearSelection() {
    if (selected === null) return;
    selected = null;
    render();
}
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (drag) { event.preventDefault(); finishDrag(false); }
    else if (event.target.closest('.sky-target, .sky-arrows')) clearSelection();
});
targets.addEventListener('click', event => {
    if (event.detail !== 0) return; // Pointer selection was handled at the original contact point.
    const b = event.target.closest('button');
    if (b && !b.disabled) {
        selected = game.order[Number(b.dataset.index)];
        render();
    }
});

document.addEventListener('click', event => {
    // A captured drag can also end with a click addressed to the board.
    const origin = event.detail === 0 ? event.target : pressOrigin;
    pressOrigin = null;
    if (drag || !origin || origin.closest('button, select, label, a, .sky-tower, .sky-degree')) return;
    if (root.contains(event.target) && event.target.closest('button, select, label')) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (targets.contains(document.activeElement)) document.activeElement.blur();
    clearSelection();
}, true);

function moveSelected(delta, focusTower) {
    if (drag) return;
    const from = game.order.indexOf(selected);
    const next = moveBuilding(game, from, from + delta);
    if (next === game) { render(); return; }
    game = next;
    render(true);
    if (focusTower) targets.children[from + delta].focus({ preventScroll: true });
}
targets.addEventListener('keydown', event => {
    if (drag || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const b = event.target.closest('button');
    if (!b || b.disabled) return;
    event.preventDefault();
    selected = game.order[Number(b.dataset.index)];
    moveSelected(event.key === 'ArrowLeft' ? -1 : 1, true);
});
leftButton.addEventListener('click', () => moveSelected(-1, false));
rightButton.addEventListener('click', () => moveSelected(1, false));
size.addEventListener('change', () => {
    finishDrag(false);
    game = newGame(Number(size.value));
    selected = null;
    render(true);
});
language.addEventListener('change', () => { finishDrag(false); setLanguage(language.value); });
undo.addEventListener('click', () => { finishDrag(false); game = undoMove(game); render(true); });
reset.addEventListener('click', () => {
    finishDrag(false);
    game = newGame(game.order[0]);
    selected = null;
    render(true);
});

for (let n = MIN_HEIGHT; n <= MAX_HEIGHT; n++) size.add(new Option(String(n), String(n)));
size.value = String(DEFAULT_HEIGHT);
root.hidden = false;
setLanguage('en');
new ResizeObserver(() => {
    if (board.clientWidth !== layout.width) {
        if (drag) finishDrag(false);
        else render();
    }
}).observe(board);
