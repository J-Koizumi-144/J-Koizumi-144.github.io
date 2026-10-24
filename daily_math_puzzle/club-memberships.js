import { CLUBS, INITIAL_ROWS, MAX_ROWS, ClubGame } from './club-game.mjs?v=20261024-table';
const copy = {
    en: {
        language: '言語', instruction: 'Click a cell to mark membership. Blank rows are not counted as students.',
        add: 'Add row', undo: 'Undo', reset: 'Reset', membership: 'Club membership', student: 'Student', remove: 'Delete', members: 'Members',
        shared: 'Members in common', empty: 'Add a row to start.', total: n => `Students: ${n}`, blank: n => `Blank rows: ${n}`,
        distinct: n => `Distinct club sizes: ${n} / 7`, pairs: n => `Pairs with exactly one member in common: ${n} / 21`,
        complete: 'All conditions met.', pending: 'Each row can have up to three marks.', limit: `Up to ${MAX_ROWS} rows.`,
        cell: (row, club, selected) => `Student ${row}, club ${club}: ${selected ? 'member' : 'not a member'}`,
        deleteRow: row => `Delete student ${row}`, pair: (a,b,n) => `${a} and ${b}: ${n} members in common`,
    },
    ja: {
        language: 'Language', instruction: 'マスを押して所属を切り替えます．空欄の行は人数に含めません．',
        add: '行を追加', undo: '1手戻す', reset: 'リセット', membership: 'クラブへの所属', student: '生徒', remove: '削除', members: '部員数',
        shared: '共通の部員数', empty: '行を追加してください．', total: n => `生徒の実人数：${n}`, blank: n => `空欄の行：${n}`,
        distinct: n => `部員数の種類：${n} / 7`, pairs: n => `共通の部員が1人の組：${n} / 21`,
        complete: 'すべての条件を満たしました．', pending: '各行は3クラブまで選べます．', limit: `${MAX_ROWS}行まで追加できます．`,
        cell: (row, club, selected) => `生徒${row}，クラブ${club}：${selected ? '所属' : '未所属'}`,
        deleteRow: row => `生徒${row}の行を削除`, pair: (a,b,n) => `${a} と ${b}：共通の部員 ${n} 人`,
    },
};
const root = document.getElementById('club-game');
const language = document.getElementById('club-language');
const board = document.getElementById('club-memberships');
const add = document.getElementById('club-add');
const game = new ClubGame();
let activeCell = { row: 0, club: 0 };
const node = (tag, text) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
function cellButton(row, club) { return board.querySelector(`button[data-row="${row}"][data-club="${club}"]`); }
function renderMemberships(a, t) {
    const table = node('table'); table.className = 'membership-table';
    const caption = node('caption', t.membership); table.append(caption);
    const head = node('tr');
    for (const label of [t.student, ...CLUBS, t.remove]) { const th = node('th', label); th.scope = 'col'; head.append(th); }
    const thead = node('thead'); thead.append(head); table.append(thead);
    const tbody = node('tbody');
    game.rows.forEach((mask, row) => {
        const tr = node('tr'), th = node('th', row + 1); th.scope = 'row'; tr.append(th);
        for (let club = 0; club < 7; club++) {
            const selected = !!(mask & (1 << club));
            const td = node('td'), b = node('button', selected ? '●' : '·'); b.type = 'button';
            b.dataset.row = row; b.dataset.club = club;
            b.setAttribute('aria-pressed', String(selected)); b.setAttribute('aria-label', t.cell(row + 1, CLUBS[club], selected));
            b.disabled = !game.canToggle(row, club);
            b.tabIndex = activeCell.row === row && activeCell.club === club ? 0 : -1;
            td.append(b); tr.append(td);
        }
        const td = node('td'), remove = node('button', '×'); remove.type = 'button';
        remove.className = 'delete-student'; remove.dataset.remove = row;
        remove.setAttribute('aria-label', t.deleteRow(row + 1)); td.append(remove); tr.append(td);
        tbody.append(tr);
    });
    table.append(tbody);
    const foot = node('tr'), th = node('th', t.members); th.scope = 'row'; foot.append(th);
    a.sizes.forEach(size => foot.append(node('td', size))); foot.append(node('td'));
    const tfoot = node('tfoot'); tfoot.append(foot); table.append(tfoot);
    board.replaceChildren(table);
    document.getElementById('club-empty').hidden = game.rows.length !== 0;
}
function renderPairs(a, t) {
    const table = node('table'); table.append(node('caption', t.shared));
    const head = node('tr'); head.append(node('th', ''));
    for (const c of CLUBS) { const th = node('th', c); th.scope = 'col'; head.append(th); }
    const thead = node('thead'); thead.append(head); table.append(thead);
    const tbody = node('tbody');
    for (let i = 0; i < 7; i++) {
        const row = node('tr'), th = node('th', CLUBS[i]); th.scope = 'row'; row.append(th);
        for (let j = 0; j < 7; j++) {
            const td = node('td', j <= i ? '·' : a.pairs[i][j]);
            if (j > i) { td.dataset.count = a.pairs[i][j]; td.setAttribute('aria-label', t.pair(CLUBS[i], CLUBS[j], a.pairs[i][j])); }
            row.append(td);
        }
        tbody.append(row);
    }
    table.append(tbody); document.getElementById('club-pairs').replaceChildren(table);
}
function render(focus) {
    const t = copy[language.value], a = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(e => { e.textContent = t[e.dataset.label]; });
    if (game.rows.length) {
        activeCell.row = Math.min(activeCell.row, game.rows.length - 1);
        if (!game.canToggle(activeCell.row, activeCell.club)) activeCell.club = Array.from({length: 7}, (_, i) => i).find(i => game.canToggle(activeCell.row, i));
    }
    renderMemberships(a, t); renderPairs(a, t);
    document.getElementById('club-total').textContent = t.total(a.total);
    document.getElementById('club-blank').textContent = t.blank(a.empty);
    document.getElementById('club-distinct').textContent = t.distinct(a.distinct);
    document.getElementById('club-exact-pairs').textContent = t.pairs(a.exactPairs);
    const message = document.getElementById('club-message');
    message.textContent = a.complete ? t.complete : t.pending;
    message.dataset.state = a.complete ? 'complete' : '';
    add.disabled = game.rows.length >= MAX_ROWS;
    const limit = document.getElementById('club-limit'); limit.textContent = add.disabled ? t.limit : ''; limit.hidden = !add.disabled;
    document.getElementById('club-undo').disabled = game.history.length === 0;
    document.getElementById('club-reset').disabled = game.rows.length === INITIAL_ROWS && game.rows.every(mask => mask === 0) && game.history.length === 0;
    if (focus) {
        const target = focus === 'delete' ? board.querySelector(`button[data-remove="${activeCell.row}"]`) : cellButton(activeCell.row, activeCell.club);
        (target || add).focus({ preventScroll: true });
        if (target) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}
board.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.club !== undefined) {
        const row = Number(button.dataset.row), club = Number(button.dataset.club);
        if (game.toggle(row, club)) { activeCell = { row, club }; render('cell'); }
    } else if (button.dataset.remove !== undefined) {
        const row = Number(button.dataset.remove);
        if (game.remove(row)) { activeCell = { row: Math.max(0, Math.min(row, game.rows.length - 1)), club: 0 }; render('delete'); }
    }
});
board.addEventListener('keydown', event => {
    const button = event.target.closest('button[data-club]');
    if (!button || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    let row = Number(button.dataset.row), club = Number(button.dataset.club);
    const dr = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const dc = event.key === 'ArrowLeft' || event.key === 'End' ? -1 : 1;
    if (event.key === 'Home' || event.key === 'End') club = event.key === 'Home' ? 0 : 6;
    else { row += dr; if (!dr) club += dc; }
    while (row >= 0 && row < game.rows.length && club >= 0 && club < 7) {
        if (game.canToggle(row, club)) {
            board.querySelectorAll('button[data-club]').forEach(e => { e.tabIndex = -1; });
            activeCell = { row, club }; const target = cellButton(row, club); target.tabIndex = 0; target.focus(); return;
        }
        if (dr) row += dr; else club += dc;
    }
});
add.addEventListener('click', () => {
    if (game.add()) { activeCell = { row: game.rows.length - 1, club: 0 }; render('cell'); }
});
document.getElementById('club-undo').addEventListener('click', () => {
    const action = game.history[game.history.length - 1];
    if (game.undo()) { activeCell = { row: Math.max(0, Math.min(action.row, game.rows.length - 1)), club: action.club ?? 0 }; render('cell'); }
});
document.getElementById('club-reset').addEventListener('click', () => { game.reset(); activeCell = { row: 0, club: 0 }; render('cell'); board.scrollTo({ top: 0, left: 0 }); });
language.addEventListener('change', () => render());
render(); root.hidden = false;
