import { BallBoxes, MAX_PER_COLOR, shuffledBalls } from './ball-boxes-game.mjs';

const app = document.getElementById('ball-game');
const board = app.querySelector('#ball-board');
const frames = app.querySelector('#ball-frames');
const slots = app.querySelector('#ball-slots');
const size = app.querySelector('#ball-size');
const language = app.querySelector('#ball-language');
const languageLabel = app.querySelector('#ball-language-label');
const count = app.querySelector('#ball-count');
const ratioKey = app.querySelector('#ball-ratio-key');
const message = app.querySelector('#ball-message');
const merge = app.querySelector('#ball-merge');
const undo = app.querySelector('#ball-undo');
const reset = app.querySelector('#ball-reset');
const edit = app.querySelector('#ball-edit');

const words = {
    en: {
        size: 'Balls per color', redPercent: 'Red balls (%)', merge: 'Merge', undo: 'Undo', reset: 'Reset',
        edit: 'Edit starting arrangement', finish: 'Finish editing', language: '言語',
        boxes: n => n === 1 ? '1 box' : n + ' boxes', balls: n => n + ' balls',
        boxLabel: (i, box, percent) => 'Box ' + (i + 1) + ', ' + box.red + ' of ' + box.size + ' red (' + percent + ')',
        ballLabel: (i, color) => 'Position ' + (i + 1) + ', ' + color + ' ball',
        playBoard: 'Row of boxes', editBoard: 'Starting order of the balls',
        chooseTwo: 'Select two adjacent boxes.', chooseSecond: 'Select a second box.',
        notAdjacent: 'The selected boxes are not adjacent.', wrongRatio: 'The red percentage is higher on the left.',
        ready: 'These boxes can be merged.', complete: 'All the balls are in one box.', stuck: 'No more merges are possible.',
        drag: 'Drag a ball, or select a ball and then its new position.', place: 'Select the new position for this ball.',
    },
    ja: {
        size: '各色の玉の数', redPercent: '赤玉の割合（％）', merge: '合成する', undo: '1手戻す', reset: 'リセット',
        edit: '初期配置を編集する', finish: '編集を終える', language: 'Language',
        boxes: n => '箱 ' + n + ' 個', balls: n => '玉 ' + n + ' 個',
        boxLabel: (i, box, percent) => (i + 1) + '番目の箱，玉' + box.size + '個のうち赤玉' + box.red + '個（' + percent + '）',
        ballLabel: (i, color) => (i + 1) + '番目の' + (color === 'red' ? '赤玉' : '白玉'),
        playBoard: '箱の並び', editBoard: '玉の初期配置',
        chooseTwo: '隣り合う二つの箱を選んでください．', chooseSecond: 'もう一つの箱を選んでください．',
        notAdjacent: '選んだ二つの箱は隣り合っていません．', wrongRatio: '左の箱のほうが赤玉の割合が高いため，合成できません．',
        ready: 'この二つの箱を合成できます．', complete: 'すべての玉が一つの箱にまとまりました．', stuck: 'これ以上合成できません．',
        drag: '玉をドラッグするか，玉と移動先を順に選んでください．', place: '選んだ玉の移動先を指定してください．',
    },
};
const format = Object.fromEntries(Object.keys(words).map(lang =>
    [lang, new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 })]));
let game = new BallBoxes(shuffledBalls(4));
let picked = null;
let drag = null;
let suppressClick = false;

function makeButton(className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.tabIndex = -1;
    return button;
}

function buildSlots() {
    board.style.setProperty('--slots', game.balls.length);
    slots.replaceChildren(...game.balls.map((_, i) => {
        const slot = makeButton('ball-slot');
        slot.style.gridColumn = String(i + 1);
        slot.dataset.index = i;
        const orb = document.createElement('span');
        orb.className = 'ball-orb';
        slot.append(orb);
        return slot;
    }));
}

function buildFrames() {
    frames.replaceChildren(...game.boxes.map((box, i) => {
        const button = makeButton('box-target');
        button.dataset.index = i;
        button.style.gridColumn = (box.start + 1) + ' / span ' + box.size;
        const outline = document.createElement('span');
        outline.className = 'box-outline';
        const percent = document.createElement('span');
        percent.className = 'box-percent';
        button.append(outline, percent);
        return button;
    }));
    if (frames.firstElementChild) frames.firstElementChild.tabIndex = 0;
}

function setRovingFocus(layer, index, focus = false) {
    Array.from(layer.children).forEach((button, i) => { button.tabIndex = i === index ? 0 : -1; });
    if (focus) layer.children[index]?.focus({ preventScroll: true });
}

