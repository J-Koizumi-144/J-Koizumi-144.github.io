import { COUNTS, DEFAULT_COUNT, runsOf, randomRow, createState, copyState, advance } from './integer-runs-game.mjs';

const root = document.getElementById('integer-game');
const row = root.querySelector('#integer-row');
const countSelect = root.querySelector('#integer-count');
const languageSelect = root.querySelector('#integer-language');
const autoButton = root.querySelector('#integer-auto');
const undoButton = root.querySelector('#integer-undo');
const resetButton = root.querySelector('#integer-reset');
const randomButton = root.querySelector('#integer-random');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const colors = ['#0072b2', '#e87500'];
const words = {
    en: {
        count: 'Numbers', language: '言語', instruction: 'Press the highlighted round button.',
        auto: 'Run one round', stop: 'Stop', random: 'New random row', undo: 'Undo', reset: 'Reset',
        rounds: 'Rounds completed', next: (i, n) => `Next: ${i} of ${n}`,
        moving: (i, n) => `Updating ${i} of ${n}`, lengths: n => `Run lengths · round ${n}`,
        ordered: 'In order this round', unordered: 'Not yet in order',
        rewrite: (i, v) => `Rewrite number ${i}, current value ${v}`,
        row: 'Integer sequence, read from left to right', value: (i, v) => `Number ${i}: ${v}`,
        changed: (i, oldValue, value) => `Number ${i}: ${oldValue} becomes ${value}.`,
        roundDone: n => `Round ${n} finished.`, newRow: 'A new random row is ready.',
        resetDone: 'Returned to the initial row.', undoDone: 'Last rewrite undone.',
        error: 'This value is too large. Start a new row.',
    },
    ja: {
        count: '数の個数', language: 'Language', instruction: '色のついた丸いボタンを押してください．',
        auto: '一巡する', stop: '停止', random: '新しいランダム列', undo: '1手戻す', reset: 'リセット',
        rounds: '終えた回数', next: (i, n) => `次：${i} / ${n} 個目`,
        moving: (i, n) => `${i} / ${n} 個目を書き換え中`, lengths: n => `かたまりの長さ · ${n} 回後`,
        ordered: 'この回は短い順', unordered: 'まだ短い順ではありません',
        rewrite: (i, v) => `${i} 個目を書き換える，現在の数 ${v}`,
        row: '左から順に読む整数列', value: (i, v) => `${i} 個目：${v}`,
        changed: (i, oldValue, value) => `${i} 個目を ${oldValue} から ${value} に書き換えました．`,
        roundDone: n => `${n} 回目が終わりました．`, newRow: '新しいランダム列にしました．',
        resetDone: '最初の列に戻しました．', undoDone: '最後の書き換えを戻しました．',
        error: '数が大きすぎます．新しい列で始めてください．',
    },
};

let language = 'en';
let state = createState(randomRow(DEFAULT_COUNT));
let history = [];
let automatic = false;
let spinning = false;
let epoch = 0;
let autoEpoch = 0;
let animation = null;
let cells = [];
let announcement = null;
const text = () => words[language];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

for (const count of COUNTS) countSelect.add(new Option(String(count), String(count), false, count === DEFAULT_COUNT));

function buildRow() {
    row.replaceChildren();
    row.style.setProperty('--count', state.values.length);
    cells = state.values.map((_, index) => {
        const cell = document.createElement('li');
        cell.className = 'number-cell';
        cell.dataset.index = index;
        const slot = document.createElement('div');
        slot.className = 'slot';
        const reel = document.createElement('div');
        reel.className = 'reel';
        reel.setAttribute('aria-hidden', 'true');
        const readable = document.createElement('span');
        readable.className = 'sr-only';
        slot.append(reel, readable);
        const mark = document.createElement('div');
        mark.className = 'run-mark';
        mark.setAttribute('aria-hidden', 'true');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'number-button';
        button.dataset.index = index;
        const symbol = document.createElement('span');
        symbol.setAttribute('aria-hidden', 'true');
        button.append(symbol);
        button.addEventListener('click', async () => {
            if (automatic || spinning || index !== state.next) return;
            const focused = document.activeElement === button;
            const token = epoch;
            await performMove();
            if (token === epoch && focused && (document.activeElement === button || document.activeElement === document.body)) {
                cells[state.next].button.focus({ preventScroll: true });
            }
        });
        cell.append(slot, mark, button);
        row.append(cell);
        return { cell, slot, reel, readable, button, symbol };
    });
}

function setReel(reel, values) {
    reel.replaceChildren(...values.map(value => {
        const span = document.createElement('span');
        span.textContent = value;
        return span;
    }));
}

function fitRow() {
    const settled = state.next === 0 && !spinning;
    const sameRunInRow = (left, right) => left >= 0 && right < cells.length
        && state.values[right] === state.values[left] + 1
        && cells[left].cell.offsetTop === cells[right].cell.offsetTop;
    for (const [index, { cell, slot }] of cells.entries()) {
        const value = state.values[index];
        const digits = Math.max(String(value).length, String(value + state.values.length).length);
        slot.style.fontSize = `${Math.min(32, (slot.clientWidth - 6) / (0.62 * digits))}px`;
        cell.classList.toggle('joins-previous', settled && sameRunInRow(index - 1, index));
        cell.classList.toggle('joins-next', settled && sameRunInRow(index, index + 1));
    }
}

