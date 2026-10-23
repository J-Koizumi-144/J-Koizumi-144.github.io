import { TournamentGame } from './tournament-game.mjs';

const copy = {
    en: {
        language: '言語', teams: 'Teams', undo: 'Undo', reset: 'Reset',
        instruction: 'Click a cell to cycle the row team’s result: draw → win → loss.',
        others: 'Other teams: matches and scores', team: 'Team', wins: 'W', draws: 'D', losses: 'L',
        two: '2-point wins', three: '3-point wins', focus: 'A, B, C: results',
        rest: 'Other matches', standings: 'Scores', opponent: 'vs',
        result: { '0': 'D', '1': 'W', '-1': 'L' },
        fullResult: { '0': 'draw', '1': 'win', '-1': 'loss' },
        cell: (a, b, result) => `${a} vs ${b}: ${result}`,
        done: 'Both orders achieved.', pending: 'Keep editing the results.',
        met: '✓', unmet: '…', self: 'No match',
    },
    ja: {
        language: 'Language', teams: 'チーム数', undo: '1手戻す', reset: 'リセット',
        instruction: 'マスを押すと，行のチームの結果が引き分け→勝ち→負けと切り替わります．',
        others: 'ほかのチームの対戦と成績', team: 'チーム', wins: '勝', draws: '分', losses: '負',
        two: '勝ち2点', three: '勝ち3点', focus: 'A・B・Cの対戦',
        rest: 'ほかのチーム同士の対戦', standings: '成績', opponent: '対',
        result: { '0': '分', '1': '勝', '-1': '負' },
        fullResult: { '0': '引き分け', '1': '勝ち', '-1': '負け' },
        cell: (a, b, result) => `${a} 対 ${b}：${result}`,
        done: '両方の順位を満たしました．', pending: '対戦結果を編集できます．',
        met: '✓', unmet: '…', self: '対戦なし',
    },
};
const root = document.getElementById('tournament-game');
const language = document.getElementById('tournament-language');
const size = document.getElementById('tournament-size');
const focused = document.getElementById('tournament-focus');
const otherMatches = document.getElementById('tournament-others');
const details = document.getElementById('tournament-details');
const undo = document.getElementById('tournament-undo');
let game = new TournamentGame(Number(size.value));
const activeCells = { focus: [0, 1], others: [3, 4] };
const name = i => i < 3 ? 'ABC'[i] : `D${i - 2}`;
const node = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
};

function resultTable(container, rows, columns, key, t) {
    const table = node('table');
    table.className = 'tournament-matrix';
    table.append(node('caption', t[key === 'focus' ? 'focus' : 'rest']));
    const head = node('tr');
    head.append(node('th', t.opponent));
    columns.forEach(i => {
        const th = node('th', name(i)); th.scope = 'col'; head.append(th);
    });
    const thead = node('thead'); thead.append(head); table.append(thead);
    const body = node('tbody');
    rows.forEach(row => {
        const tr = node('tr');
        const th = node('th', name(row)); th.scope = 'row'; tr.append(th);
        columns.forEach(column => {
            const td = node('td');
            if (row === column) {
                td.textContent = '—'; td.setAttribute('aria-label', t.self);
            } else {
                const result = game.results[row][column];
                const button = node('button', t.result[result]);
                button.type = 'button';
                button.dataset.row = row; button.dataset.column = column;
                button.dataset.matrix = key; button.dataset.result = result;
                button.setAttribute('aria-label', t.cell(name(row), name(column), t.fullResult[result]));
                button.tabIndex = activeCells[key][0] === row && activeCells[key][1] === column ? 0 : -1;
                td.append(button);
            }
            tr.append(td);
        });
        body.append(tr);
    });
    table.append(body); container.replaceChildren(table);
}