function update() {
    const lang = language.value;
    const t = words[lang];
    app.lang = lang;
    app.dataset.editing = String(game.editing);
    languageLabel.lang = lang === 'en' ? 'ja' : 'en';
    languageLabel.textContent = t.language;
    app.querySelectorAll('[data-copy]').forEach(node => { node.textContent = t[node.dataset.copy]; });
    size.value = String(game.balls.length / 2);
    count.textContent = game.editing ? t.balls(game.balls.length) : t.boxes(game.boxes.length);
    edit.textContent = game.editing ? t.finish : t.edit;
    edit.setAttribute('aria-pressed', String(game.editing));
    ratioKey.hidden = frames.hidden = game.editing;
    slots.setAttribute('aria-hidden', String(!game.editing));
    board.setAttribute('aria-label', game.editing ? t.editBoard : t.playBoard);

    Array.from(slots.children).forEach((button, i) => {
        button.dataset.color = game.balls[i];
        button.disabled = !game.editing;
        button.setAttribute('aria-label', t.ballLabel(i, game.balls[i]));
        if (game.editing) button.setAttribute('aria-pressed', String(picked === i));
        else {
            button.removeAttribute('aria-pressed');
            button.tabIndex = -1;
        }
    });
    Array.from(frames.children).forEach((button, i) => {
        const box = game.boxes[i];
        const percent = format[lang].format(box.red / box.size);
        button.lastElementChild.textContent = percent;
        button.setAttribute('aria-label', t.boxLabel(i, box, percent));
        button.setAttribute('aria-pressed', String(game.selected.includes(i)));
    });

    merge.hidden = undo.hidden = reset.hidden = game.editing;
    const selection = game.selectionState;
    merge.disabled = selection !== 'ready';
    undo.disabled = !game.history.length;
    reset.disabled = !game.history.length && !game.selected.length;
    let key = selection;
    if (game.editing) key = picked === null ? 'drag' : 'place';
    else if (game.boxes.length === 1) key = 'complete';
    else if (game.stuck) key = 'stuck';
    message.dataset.kind = ['notAdjacent', 'wrongRatio', 'stuck'].includes(key) ? 'blocked' : key;
    if (message.textContent !== t[key]) message.textContent = t[key];
}

function changeMode(editing) {
    endDrag();
    picked = null;
    if (editing) game.startEditing();
    else game.startPlay();
    buildFrames();
    update();
    setRovingFocus(editing ? slots : frames, 0, true);
}

function pickOrPlace(index) {
    if (picked === null) picked = index;
    else {
        game.moveBall(picked, index);
        picked = null;
    }
    setRovingFocus(slots, index);
    update();
}

frames.addEventListener('click', event => {
    const button = event.target.closest('.box-target');
    if (!button) return;
    const index = Number(button.dataset.index);
    setRovingFocus(frames, index);
    game.selectBox(index);
    update();
});
slots.addEventListener('click', event => {
    const button = event.target.closest('.ball-slot');
    if (suppressClick || !game.editing || !button) return;
    pickOrPlace(Number(button.dataset.index));
});

merge.addEventListener('click', () => {
    const index = Math.min(...game.selected);
    if (!game.merge()) return;
    buildFrames();
    update();
    setRovingFocus(frames, index, true);
});
undo.addEventListener('click', () => {
    if (!game.undo()) return;
    buildFrames();
    update();
    if (undo.disabled) setRovingFocus(frames, 0, true);
});
reset.addEventListener('click', () => changeMode(false));
edit.addEventListener('click', () => changeMode(!game.editing));
language.addEventListener('change', update);
size.addEventListener('change', () => {
    endDrag();
    const editing = game.editing;
    game = new BallBoxes(shuffledBalls(Number(size.value)));
    picked = null;
    if (editing) game.startEditing();
    buildSlots();
    buildFrames();
    update();
    if (editing) setRovingFocus(slots, 0);
});

board.addEventListener('focusin', event => {
    const button = event.target.closest('button');
    if (button) setRovingFocus(button.parentElement, Number(button.dataset.index));
});
board.addEventListener('keydown', event => {
    suppressClick = false;
    if (event.key === 'Escape' && game.editing) {
        endDrag();
        picked = null;
        update();
        return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    const layer = button.parentElement;
    const i = Number(button.dataset.index);
    const last = layer.childElementCount - 1;
    const positions = { ArrowLeft: Math.max(0, i - 1), ArrowRight: Math.min(last, i + 1), Home: 0, End: last };
    if (Object.hasOwn(positions, event.key)) {
        event.preventDefault();
        setRovingFocus(layer, positions[event.key], true);
    }
});

function endDrag() {
    if (!drag) return;
    const { button, id } = drag;
    drag = null;
    slots.classList.remove('reordering');
    button.classList.remove('dragging');
    for (const slot of slots.children) slot.style.removeProperty('transform');
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
}

slots.addEventListener('pointerdown', event => {
    const button = event.target.closest('.ball-slot');
    if (!game.editing || !button || !event.isPrimary || event.button !== 0 || drag) return;
    suppressClick = false;
    const from = Number(button.dataset.index);
    drag = { button, id: event.pointerId, from, target: from, startX: event.clientX, moved: false };
    button.setPointerCapture(event.pointerId);
});

function positionDrag(clientX) {
    const distance = clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    if (!drag.moved) {
        drag.moved = true;
        picked = null;
        update();
        slots.classList.add('reordering');
        drag.button.classList.add('dragging');
    }
    const step = slots.getBoundingClientRect().width / game.balls.length;
    const from = drag.from;
    const dx = Math.max(-from * step, Math.min(distance, (game.balls.length - 1 - from) * step));
    drag.target = from + Math.round(dx / step);
    Array.from(slots.children).forEach((slot, i) => {
        if (i === from) slot.style.transform = 'translateX(' + dx + 'px)';
        else if (from < i && i <= drag.target) slot.style.transform = 'translateX(-100%)';
        else if (drag.target <= i && i < from) slot.style.transform = 'translateX(100%)';
        else slot.style.removeProperty('transform');
    });
}

slots.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) positionDrag(event.clientX);
});
slots.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    positionDrag(event.clientX);
    const { from, target, moved } = drag;
    endDrag();
    if (moved) {
        suppressClick = true;
        game.moveBall(from, target);
        setRovingFocus(slots, target, true);
        update();
    }
});
for (const type of ['pointercancel', 'lostpointercapture']) {
    slots.addEventListener(type, event => {
        if (drag && event.pointerId === drag.id) {
            suppressClick = true;
            endDrag();
        }
    });
}

for (let n = 1; n <= MAX_PER_COLOR; n++) size.add(new Option(String(n), String(n)));
buildSlots();
buildFrames();
update();
app.hidden = false;