function render() {
    const w = text();
    root.lang = language;
    root.dataset.rounds = state.rounds;
    root.dataset.next = state.next;
    root.dataset.busy = String(spinning);
    root.dataset.automatic = String(automatic);
    root.querySelectorAll('[data-copy]').forEach(el => { el.textContent = w[el.dataset.copy]; });
    root.querySelector('#integer-language-label').lang = language === 'en' ? 'ja' : 'en';
    root.querySelector('#integer-rounds').textContent = state.rounds;
    root.querySelector('#integer-progress').textContent = (spinning ? w.moving : w.next)(state.next + 1, state.values.length);
    row.setAttribute('aria-label', w.row);
    const memberships = [];
    runsOf(state.lastRound).forEach((run, index) => run.forEach(position => { memberships[position] = index; }));
    cells.forEach(({ cell, reel, readable, button, symbol }, i) => {
        const active = i === state.next;
        cell.classList.toggle('is-next', active);
        cell.classList.toggle('is-spinning', spinning && active);
        cell.classList.toggle('is-done', i < state.next);
        cell.classList.toggle('is-in-progress', state.next !== 0 || spinning);
        cell.style.setProperty('--run-color', colors[memberships[i] % colors.length]);
        cell.dataset.value = state.values[i];
        if (!(spinning && active)) setReel(reel, [state.values[i]]);
        readable.textContent = w.value(i + 1, state.values[i]);
        button.disabled = spinning || automatic || !active;
        button.setAttribute('aria-label', w.rewrite(i + 1, state.values[i]));
        if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
        symbol.textContent = i < state.next ? '✓' : '+';
    });
    autoButton.textContent = automatic ? w.stop : w.auto;
    autoButton.disabled = spinning && !automatic;
    autoButton.setAttribute('aria-pressed', String(automatic));
    undoButton.disabled = !history.length || spinning || automatic;
    resetButton.disabled = !spinning && !automatic && !history.length;
    const lengths = runsOf(state.lastRound).map(run => run.length);
    root.querySelector('#integer-run-label').textContent = w.lengths(state.rounds);
    root.querySelector('#integer-lengths').replaceChildren(...lengths.map((length, index) => {
        const chip = document.createElement('span');
        chip.className = 'run-chip';
        chip.style.setProperty('--run-color', colors[index % colors.length]);
        chip.textContent = length;
        return chip;
    }));
    const ordered = lengths.every((length, i) => !i || lengths[i - 1] <= length);
    const order = root.querySelector('#integer-order');
    order.textContent = ordered ? w.ordered : w.unordered;
    order.dataset.ordered = String(ordered);
    if (announcement) root.querySelector('#integer-announcement').textContent = announcement(w);
    fitRow();
}

async function performMove() {
    if (spinning) return false;
    const token = epoch;
    const index = state.next;
    const before = copyState(state);
    let after;
    try { after = advance(state); } catch {
        automatic = false;
        announcement = w => w.error;
        render();
        return false;
    }
    const from = state.values[index];
    const to = after.values[index];
    const { reel } = cells[index];
    spinning = true;
    setReel(reel, Array.from({ length: to - from + 1 }, (_, i) => from + i));
    render();
    const duration = reducedMotion.matches ? 0 : Math.min(350, 145 + (to - from) * 18);
    animation = reel.animate([
        { transform: 'translateY(0)' },
        { transform: `translateY(-${(to - from) * 60}px)` },
    ], { duration, easing: 'cubic-bezier(.2,.55,.25,1)', fill: 'forwards' });
    try { await animation.finished; } catch { return false; }
    if (token !== epoch) return false;
    animation.cancel();
    animation = null;
    history.push(before);
    state = after;
    spinning = false;
    announcement = w => w.changed(index + 1, from, to) + (state.next === 0 ? ' ' + w.roundDone(state.rounds) : '');
    render();
    return true;
}

function cancelPlayback() {
    epoch++;
    autoEpoch++;
    automatic = false;
    spinning = false;
    animation?.cancel();
    animation = null;
}

function startRow(values, newRandom = false) {
    cancelPlayback();
    state = createState(values);
    history = [];
    announcement = w => newRandom ? w.newRow : w.resetDone;
    if (cells.length !== values.length) buildRow();
    render();
}

autoButton.addEventListener('click', async () => {
    if (automatic) { automatic = false; autoEpoch++; render(); return; }
    if (spinning) return;
    const token = epoch;
    const playback = ++autoEpoch;
    const targetRound = state.rounds + 1;
    automatic = true;
    render();
    while (automatic && token === epoch && playback === autoEpoch && state.rounds < targetRound) {
        if (!await performMove()) break;
        if (state.rounds < targetRound) await wait(reducedMotion.matches ? 25 : 55);
    }
    if (token === epoch && playback === autoEpoch) { automatic = false; render(); }
});

undoButton.addEventListener('click', () => {
    if (spinning || automatic || !history.length) return;
    state = history.pop();
    announcement = w => w.undoDone;
    render();
});
resetButton.addEventListener('click', () => startRow(state.initial));
randomButton.addEventListener('click', () => startRow(randomRow(state.values.length, Math.random, state.initial), true));
countSelect.addEventListener('change', () => startRow(randomRow(Number(countSelect.value)), true));
languageSelect.addEventListener('change', () => { language = languageSelect.value; render(); });

buildRow();
root.hidden = false;
render();
new ResizeObserver(fitRow).observe(row);
