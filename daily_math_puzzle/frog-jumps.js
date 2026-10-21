import { FrogGame } from './frog-game.mjs';

const copy = {
    en: {
        language: '言語', visited: 'Stones visited', jumps: 'Jumps', short: 'Length 2', long: 'Length 3',
        undo: 'Undo', reset: 'Reset', choose: 'Choose a starting stone.', next: 'Choose the next stone.',
        complete: 'Tour complete.', blocked: 'No legal jump. Undo to try another route.',
        legend: '★ start · ● current · ✓ visited', route: 'Route', empty: '—',
        board: size => `${size} stones in a straight line`, stone: n => `Stone ${n}`,
        start: 'start', current: 'current', seen: 'visited', available: 'available', unavailable: 'unavailable',
        early: 'Visit every stone before returning to the start.', distance: 'Choose a stone 2 or 3 units away.',
        used: 'That stone has already been visited.', outside: 'Choose a stone on the board.',
    },
    ja: {
        language: 'Language', visited: '訪問した石', jumps: '跳躍回数', short: '距離 2', long: '距離 3',
        undo: '1手戻す', reset: 'リセット', choose: '出発する石を押してください．', next: '次に跳ぶ石を押してください．',
        complete: 'すべての石を巡って戻りました．', blocked: '跳べる石がありません．1手戻して試せます．',
        legend: '★ 出発点 · ● 現在地 · ✓ 訪問済み', route: '経路', empty: '—',
        board: size => `一直線上の${size}個の石`, stone: n => `石${n}`,
        start: '出発点', current: '現在地', seen: '訪問済み', available: '選択可能', unavailable: '選択不可',
        early: 'すべての石を訪問してから出発点へ戻れます．', distance: '距離2または3の石を選んでください．',
        used: 'その石は訪問済みです．', outside: '盤面上の石を選んでください．',
    },
};
const root = document.getElementById('frog-game');
const board = document.getElementById('frog-board');
const language = document.getElementById('frog-language');
const size = document.getElementById('frog-size');
const message = document.getElementById('frog-message');
const undo = document.getElementById('frog-undo');
let game = new FrogGame(Number(size.value));
let active = 1;
let buttons = [];
let lastReason = '';

function buildBoard() {
    board.replaceChildren();
    board.style.width = `${game.size * 60}px`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('frog-arcs');
    svg.setAttribute('aria-hidden', 'true');
    board.append(svg);
    buttons = Array.from({length: game.size}, (_, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'stone';
        button.dataset.stone = i + 1;
        button.style.left = `${i * 60 + 6}px`;
        button.append(document.createTextNode(String(i + 1)), document.createElement('span'));
        board.append(button);
        return button;
    });
}

function render() {
    const t = copy[language.value];
    const a = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    board.setAttribute('aria-label', t.board(game.size));
    document.getElementById('frog-visited').textContent = `${a.visited} / ${game.size}`;
    for (const key of ['jumps', 'short', 'long']) document.getElementById(`frog-${key}`).textContent = a[key];
    undo.disabled = !game.path.length;
    buttons.forEach((button, i) => {
        const stone = i + 1;
        const current = stone === game.path.at(-1);
        const start = stone === game.path[0];
        const visited = game.path.includes(stone);
        const legal = !game.reason(stone);
        button.tabIndex = stone === active ? 0 : -1;
        button.setAttribute('aria-pressed', String(current));
        button.setAttribute('aria-disabled', String(!legal));
        button.dataset.visited = visited;
        button.querySelector('span').textContent = (start ? '★' : '') + (current ? '●' : visited ? '✓' : '');
        button.setAttribute('aria-label', [t.stone(stone), start ? t.start : '', current ? t.current : visited ? t.seen : '', legal ? t.available : t.unavailable].filter(Boolean).join(', '));
    });
    const svg = board.querySelector('svg');
    svg.replaceChildren();
    for (let i = 1; i < game.path.length; i++) {
        const from = game.path[i - 1], to = game.path[i];
        const distance = Math.abs(to - from);
        const x1 = (from - 1) * 60 + 30, x2 = (to - 1) * 60 + 30;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const y = distance === 2 ? 69 : 123;
        const control = distance === 2 ? 1 : 187;
        path.setAttribute('d', `M ${x1} ${y} Q ${(x1 + x2) / 2} ${control} ${x2} ${y}`);
        path.dataset.distance = distance;
        svg.append(path);
    }
    const state = a.complete ? 'complete' : a.blocked ? 'blocked' : '';
    message.dataset.state = state;
    message.textContent = lastReason ? t[lastReason === 'visited' ? 'used' : lastReason]
        : t[state || (game.path.length ? 'next' : 'choose')];
    document.getElementById('frog-route').textContent = `${t.route}: ${game.path.length ? game.path.join(' → ') : t.empty}`;
}
board.addEventListener('click', event => {
    const button = event.target.closest('button[data-stone]');
    if (!button) return;
    active = Number(button.dataset.stone);
    lastReason = game.reason(active);
    if (!lastReason) game.jump(active);
    render();
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-stone]');
    if (!button) return;
    const i = Number(button.dataset.stone);
    let next;
    if (event.key === 'ArrowLeft') next = Math.max(1, i - 1);
    else if (event.key === 'ArrowRight') next = Math.min(game.size, i + 1);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = game.size;
    else return;
    event.preventDefault();
    active = next;
    button.tabIndex = -1;
    buttons[next - 1].tabIndex = 0;
    buttons[next - 1].focus();
});
undo.addEventListener('click', () => { game.undo(); lastReason = ''; render(); });
function reset() {
    game = new FrogGame(Number(size.value)); active = 1; lastReason = '';
    buildBoard(); render();
    root.querySelector('.frog-scroll').scrollLeft = 0;
}
document.getElementById('frog-reset').addEventListener('click', reset);
size.addEventListener('change', reset);
language.addEventListener('change', render);
buildBoard(); render(); root.hidden = false;
