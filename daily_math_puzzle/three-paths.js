import { sizes, colors, makeBoard, nearestEdge, newPainting, paintEdge, undo, coverage } from './three-paths-model.mjs';

const root = document.getElementById('three-paths');
const find = selector => root.querySelector(selector);
const boardSvg = find('#tp-board');
const sizeSelect = find('#tp-size');
const letters = ['A', 'B', 'C'];
const labels = {
    en: {
        language: '言語', points: 'Interior points', next: 'Change layout',
        guide: 'Choose a color, then click an edge to paint it.',
        red: 'Red', blue: 'Blue', green: 'Green', erase: 'Erase', blank: 'Uncolored',
        undo: 'Undo', reset: 'Reset', reached: 'Interior points reached',
        tools: 'Edge color', board: 'Triangulation', none: 'None',
        edge: (a, b, color) => 'Edge ' + a + ' – ' + b + ', ' + color,
        node: (v, ends) => 'Point ' + v + '. Corners reached: ' + ends,
        corner: (v, color) => 'Corner ' + v + ', ' + color,
        paints: (n, total) => n + ' / ' + total + ' edges colored',
        done: 'Complete! Every point reaches all three corners.',
    },
    ja: {
        language: 'Language', points: '内点の数', next: '別の配置',
        guide: '色を選んで、塗りたい辺をクリックしてください。',
        red: '赤', blue: '青', green: '緑', erase: '消す', blank: '未着色',
        undo: '1手戻す', reset: 'リセット', reached: '各頂点から届く内点の数',
        tools: '辺の色', board: '三角形分割', none: 'なし',
        edge: (a, b, color) => '辺 ' + a + ' – ' + b + '、' + color,
        node: (v, ends) => '内点 ' + v + '。到達できる頂点：' + ends,
        corner: (v, color) => '頂点 ' + v + '、' + color,
        paints: (n, total) => '着色した辺 ' + n + ' / ' + total + ' 本',
        done: '完成！ どの内点からも3頂点に届きます。',
    },
};
let state = newPainting(makeBoard(7));
let lang = 'en';
let brush = 'red';
let activeEdge = 0;
let edgeButtons = [];
let pointMarks = [];
let hoverEdge = null;

function svg(tag, attributes, parent) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
    parent.append(el);
    return el;
}

function vertexName(index) {
    return letters[index] ?? String(index - 2);
}

// Arc positions match the destinations: lower left A, lower right B, top C.
function arcAt(index) {
    const center = [150, 30, 270][index];
    const point = angle => [12.2 * Math.cos(angle * Math.PI / 180), 12.2 * Math.sin(angle * Math.PI / 180)];
    return 'M' + point(center - 53).join(' ') + ' A12.2 12.2 0 0 1 ' + point(center + 53).join(' ');
}

function drawBoard() {
    const {points, edges} = state.board;
    hoverEdge = null;
    boardSvg.replaceChildren();
    const boundary = points.slice(0, 3).map(p => p.join(',')).join(' ');
    svg('polygon', {points: boundary, class: 'tp-boundary'}, boardSvg);
    activeEdge = 0;
    edgeButtons = edges.map(([a, b], i) => {
        const button = svg('g', {class: 'tp-edge', role: 'button', tabindex: i === 0 ? 0 : -1, 'data-edge': i}, boardSvg);
        const endpoints = {x1: points[a][0], y1: points[a][1], x2: points[b][0], y2: points[b][1]};
        svg('line', {...endpoints, class: 'tp-hit'}, button);
        svg('line', {...endpoints, class: 'tp-halo'}, button);
        svg('line', {...endpoints, class: 'tp-edge-line'}, button);
        return button;
    });
    // Keep taps on the perimeter from painting nearby incident edges.
    svg('polygon', {points: boundary, fill: 'none', stroke: 'transparent', 'stroke-width': 6, 'pointer-events': 'stroke'}, boardSvg);
    pointMarks = points.map(([x, y], i) => {
        const mark = svg('g', {transform: 'translate(' + x + ' ' + y + ')', role: 'img'}, boardSvg);
        const title = svg('title', {}, mark);
        const sectors = [];
        if (i < 3) {
            mark.dataset.tone = colors[i];
            svg('circle', {r: 15, class: 'tp-corner'}, mark);
        } else {
            svg('circle', {r: 9.5, class: 'tp-node'}, mark);
            colors.forEach((color, j) => {
                sectors.push(svg('path', {d: arcAt(j), class: 'tp-sector', 'data-tone': color}, mark));
            });
        }
        const text = svg('text', {'text-anchor': 'middle', y: i < 3 ? 7 : 4.5, class: i < 3 ? 'tp-letter' : 'tp-id'}, mark);
        text.textContent = vertexName(i);
        return {mark, title, sectors};
    });
}

