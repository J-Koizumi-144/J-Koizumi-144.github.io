import { MIN_BOXES, MAX_BOXES, validBoxCount, StoneRing } from './stone-ring-game.mjs';

const app = document.getElementById('stone-ring');
const board = app.querySelector('#ring-board');
const boxesLayer = app.querySelector('#ring-boxes');
const stonesLayer = app.querySelector('#ring-stones');
const sizeSelect = app.querySelector('#ring-size');
const language = app.querySelector('#ring-language');
const languageLabel = app.querySelector('#ring-language-label');
const moves = app.querySelector('#ring-moves');
const status = app.querySelector('#ring-status');
const undo = app.querySelector('#ring-undo');
const reset = app.querySelector('#ring-reset');
const labels = app.querySelectorAll('[data-label]');

const words = {
    en: {
        size: 'Boxes', moves: 'Moves', undo: 'Undo', reset: 'Reset', language: '言語',
        board: 'Boxes arranged clockwise from the top',
        box: (index, count) => `Box ${index + 1}, ${count} ${count === 1 ? 'stone' : 'stones'}`,
        ready: 'Tap a box with at least two stones.', done: 'No more moves.',
    },
    ja: {
        size: '箱の個数', moves: '操作回数', undo: '1手戻す', reset: 'リセット', language: 'Language',
        board: '真上から時計回りに並んだ箱',
        box: (index, count) => `箱${index + 1}，石${count}個`,
        ready: '石が2個以上ある箱をタップしてください．', done: '操作できる箱がなくなりました．',
    },
};

let game = new StoneRing();
let centers = [];
let buttons = [];
let dots = [];
let focusIndex = 0;

for (let size = MIN_BOXES; size <= MAX_BOXES; size += 2) {
    sizeSelect.add(new Option(String(size), String(size)));
}

function place(element, x, y) {
    element.style.left = `${x}%`;
    element.style.top = `${y}%`;
}

function slotOffset(slot, size) {
    // Fill the middle first, then symmetric pairs, so stones already in a box stay put.
    const columns = size <= 9 ? 3 : 4;
    const rows = Math.ceil(size / columns);
    const column = slot % columns;
    const row = Math.floor(slot / columns);
    const xOrder = columns === 3 ? [0, -1, 1] : [-0.5, 0.5, -1.5, 1.5];
    const yOrder = rows === 3 ? [0, -1, 1] : rows === 2 ? [-0.5, 0.5] : [0];
    return { x: xOrder[column], y: yOrder[row] };
}

function positionStones() {
    const size = game.boxes.length;
    const step = parseFloat(getComputedStyle(board).getPropertyValue('--stone-step'));
    game.boxes.forEach((box, index) => {
        box.forEach((id, slot) => {
            const offset = slotOffset(slot, size);
            place(dots[id], centers[index].x + step * offset.x, centers[index].y + step * offset.y);
        });
    });
}

function updateLabels() {
    const copy = words[language.value];
    app.lang = language.value;
    languageLabel.lang = language.value === 'en' ? 'ja' : 'en';
    languageLabel.textContent = copy.language;
    for (const label of labels) label.textContent = copy[label.dataset.label];
    board.setAttribute('aria-label', copy.board);
    buttons.forEach((button, index) => {
        // Keep boxes in the reading and arrow-key order even when empty.
        button.setAttribute('aria-disabled', String(!game.canMove(index)));
        button.setAttribute('aria-label', copy.box(index, game.boxes[index].length));
    });
    const count = String(game.history.length);
    if (moves.textContent !== count) moves.textContent = count;
    undo.disabled = reset.disabled = game.history.length === 0;
    const finished = game.finished;
    const message = finished ? copy.done : copy.ready;
    status.toggleAttribute('data-finished', finished);
    if (status.textContent !== message) status.textContent = message;
}

function start(size) {
    game = new StoneRing(size);
    sizeSelect.value = String(size);
    board.removeAttribute('data-animate');
    board.dataset.density = size <= 7 ? 'regular' : size <= 9 ? 'medium' : 'compact';
    const radius = 50 - parseFloat(getComputedStyle(board).getPropertyValue('--orbit-inset'));
    focusIndex = 0;
    centers = game.boxes.map((_, index) => {
        const angle = index * 2 * Math.PI / size;
        return { x: 50 + radius * Math.sin(angle), y: 50 - radius * Math.cos(angle) };
    });
    buttons = centers.map(({ x, y }, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ring-box';
        button.dataset.box = String(index);
        button.tabIndex = index === focusIndex ? 0 : -1;
        place(button, x, y);
        return button;
    });
    dots = game.boxes.map(() => {
        const dot = document.createElement('span');
        dot.className = 'ring-stone';
        return dot;
    });
    boxesLayer.replaceChildren(...buttons);
    stonesLayer.replaceChildren(...dots);
    positionStones();
    updateLabels();
}

function showMove() {
    // Each stone keeps its node. CSS retargets an in-flight transition on the next tap.
    board.setAttribute('data-animate', '');
    positionStones();
    updateLabels();
}

boxesLayer.addEventListener('click', event => {
    const button = event.target.closest('.ring-box');
    if (button && game.move(Number(button.dataset.box))) showMove();
});
boxesLayer.addEventListener('focusin', event => {
    buttons[focusIndex].tabIndex = -1;
    focusIndex = Number(event.target.dataset.box);
    buttons[focusIndex].tabIndex = 0;
});
boxesLayer.addEventListener('keydown', event => {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    buttons[(focusIndex + direction + buttons.length) % buttons.length].focus();
});
undo.addEventListener('click', () => {
    if (game.undo()) showMove();
});
reset.addEventListener('click', () => start(game.boxes.length));
sizeSelect.addEventListener('change', () => {
    const size = Number(sizeSelect.value);
    if (validBoxCount(size)) start(size);
    else sizeSelect.value = String(game.boxes.length);
});
language.addEventListener('change', updateLabels);

start(game.boxes.length);
app.hidden = false;
