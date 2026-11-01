import { PenGame } from './right-turn-game.mjs';

const copy = {
    en: {
        language: '言語', instructions: 'Choose grid points in order. Lift the pen to start another stroke.',
        strokes: 'Strokes', edges: 'Edges traced', lift: 'Lift pen', undo: 'Undo', reset: 'Reset',
        board: 'Grid points', point: (r, c) => 'Row ' + r + ', column ' + c,
        tip: 'pen', ready: 'Choose a starting point.', first: 'Choose a neighboring point.',
        turn: 'Choose the next point or lift the pen.', blocked: 'No further edge in this stroke. Lift the pen.',
        done: 'Every edge has been traced.'
    },
    ja: {
        language: 'Language', instructions: '格子点を順に押して線を引きます．次の筆に移るにはペンを上げます．',
        strokes: '筆数', edges: 'なぞった辺', lift: 'ペンを上げる', undo: '1手戻す', reset: 'リセット',
        board: '方眼の格子点', point: (r, c) => r + '行' + c + '列',
        tip: 'ペンの位置', ready: '始点を選んでください．', first: '隣の格子点を選んでください．',
        turn: '次の点を選ぶか，ペンを上げてください．', blocked: 'この筆ではこれ以上進めません．ペンを上げてください．',
        done: 'すべての辺をなぞりました．'
    }
};

const byId = id => document.getElementById(id);
const root = byId('pen-game');
const board = byId('pen-board');
const language = byId('pen-language');
const size = byId('pen-size');
let game = new PenGame(Number(size.value));
let activePoint = 0;

function svgElement(name, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
}

const coord = value => value * 48 + 24;

function strokePath(stroke, width) {
    const radius = 20;
    const endpointGap = 9;
    const points = stroke.map(p => [coord(p % width), coord(Math.floor(p / width))]);
    const closed = stroke[0] === stroke.at(-1);

    function toward([x, y], [nextX, nextY], distance) {
        return [x + Math.sign(nextX - x) * distance, y + Math.sign(nextY - y) * distance].join(' ');
    }

    let d = 'M ' + toward(points[0], points[1], closed ? radius : endpointGap);
    for (let i = 1; i < points.length; i++) {
        const corner = points[i];
        // On a loop the final point is also the first corner.
        const next = points[i + 1] ?? (closed ? points[1] : null);
        d += ' L ' + toward(corner, points[i - 1], next ? radius : endpointGap);
        if (next) d += ` A ${radius} ${radius} 0 0 1 ` + toward(corner, next, radius);
    }
    return closed ? d + ' Z' : d;
}

function drawLines(width, activeStroke) {
    const last = coord(width - 1);
    const svg = svgElement('svg', { viewBox: '0 0 ' + width * 48 + ' ' + width * 48, 'aria-hidden': true });
    for (let i = 0; i < width; i++) {
        const at = coord(i);
        svg.append(svgElement('line', {class: 'grid-line', x1: 24, x2: last, y1: at, y2: at}),
            svgElement('line', {class: 'grid-line', x1: at, x2: at, y1: 24, y2: last}));
    }
    for (const path of game.strokes) {
        if (path.length < 2) continue;
        svg.append(svgElement('path', {
            class: path === activeStroke ? 'ink current' : 'ink',
            d: strokePath(path, width)
        }));
    }
    return svg;
}

function render(focus = false) {
    const t = copy[language.value];
    const width = game.size + 1;
    const current = game.current;
    const done = game.edgeCount === game.totalEdges;
    const tip = done ? undefined : current.at(-1);
    const step = tip - current.at(-2);
    const arrows = {1: '→', [-1]: '←', [width]: '↓', [-width]: '↑'};
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    byId('stroke-count').textContent = game.strokeCount;
    byId('edge-count').textContent = game.edgeCount + ' / ' + game.totalEdges;
    byId('pen-lift').disabled = !game.down;
    byId('pen-undo').disabled = byId('pen-reset').disabled = !game.history.length;
    board.setAttribute('aria-label', t.board);
    board.style.setProperty('--points', width);
    const nodes = [drawLines(width, done ? null : current)];
    let available = 0;
    for (let point = 0; point < width * width; point++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'point';
        button.dataset.point = point;
        const legal = game.canSelect(point);
        if (legal) available++;
        button.dataset.next = legal && game.down;
        button.dataset.tip = arrows[step] || '●';
        button.tabIndex = point === activePoint ? 0 : -1;
        const name = t.point(Math.floor(point / width) + 1, point % width + 1);
        button.setAttribute('aria-label', tip === point ? name + ' (' + t.tip + ')' : name);
        button.setAttribute('aria-pressed', tip === point);
        button.setAttribute('aria-disabled', !legal);
        nodes.push(button);
    }
    board.replaceChildren(...nodes);
    const message = byId('pen-message');
    message.dataset.state = done ? 'complete' : game.down && !available ? 'blocked' : '';
    if (done) message.textContent = t.done;
    else if (!game.down) message.textContent = t.ready;
    else if (!available) message.textContent = t.blocked;
    else message.textContent = current.length === 1 ? t.first : t.turn;
    if (focus) board.querySelector('[tabindex="0"]').focus();
}

board.addEventListener('click', event => {
    const button = event.target.closest('button[data-point]');
    if (!button) return;
    const point = Number(button.dataset.point);
    if (!game.select(point)) return;
    activePoint = point;
    render(true);
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-point]');
    if (!button) return;
    const point = Number(button.dataset.point);
    const width = game.size + 1;
    const x = point % width, y = Math.floor(point / width);
    const targets = {
        ArrowLeft: point - (x > 0), ArrowRight: point + (x < game.size),
        ArrowUp: point - (y > 0 ? width : 0), ArrowDown: point + (y < game.size ? width : 0),
        Home: point - x, End: point - x + game.size
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    activePoint = targets[event.key];
    board.querySelector('[tabindex="0"]').tabIndex = -1;
    const target = board.querySelector('[data-point="' + activePoint + '"]');
    target.tabIndex = 0;
    target.focus();
});
byId('pen-lift').addEventListener('click', () => { game.lift(); render(true); });
byId('pen-undo').addEventListener('click', () => { game.undo(); render(); });
function reset() {
    game = new PenGame(Number(size.value));
    activePoint = 0;
    render();
}
byId('pen-reset').addEventListener('click', reset);
size.addEventListener('change', reset);
language.addEventListener('change', () => render());
render();
root.hidden = false;
