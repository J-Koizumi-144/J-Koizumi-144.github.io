import { NamingGame } from './naming-game.mjs';

const copy = {
    en: {
        language: '言語', edit: 'Edit names', finish: 'Finish editing',
        randomize: 'Randomize names',
        person: 'Person', names: 'names',
        selected: 'Group size',
        board: 'People and their directed nominations',
        node: (person, names, inGroup) => `Person ${person}, names ${names.join(' and ') || 'nobody'}, ${inGroup ? 'in group' : 'outside group'}`,
        editNode: (person, names) => `Person ${person}, names ${names.join(' and ') || 'nobody'}, select to edit`,
        target: (person, target) => `Person ${person} names person ${target}`,
        targets: person => `People named by person ${person}`,
    },
    ja: {
        language: 'Language', edit: '指名を編集', finish: '指名編集を終了',
        randomize: 'ランダムに指名',
        person: '人', names: 'の指名先',
        selected: 'グループの人数',
        board: '人と指名の有向グラフ',
        node: (person, names, inGroup) => `${person}番の人，指名先${names.join('と') || 'なし'}，${inGroup ? 'グループ内' : 'グループ外'}`,
        editNode: (person, names) => `${person}番の人，指名先${names.join('と') || 'なし'}，タップして編集`,
        target: (person, target) => `${person}番の人が${target}番の人を指名`,
        targets: person => `${person}番の人の指名先`,
    },
};

const root = document.getElementById('naming-game');
const language = document.getElementById('naming-language');
const randomize = document.getElementById('naming-randomize');
const editToggle = document.getElementById('naming-edit-toggle');
const editorPanel = root.querySelector('.naming-editor');
const size = document.getElementById('naming-size');
const board = document.getElementById('naming-board');
const targets = document.getElementById('naming-targets');
let game = new NamingGame(Number(size.value));
let source = 0;
let editing = false;

const svgNS = 'http://www.w3.org/2000/svg';
const point = person => {
    const angle = -Math.PI / 2 + (2 * Math.PI * person / game.size);
    return { x: 300 + 240 * Math.cos(angle), y: 300 + 240 * Math.sin(angle) };
};

