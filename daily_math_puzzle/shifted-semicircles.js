import { MIN_SIZE, MAX_SIZE, makeDiagram, blankDiagram, complete, arcError, addArc, removeArc, nextStep, finished } from './shifted-semicircles-game.mjs';

const words = {
    en: {
        size: 'Upper semicircles', original: 'Original', copy: 'Shifted copy', visited: 'Points visited',
        drawn: 'Arcs drawn', route: 'Visit order', board: 'Semicircle diagram', point: 'Point',
        play: 'Play', remove: 'Delete arc', undo: 'Undo', clear: 'Clear all',
        here: n => 'Passed point ' + n + '.', end: 'Right end', done: 'Visited every point and reached the right end.',
        first: 'Choose two free points to draw an arc, or select an arc to delete it.',
        second: n => 'Point ' + n + ' selected. Choose the other end.',
        ready: 'Press Play to follow the path, or select an arc to edit the drawing.',
        selected: (a, b) => 'Arc ' + a + '–' + b + ' selected. Press Delete arc to remove it.',
        arc: (a, b) => 'Select arc ' + a + '–' + b,
        crossing: 'These semicircles would cross. Choose another endpoint.',
    },
    ja: {
        size: '上側の半円の本数', original: '上側の半円', copy: 'ずらした写し', visited: '通った点',
        drawn: '描いた半円', route: '通った順番', board: '半円の図', point: '点',
        play: '再生', remove: '半円を削除', undo: '1手戻す', clear: 'すべて消す',
        here: n => '点' + n + 'を通りました。', end: '右端', done: 'すべての点を通って、右端に着きました。',
        first: '空いている2点を選ぶと半円を描けます。消したい半円は押して選べます。',
        second: n => '点' + n + 'を選びました。もう一方の端を選んでください。',
        ready: '「再生」で道をたどれます。編集するときは半円を選んでください。',
        selected: (a, b) => '点' + a + 'と点' + b + 'を結ぶ半円を選びました。「半円を削除」で消せます。',
        arc: (a, b) => '点' + a + 'と点' + b + 'を結ぶ半円を選択',
        crossing: 'ほかの半円と交わります。別の端点を選んでください。',
    },
};

const app = document.getElementById('arc-app');
const el = id => document.getElementById('arc-' + id);
const sizes = el('size');
const language = el('language');
const play = el('play');
const board = el('board');
const svg = el('svg');
const targets = el('targets');
const ns = 'http://www.w3.org/2000/svg';
let state = makeDiagram(4);
let history = [];
let selectedPoint = null;
let selectedArc = null;
let notice = '';
let playback = null;
// A semicircle's length is proportional to the distance between its endpoints.
const msPerDiameterSpace = 120;

function svgNode(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
}

function rewind() {
    if (playback) cancelAnimationFrame(playback.frame);
    playback = null;
    if (state.path.length > 1) state = { ...state, path: [1] };
}

function clearSelection() {
    selectedPoint = null;
    selectedArc = null;
    notice = '';
}

function edit(next) {
    rewind();
    history.push(state);
    state = next;
    clearSelection();
    render();
}

function chooseArc(pair) {
    rewind();
    const previous = selectedArc;
    clearSelection();
    selectedArc = previous === pair ? null : pair;
    render();
}

function choosePoint(point) {
    const pair = state.pairs.find(ends => ends.includes(point));
    if (pair) { chooseArc(pair); return; }
    rewind();
    selectedArc = null;
    notice = '';
    if (selectedPoint === null || point === selectedPoint) {
        selectedPoint = point === selectedPoint ? null : point;
    } else {
        notice = arcError(state, selectedPoint, point) || '';
        if (!notice) { edit(addArc(state, selectedPoint, point)); return; }
    }
    render();
}

function deleteSelected() {
    if (!selectedArc) return;
    const [point] = selectedArc;
    edit(removeArc(state, selectedArc));
    targets.children[point - 1].focus({ preventScroll: true });
}