const counters = colors.map((color, i) => {
    const cell = document.createElement('span');
    cell.className = 'tp-count';
    cell.dataset.tone = color;
    const line = document.createElement('i');
    line.setAttribute('aria-hidden', 'true');
    const letter = document.createElement('b');
    letter.textContent = letters[i];
    const count = document.createElement('span');
    cell.append(line, letter, count);
    find('#tp-counts').append(cell);
    return count;
});

function render() {
    const copy = labels[lang];
    const {counts, reached, complete} = coverage(state);
    edgeButtons.forEach((button, i) => {
        const color = state.paint[i];
        if (color) button.dataset.tone = color;
        else delete button.dataset.tone;
        const [a, b] = state.board.edges[i].map(vertexName);
        button.setAttribute('aria-label', copy.edge(a, b, copy[color ?? 'blank']));
    });
    pointMarks.forEach(({mark, title, sectors}, i) => {
        const ends = letters.filter((_, k) => reached[k].has(i));
        sectors.forEach((sector, k) => sector.classList.toggle('on', reached[k].has(i)));
        title.textContent = i < 3 ? copy.corner(letters[i], copy[colors[i]]) : copy.node(vertexName(i), ends.join(', ') || copy.none);
        mark.setAttribute('aria-label', title.textContent);
    });
    counters.forEach((counter, i) => {
        counter.textContent = counts[i] + ' / ' + state.board.size;
    });
    const painted = state.paint.filter(Boolean).length;
    const message = find('#tp-message');
    message.textContent = complete ? copy.done : copy.paints(painted, state.paint.length);
    message.classList.toggle('complete', complete);
    boardSvg.classList.toggle('complete', complete);
    find('#tp-undo').disabled = !state.history.length;
    find('#tp-reset').disabled = !state.history.length;
    find('#tp-next').disabled = state.board.variants === 1;
}

function selectBrush(value) {
    brush = value;
    for (const button of root.querySelectorAll('[data-brush]')) {
        button.setAttribute('aria-pressed', String(button.dataset.brush === brush));
    }
}

function setLanguage(language) {
    lang = language;
    root.lang = lang;
    const copy = labels[lang];
    for (const el of root.querySelectorAll('[data-word]')) el.textContent = copy[el.dataset.word];
    boardSvg.setAttribute('aria-label', copy.board);
    find('#tp-tools').setAttribute('aria-label', copy.tools);
    find('#tp-counts').setAttribute('aria-label', copy.reached);
    render();
}

function switchBoard(size, variant = 0) {
    state = newPainting(makeBoard(size, variant));
    drawBoard();
    render();
}

function focusEdge(index) {
    edgeButtons[activeEdge].setAttribute('tabindex', '-1');
    activeEdge = index;
    edgeButtons[index].setAttribute('tabindex', '0');
    edgeButtons[index].focus({preventScroll: true});
}

function paint(index) {
    if (paintEdge(state, index, brush === 'erase' ? null : brush)) render();
}

for (const size of sizes) sizeSelect.add(new Option(String(size), String(size)));
sizeSelect.value = String(state.board.size);
sizeSelect.addEventListener('change', () => switchBoard(Number(sizeSelect.value)));
find('#tp-next').addEventListener('click', () => switchBoard(state.board.size, (state.board.variant + 1) % state.board.variants));
find('#tp-language').addEventListener('change', e => setLanguage(e.target.value));
find('#tp-tools').addEventListener('click', e => {
    const button = e.target.closest('[data-brush]');
    if (button) selectBrush(button.dataset.brush);
});
function pointerEdge(event) {
    const button = event.target.closest('[data-edge]');
    if (!button) return null;
    if (event.type === 'click' && event.detail === 0) return Number(button.dataset.edge);
    const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(boardSvg.getScreenCTM().inverse());
    return nearestEdge(state.board, position.x, position.y);
}

function showHover(index) {
    if (hoverEdge === index) return;
    if (hoverEdge !== null) edgeButtons[hoverEdge].removeAttribute('data-hover');
    if (index !== null) edgeButtons[index].setAttribute('data-hover', '');
    hoverEdge = index;
}

boardSvg.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') showHover(pointerEdge(e));
});
boardSvg.addEventListener('pointerleave', () => showHover(null));
boardSvg.addEventListener('click', e => {
    const index = pointerEdge(e);
    if (index === null) return;
    focusEdge(index);
    paint(index);
});
boardSvg.addEventListener('keydown', e => {
    if (!e.target.closest('[data-edge]')) return;
    const key = e.key;
    if (key === ' ' || key === 'Enter') {
        e.preventDefault();
        paint(activeEdge);
    } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(key)) {
        e.preventDefault();
        const n = edgeButtons.length;
        if (key === 'Home') focusEdge(0);
        else if (key === 'End') focusEdge(n - 1);
        else focusEdge((activeEdge + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : n - 1)) % n);
    }
});
find('#tp-undo').addEventListener('click', () => { undo(state); render(); });
find('#tp-reset').addEventListener('click', () => { state = newPainting(state.board); render(); });

drawBoard();
selectBrush('red');
setLanguage('en');
root.hidden = false;