function scores(container, indices, teams, t) {
    const table = node('table'); table.className = 'tournament-scores';
    table.append(node('caption', t.standings));
    const tr = node('tr');
    ['team', 'wins', 'draws', 'losses', 'two', 'three'].forEach(key => {
        const th = node('th', t[key]); th.scope = 'col'; tr.append(th);
    });
    const thead = node('thead'); thead.append(tr); table.append(thead);
    const tbody = node('tbody');
    indices.forEach(i => {
        const row = node('tr'); const th = node('th', name(i)); th.scope = 'row'; row.append(th);
        ['wins', 'draws', 'losses', 'two', 'three'].forEach(key => row.append(node('td', teams[i][key])));
        tbody.append(row);
    });
    table.append(tbody); container.replaceChildren(table);
}

function order(teams, key) {
    const indices = [0, 1, 2].sort((a, b) => teams[b][key] - teams[a][key] || a - b);
    return indices.map((i, k) => (k ? (teams[indices[k - 1]][key] === teams[i][key] ? ' = ' : ' > ') : '') + name(i)).join('');
}

function render(focusCell) {
    const t = copy[language.value]; const state = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(e => { e.textContent = t[e.dataset.label]; });
    const all = Array.from({ length: game.size }, (_, i) => i);
    resultTable(focused, [0, 1, 2], all, 'focus', t);
    resultTable(otherMatches, all.slice(3), all.slice(3), 'others', t);
    scores(document.getElementById('tournament-scores'), [0, 1, 2], state.teams, t);
    scores(document.getElementById('tournament-other-scores'), all.slice(3), state.teams, t);
    details.hidden = game.size === 3;
    otherMatches.hidden = game.size < 5;
    document.getElementById('tournament-order-two').textContent = `${t.two}: ${order(state.teams, 'two')} ${state.twoMet ? t.met : t.unmet}`;
    document.getElementById('tournament-order-three').textContent = `${t.three}: ${order(state.teams, 'three')} ${state.threeMet ? t.met : t.unmet}`;
    const message = document.getElementById('tournament-message');
    message.textContent = state.complete ? t.done : t.pending;
    message.dataset.state = state.complete ? 'complete' : '';
    undo.disabled = game.history.length === 0;
    if (focusCell) root.querySelector(`button[data-matrix="${focusCell.key}"][data-row="${focusCell.row}"][data-column="${focusCell.column}"]`).focus({ preventScroll: true });
}

root.addEventListener('click', event => {
    const button = event.target.closest('button[data-row]');
    if (!button) return;
    const row = Number(button.dataset.row), column = Number(button.dataset.column), key = button.dataset.matrix;
    activeCells[key] = [row, column];
    game.cycle(row, column); render({ row, column, key });
});
root.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-row]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const key = button.dataset.matrix;
    const minimum = key === 'focus' ? 0 : 3;
    const maxRow = key === 'focus' ? 2 : game.size - 1;
    let row = Number(button.dataset.row), column = Number(button.dataset.column);
    if (event.key === 'Home') column = minimum;
    else if (event.key === 'End') column = game.size - 1;
    else {
        const dr = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        const dc = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        do { row += dr; column += dc; } while (row === column);
    }
    if (row === column) column += event.key === 'End' ? -1 : 1;
    if (row < minimum || row > maxRow || column < minimum || column >= game.size) return;
    activeCells[key] = [row, column];
    root.querySelectorAll(`button[data-matrix="${key}"]`).forEach(e => { e.tabIndex = -1; });
    const target = root.querySelector(`button[data-matrix="${key}"][data-row="${row}"][data-column="${column}"]`);
    target.tabIndex = 0; target.focus();
});
undo.addEventListener('click', () => { game.undo(); render(); });
document.getElementById('tournament-reset').addEventListener('click', () => { game.reset(); render(); });
size.addEventListener('change', () => {
    game = new TournamentGame(Number(size.value));
    activeCells.focus = [0, 1]; activeCells.others = [3, 4]; details.open = false; render();
});
language.addEventListener('change', () => render());
render(); root.hidden = false;