function drawBoard() {
    const width = board.clientWidth;
    if (!width) return;
    const last = state.size * 2 + 1;
    const gap = Math.min(56, (width - 40) / (last - 1));
    const origin = (width - gap * (last - 1)) / 2;
    const x = point => origin + gap * (point - 1);
    // Keep the points stationary while any of the possible semicircles is edited.
    const axis = Math.ceil(gap * (last - 2) / 2 + 22);
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + (2 * axis));
    const nodes = [svgNode('line', { x1: 8, x2: width - 8, y1: axis, y2: axis, class: 'arc-axis' })];
    function curve(a, b, lower) {
        const r = Math.abs(x(b) - x(a)) / 2;
        const sweep = (a < b) !== lower ? 1 : 0;
        return 'M ' + x(a) + ' ' + axis + ' A ' + r + ' ' + r + ' 0 0 ' + sweep + ' ' + x(b) + ' ' + axis;
    }

    const hits = [];
    for (const [i, pair] of state.pairs.entries()) {
        const [a, b] = pair;
        for (const offset of [0, 1]) {
            const d = curve(a + offset, b + offset, Boolean(offset));
            const classes = 'arc-edge' + (offset ? ' lower' : '') + (pair === selectedArc ? ' selected' : '');
            nodes.push(svgNode('path', { d, class: classes }));
            hits.push(svgNode('path', { d, class: 'arc-hit', 'data-arc': i, 'stroke-width': Math.min(22, gap * 0.68) }));
        }
    }

    for (let i = 1; i < state.path.length; i++) {
        const lower = i % 2 === 0;
        nodes.push(svgNode('path', { d: curve(state.path[i - 1], state.path[i], lower), class: 'arc-edge walked' + (lower ? ' lower' : '') }));
    }
    if (playback && !playback.reducedMotion) {
        const from = state.path.at(-1);
        const to = playback.next.path.at(-1);
        const lower = state.path.length % 2 === 0;
        const trail = svgNode('path', { d: curve(from, to, lower), pathLength: 1, class: 'arc-edge walked in-progress' + (lower ? ' lower' : '') });
        nodes.push(trail);
        const halfSpan = (x(to) - x(from)) / 2;
        const center = x(from) + halfSpan;
        const signedRadius = (lower ? 1 : -1) * Math.abs(halfSpan);
        const marker = playback.marker;
        playback.paint = fraction => {
            const angle = Math.PI * fraction;
            marker.setAttribute('cx', center - halfSpan * Math.cos(angle));
            marker.setAttribute('cy', axis + signedRadius * Math.sin(angle));
            trail.style.strokeDashoffset = String(1 - fraction);
        };
        playback.paint(playback.fraction);
    }
    const tracing = playback !== null || state.path.length > 1;
    const r = Math.min(11, gap * .38);
    for (let p = 1; p < last; p++) {
        const marked = tracing ? state.path.includes(p) : state.pairs.some(pair => pair.includes(p));
        const active = p === selectedPoint || selectedArc?.includes(p);
        const cx = x(p);
        if (active) nodes.push(svgNode('circle', { cx, cy: axis, r: r + 2.8, class: 'point-ring' }));
        nodes.push(svgNode('circle', { cx, cy: axis, r, class: 'point' + (marked ? ' marked' : active ? ' selected' : '') }));
        const label = svgNode('text', { x: cx, y: axis + 4.4, class: 'point-label' + (marked ? ' marked' : '') });
        label.textContent = p;
        nodes.push(label);
    }
    nodes.push(...hits);
    // The copy's endpoint covers the hit area of the arc beneath it.
    nodes.push(svgNode('circle', { cx: x(last), cy: axis, r, class: 'point terminal' }));
    if (playback?.marker) nodes.push(playback.marker);
    svg.replaceChildren(...nodes);

    const targetCount = last - 1;
    if (targets.childElementCount !== targetCount) {
        targets.replaceChildren();
        for (let p = 1; p <= targetCount; p++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'arc-target';
            button.dataset.point = p;
            targets.append(button);
        }
    }
    const t = words[language.value];
    for (const button of targets.children) {
        const p = Number(button.dataset.point);
        const pair = state.pairs.find(ends => ends.includes(p));
        button.style.left = x(p) + 'px';
        button.style.top = axis + 'px';
        button.style.width = Math.min(44, gap) + 'px';
        button.style.height = Math.min(44, gap * .8) + 'px';
        button.setAttribute('aria-label', t.point + ' ' + p + (pair ? ', ' + t.arc(...pair) : ''));
        button.setAttribute('aria-pressed', String(p === selectedPoint || Boolean(pair && pair === selectedArc)));
    }
}