function drawGraph() {
    const boardWidth = board.clientWidth || 600;
    const mobile = window.matchMedia('(max-width: 520px)').matches;
    const nodeRadius = mobile ? 16 : 25;
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 600');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(svgNS, 'defs');
    for (const [name, color] of [['faint', '#7e8d8d'], ['active', '#087b7f']]) {
        const marker = document.createElementNS(svgNS, 'marker');
        marker.id = `naming-${name}`;
        marker.setAttribute('markerWidth', '9'); marker.setAttribute('markerHeight', '9');
        marker.setAttribute('refX', '7'); marker.setAttribute('refY', '4.5');
        marker.setAttribute('orient', 'auto');
        const tip = document.createElementNS(svgNS, 'path');
        tip.setAttribute('d', 'M 0 1.5 L 9 4.5 L 0 7.5 z'); tip.setAttribute('fill', color);
        marker.append(tip); defs.append(marker);
    }
    svg.append(defs);
    const draw = (person, target, kind) => {
        const a = point(person), b = point(target);
        const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
        const ux = dx / length, uy = dy / length;
        const gap = Math.abs(person - target);
        const outer = gap === 1 || gap === game.size - 1;
        let start, end, pathData;
        if (outer) {
            const offset = (nodeRadius + 3) * 600 / boardWidth;
            const outwardLength = Math.hypot(a.x + b.x - 600, a.y + b.y - 600);
            const outward = {
                x: (a.x + b.x - 600) / outwardLength,
                y: (a.y + b.y - 600) / outwardLength,
            };
            const angle = Math.PI / 5;
            const toward = Math.sin(angle), away = Math.cos(angle);
            start = {
                x: a.x + offset * (away * outward.x + toward * ux),
                y: a.y + offset * (away * outward.y + toward * uy),
            };
            end = {
                x: b.x + offset * (away * outward.x - toward * ux),
                y: b.y + offset * (away * outward.y - toward * uy),
            };
            const arcRadius = (length / 2 - offset * toward) / away;
            const sweep = dx * outward.y - dy * outward.x < 0 ? 1 : 0;
            pathData = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${end.x} ${end.y}`;
        } else {
            const inset = Math.min((nodeRadius + 4) * 600 / boardWidth, length * .45);
            start = { x: a.x + inset * ux, y: a.y + inset * uy };
            end = { x: b.x - inset * ux, y: b.y - inset * uy };
            const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const radius = Math.hypot(middle.x - 300, middle.y - 300);
            const midpoint = radius < 1e-6 ? middle : {
                x: middle.x - 18 * (middle.x - 300) / radius,
                y: middle.y - 18 * (middle.y - 300) / radius,
            };
            pathData = `M ${start.x} ${start.y} Q ${midpoint.x} ${midpoint.y} ${end.x} ${end.y}`;
        }
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', `naming-edge naming-edge-${kind}`);
        path.setAttribute('marker-end', `url(#naming-${kind})`);
        path.dataset.from = person; path.dataset.to = target; path.dataset.route = outer ? 'outer' : 'inner';
        svg.append(path);
    };
    game.names.forEach((names, person) => {
        if (!editing || person !== source) names.forEach(target => draw(person, target, 'faint'));
    });
    if (editing) game.names[source].forEach(target => draw(source, target, 'active'));
    const previous = board.querySelector('svg');
    if (previous) previous.replaceWith(svg);
    else board.prepend(svg);
}

function render(focus = null) {
    const t = copy[language.value];
    const complete = game.names.every(names => names.length === 2);
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(element => { element.textContent = t[element.dataset.label]; });
    editToggle.textContent = editing ? t.finish : t.edit;
    editToggle.setAttribute('aria-pressed', String(editing));
    editToggle.disabled = editing && !complete;
    editorPanel.hidden = !editing;
    document.getElementById('naming-source').textContent = `${t.person} ${source + 1} ${t.names}`;
    targets.setAttribute('aria-label', t.targets(source + 1));
    const fragment = document.createDocumentFragment();
    for (let person = 0; person < game.size; person++) {
        if (person === source) continue;
        const selected = game.names[source].includes(person);
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.target = person;
        button.textContent = `${person + 1}${selected ? ' ✓' : ''}`;
        button.setAttribute('aria-label', t.target(source + 1, person + 1));
        button.setAttribute('aria-pressed', String(selected));
        button.disabled = game.names[source].length === 2 && !selected;
        fragment.append(button);
    }
    targets.replaceChildren(fragment);
    drawGraph();
    board.setAttribute('aria-label', t.board);
    board.querySelectorAll('.naming-node').forEach(node => node.remove());
    for (let person = 0; person < game.size; person++) {
        const button = document.createElement('button');
        const position = point(person);
        button.type = 'button'; button.className = 'naming-node'; button.dataset.person = person;
        button.dataset.source = String(editing && person === source);
        button.dataset.group = String(game.group[person]);
        button.style.left = `${position.x / 6}%`; button.style.top = `${position.y / 6}%`;
        const circle = document.createElement('span');
        circle.textContent = String(person + 1);
        button.append(circle);
        const named = game.names[person].map(target => target + 1);
        button.setAttribute('aria-label', editing ? t.editNode(person + 1, named) : t.node(person + 1, named, game.group[person]));
        button.setAttribute('aria-pressed', String(editing ? person === source : game.group[person]));
        button.disabled = !editing && !game.group[person] && Boolean(game.groupBlockReason(person));
        board.append(button);
    }
    const state = game.analysis;
    document.getElementById('naming-selected').textContent = state.selected;
    if (focus?.type === 'node') board.querySelector(`button[data-person="${focus.person}"]`)?.focus({ preventScroll: true });
    if (focus?.type === 'target') targets.querySelector(`button[data-target="${focus.person}"]`)?.focus({ preventScroll: true });
}

board.addEventListener('click', event => {
    const button = event.target.closest('button[data-person]');
    if (!button) return;
    const person = Number(button.dataset.person);
    if (editing) { source = person; render({ type: 'node', person }); return; }
    if (game.toggle(person)) render({ type: 'node', person });
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-person]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    for (let step = 1; step <= game.size; step++) {
        const next = (Number(button.dataset.person) + direction * step + game.size * step) % game.size;
        const target = board.querySelector(`button[data-person="${next}"]`);
        if (!target.disabled) { target.focus(); break; }
    }
});
targets.addEventListener('click', event => {
    const button = event.target.closest('button[data-target]');
    if (!button) return;
    const person = Number(button.dataset.target);
    if (game.toggleName(source, person)) render({ type: 'target', person });
});
editToggle.addEventListener('click', () => {
    if (editing && game.names.some(names => names.length !== 2)) return;
    game.clearGroup();
    editing = !editing;
    render();
});
randomize.addEventListener('click', () => { game.randomize(); render(); });
size.addEventListener('change', () => { game = new NamingGame(Number(size.value)); source = 0; render(); });
language.addEventListener('change', () => render());
window.addEventListener('resize', drawGraph);
render(); root.hidden = false; drawGraph();
