import { PhotoGame, MIN_PEOPLE, MAX_PEOPLE, pairKey } from './photo-game.mjs';

const copy = {
    en: {
        language: '言語', people: 'People', photos: 'Photos', remaining: 'Pairs left',
        take: 'Take photo', clear: 'Clear selection', undo: 'Undo', reset: 'Reset',
        instruction: 'Select people by clicking the numbered circles.',
        board: 'People in clockwise order. Lines connect pairs not yet photographed together.',
        person: n => `Person ${n}`,
        choose: 'Select at least two people.',
        one: 'Select one more person.',
        ready: n => `${n} people selected.`,
        conflict: (a, b) => `${a} and ${b} have already appeared together.`,
        everyone: 'A photo cannot include everyone.',
        done: 'Every pair has appeared together exactly once.',
        history: 'Photo history',
        photo: (i, people) => `Photo ${i}: ${people}`,
        empty: 'No photos yet.',
    },
    ja: {
        language: 'Language', people: '人数', photos: '撮影枚数', remaining: '残りの組数',
        take: '撮影する', clear: '選択を解除', undo: '1手戻す', reset: 'リセット',
        instruction: '番号の丸を押して，人を選びます．',
        board: '時計回りに並ぶ人．線はまだ一緒に写っていない2人組を表します．',
        person: n => `${n}番`,
        choose: '2人以上を選んでください．',
        one: 'もう1人選んでください．',
        ready: n => `${n}人を選択しています．`,
        conflict: (a, b) => `${a}と${b}はすでに一緒に写っています．`,
        everyone: '全員が一緒に写る写真は撮れません．',
        done: 'どの2人も，ちょうど1枚に一緒に写っています．',
        history: '撮影した写真',
        photo: (i, people) => `${i}枚目：${people}`,
        empty: 'まだ撮影していません．',
    },
};

const root = document.getElementById('photo-game');
const board = document.getElementById('photo-board');
const lines = document.getElementById('photo-lines');
const vertices = document.getElementById('photo-vertices');
const message = document.getElementById('photo-message');
const takeButton = document.getElementById('take-photo');
const undoButton = document.getElementById('undo-photo');
const clearButton = document.getElementById('clear-selection');
const resetButton = document.getElementById('reset-photos');
const sizeSelect = document.getElementById('photo-size');
const languageSelect = document.getElementById('photo-language');
let game = new PhotoGame();
let activePerson = 1;

for (let n = MIN_PEOPLE; n <= MAX_PEOPLE; n++) {
    const option = document.createElement('option');
    option.value = n;
    option.textContent = n;
    option.selected = n === game.n;
    sizeSelect.append(option);
}

function position(person) {
    const angle = -Math.PI / 2 + (person - 1) * 2 * Math.PI / game.n;
    return [50 + 40 * Math.cos(angle), 50 + 40 * Math.sin(angle)];
}

function createVertices() {
    vertices.replaceChildren();
    for (let person = 1; person <= game.n; person++) {
        const [x, y] = position(person);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'photo-person';
        button.dataset.person = person;
        button.style.left = `${x}%`;
        button.style.top = `${y}%`;
        const label = document.createElement('span');
        label.textContent = person;
        button.append(label);
        vertices.append(button);
    }
}

function render(focusPerson) {
    const t = copy[languageSelect.value];
    const conflicts = game.conflicts;
    const conflictingPeople = new Set(conflicts.flat());
    const selected = new Set(game.selected);
    root.lang = languageSelect.value;
    root.querySelectorAll('[data-word]').forEach(el => { el.textContent = t[el.dataset.word]; });
    board.setAttribute('aria-label', t.board);
    document.getElementById('photo-total').textContent = game.photos.length;
    document.getElementById('pairs-left').textContent = game.remaining.size;
    takeButton.disabled = !game.canTakePhoto;
    clearButton.disabled = game.selected.length === 0;
    undoButton.disabled = game.photos.length === 0;
    resetButton.disabled = game.photos.length === 0 && game.selected.length === 0;

    const edgeElements = [];
    for (let a = 1; a <= game.n; a++) {
        for (let b = a + 1; b <= game.n; b++) {
            if (!game.remaining.has(pairKey(a, b))) continue;
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const [x1, y1] = position(a);
            const [x2, y2] = position(b);
            for (const [attr, value] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(attr, value);
            line.dataset.pair = pairKey(a, b);
            if (selected.has(a) && selected.has(b)) line.classList.add('selected-edge');
            edgeElements.push(line);
        }
    }
    // Draw selected edges last so they remain visible at intersections.
    edgeElements.sort((a, b) => a.classList.length - b.classList.length);
    lines.replaceChildren(...edgeElements);

    for (const button of vertices.children) {
        const person = Number(button.dataset.person);
        button.setAttribute('aria-label', t.person(person));
        button.setAttribute('aria-pressed', String(selected.has(person)));
        button.classList.toggle('conflicting-person', conflictingPeople.has(person));
        button.tabIndex = person === activePerson ? 0 : -1;
    }

    message.dataset.state = '';
    if (conflicts.length) {
        message.textContent = t.conflict(...conflicts[0]);
        message.dataset.state = 'blocked';
    } else if (game.issue === 'everyone') {
        message.textContent = t.everyone;
        message.dataset.state = 'blocked';
    } else if (game.complete) {
        message.textContent = t.done;
        message.dataset.state = 'complete';
    } else if (game.canTakePhoto) {
        message.textContent = t.ready(game.selected.length);
    } else {
        message.textContent = game.selected.length ? t.one : t.choose;
    }

    const history = document.getElementById('photo-history');
    history.replaceChildren(...game.photos.map((photo, i) => {
        const row = document.createElement('li');
        row.textContent = t.photo(i + 1, [...photo].sort((a, b) => a - b).join(', '));
        return row;
    }));
    document.getElementById('empty-history').hidden = game.photos.length > 0;
    if (focusPerson !== undefined) {
        vertices.querySelector(`[data-person="${focusPerson}"]`)?.focus({ preventScroll: true });
    }
}

vertices.addEventListener('click', event => {
    const button = event.target.closest('.photo-person');
    if (!button) return;
    activePerson = Number(button.dataset.person);
    game.toggle(activePerson);
    render(activePerson);
});

vertices.addEventListener('keydown', event => {
    const button = event.target.closest('.photo-person');
    if (!button) return;
    const person = Number(button.dataset.person);
    let next;
    switch (event.key) {
        case 'ArrowRight': case 'ArrowDown': next = person % game.n + 1; break;
        case 'ArrowLeft': case 'ArrowUp': next = (person + game.n - 2) % game.n + 1; break;
        case 'Home': next = 1; break;
        case 'End': next = game.n; break;
        default: return;
    }
    event.preventDefault();
    activePerson = next;
    render(next);
});

takeButton.addEventListener('click', () => {
    if (game.takePhoto()) render(activePerson);
});
clearButton.addEventListener('click', () => {
    game.clearSelection();
    render(activePerson);
});
undoButton.addEventListener('click', () => {
    if (game.undo()) {
        activePerson = game.selected[0];
        render(activePerson);
    }
});
function reset() {
    game = new PhotoGame(Number(sizeSelect.value));
    activePerson = 1;
    createVertices();
    render();
}
resetButton.addEventListener('click', () => { reset(); render(1); });
sizeSelect.addEventListener('change', reset);
languageSelect.addEventListener('change', () => render());

createVertices();
render();
root.hidden = false;