function render() {
    const lang = language.value;
    const t = words[lang];
    const tracing = playback !== null || state.path.length > 1;
    app.lang = lang;
    for (const node of app.querySelectorAll('[data-label]')) node.textContent = t[node.dataset.label];
    const langLabel = el('language-label');
    langLabel.textContent = lang === 'en' ? '言語' : 'Language';
    langLabel.lang = lang === 'en' ? 'ja' : 'en';
    board.setAttribute('aria-label', t.board + '. ' + t.original + ' — ' + state.pairs.map(([a, b]) => a + '–' + b).join(', '));
    el('count-label').textContent = tracing ? t.visited : t.drawn;
    el('count').textContent = tracing ? state.path.length + ' / ' + (state.size * 2 + 1) : state.pairs.length + ' / ' + state.size;
    const route = el('route');
    route.hidden = !tracing;
    route.replaceChildren();
    if (tracing) {
        route.append(t.route + ' ');
        state.path.forEach((p, i) => {
            const item = document.createElement('span');
            if (i) item.className = 'arrival';
            item.textContent = p === 2 * state.size + 1 ? t.end : p;
            route.append(item);
        });
    }
    let message;
    if (notice) message = t[notice];
    else if (selectedArc) message = t.selected(...selectedArc);
    else if (selectedPoint !== null) message = t.second(selectedPoint);
    else if (finished(state)) message = t.done;
    else if (tracing) message = t.here(state.path.at(-1));
    else message = complete(state) ? t.ready : t.first;
    el('status').classList.toggle('error', Boolean(notice));
    if (el('status').textContent !== message) el('status').textContent = message;
    play.disabled = !complete(state) || playback !== null;
    el('delete').disabled = !selectedArc;
    el('undo').disabled = history.length === 0 && selectedPoint === null && !selectedArc;
    el('clear').disabled = state.pairs.length === 0;
    drawBoard();
}

function advance(now) {
    const previous = state;
    while (true) {
        const span = Math.abs(playback.next.path.at(-1) - state.path.at(-1));
        const duration = span * msPerDiameterSpace;
        const elapsed = now - playback.segmentStart;
        if (elapsed < duration) {
            playback.fraction = Math.max(0, elapsed / duration);
            break;
        }
        state = playback.next;
        if (finished(state)) {
            playback = null;
            render();
            return;
        }
        // Carry the unused part of this frame into the following semicircle.
        playback.segmentStart += duration;
        playback.next = nextStep(state);
    }
    if (state !== previous) render();
    else playback.paint?.(playback.fraction);
    playback.frame = requestAnimationFrame(advance);
}

for (let n = MIN_SIZE; n <= MAX_SIZE; n++) sizes.add(new Option(String(n), String(n)));
sizes.value = state.size;
sizes.addEventListener('change', () => {
    rewind();
    state = makeDiagram(Number(sizes.value));
    history = [];
    clearSelection();
    render();
});
language.addEventListener('change', () => render());
svg.addEventListener('click', event => {
    const hit = event.target.closest('[data-arc]');
    if (hit) {
        const pair = state.pairs[Number(hit.dataset.arc)];
        chooseArc(pair);
        targets.children[pair[0] - 1].focus({ preventScroll: true });
    }
});
targets.addEventListener('click', event => {
    const button = event.target.closest('[data-point]');
    if (button) choosePoint(Number(button.dataset.point));
});
targets.addEventListener('keydown', event => {
    const p = Number(event.target.dataset.point);
    const last = targets.childElementCount;
    const moves = { ArrowLeft: Math.max(1, p - 1), ArrowRight: Math.min(last, p + 1), Home: 1, End: last };
    if (Object.hasOwn(moves, event.key)) { event.preventDefault(); targets.children[moves[event.key] - 1].focus(); }
});
app.addEventListener('keydown', event => {
    if (event.target.closest('select')) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedArc) { event.preventDefault(); deleteSelected(); }
    } else if (event.key === 'Escape') {
        clearSelection();
        render();
    }
});
play.addEventListener('click', () => {
    if (!complete(state) || playback) return;
    rewind();
    clearSelection();
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    playback = {
        segmentStart: performance.now(), next: nextStep(state), fraction: 0,
        reducedMotion, marker: reducedMotion ? null : svgNode('circle', { r: 5.4, class: 'walk-marker' }),
    };
    render();
    playback.frame = requestAnimationFrame(advance);
});
el('delete').addEventListener('click', deleteSelected);
el('undo').addEventListener('click', () => {
    rewind();
    if (selectedPoint === null && !selectedArc && history.length) state = history.pop();
    clearSelection();
    render();
});
el('clear').addEventListener('click', () => edit(blankDiagram(state.size)));
app.hidden = false;
let lastBoardWidth = 0;
new ResizeObserver(([entry]) => {
    if (entry.contentRect.width !== lastBoardWidth) {
        lastBoardWidth = entry.contentRect.width;
        drawBoard();
    }
}).observe(board);
render();
