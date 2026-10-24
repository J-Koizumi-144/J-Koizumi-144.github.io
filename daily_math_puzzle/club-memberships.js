import { CLUBS, clubsOf, ClubGame } from './club-game.mjs';
const copy = {
    en: {
        language: '言語', instruction: 'Select 1–3 clubs, then add a student.', add: 'Add student', clear: 'Clear selection',
        undo: 'Undo', reset: 'Reset', members: 'Members in each club', shared: 'Members in common', groups: 'Students by membership',
        empty: 'No students yet.', total: n => `Students: ${n}`, distinct: n => `Distinct club sizes: ${n} / 7`,
        pairs: n => `Pairs with exactly one member in common: ${n} / 21`, complete: 'All conditions met.', pending: 'Keep editing the memberships.',
        select: s => `Club ${s}`, plus: s => `Add one student: ${s}`, minus: s => `Remove one student: ${s}`,
        pair: (a,b,n) => `${a} and ${b}: ${n} members in common`,
    },
    ja: {
        language: 'Language', instruction: 'クラブを1〜3つ選び，生徒を追加します．', add: '生徒を追加', clear: '選択解除',
        undo: '1手戻す', reset: 'リセット', members: '各クラブの部員数', shared: '共通の部員数', groups: '所属別の生徒数',
        empty: '生徒はまだいません．', total: n => `生徒の実人数：${n}`, distinct: n => `部員数の種類：${n} / 7`,
        pairs: n => `共通の部員が1人の組：${n} / 21`, complete: 'すべての条件を満たしました．', pending: '所属を編集できます．',
        select: s => `クラブ ${s}`, plus: s => `${s} に所属する生徒を1人追加`, minus: s => `${s} に所属する生徒を1人削除`,
        pair: (a,b,n) => `${a} と ${b}：共通の部員 ${n} 人`,
    },
};
const root = document.getElementById('club-game');
const language = document.getElementById('club-language');
const selection = document.getElementById('club-selection');
const groups = document.getElementById('club-groups');
const add = document.getElementById('club-add');
const game = new ClubGame();
let selected = 0;
const node = (tag, text) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; };
const name = mask => clubsOf(mask).map(i => CLUBS[i]).join('');
for (let i = 0; i < 7; i++) {
    const b = node('button', CLUBS[i]); b.type = 'button'; b.dataset.club = i; selection.append(b);
}
function render(focusId) {
    const t = copy[language.value], a = game.analysis;
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(e => { e.textContent = t[e.dataset.label]; });
    selection.querySelectorAll('button').forEach(b => {
        const chosen = !!(selected & (1 << Number(b.dataset.club)));
        b.setAttribute('aria-pressed', String(chosen));
        b.setAttribute('aria-label', t.select(b.textContent));
        b.disabled = !chosen && clubsOf(selected).length === 3;
    });
    add.disabled = selected === 0;
    document.getElementById('club-clear').disabled = selected === 0;
    const sizes = document.getElementById('club-sizes'); sizes.replaceChildren();
    for (let i = 0; i < 7; i++) {
        const entry = node('div'); entry.append(node('dt', CLUBS[i]), node('dd', a.sizes[i])); sizes.append(entry);
    }
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
    groups.replaceChildren();
    for (let mask = 1; mask < 128; mask++) {
        if (!game.counts[mask]) continue;
        const row = node('li'); row.append(node('span', `${name(mask)} × ${game.counts[mask]}`));
        for (const delta of [-1, 1]) {
            const b = node('button', delta === 1 ? '+' : '−'); b.type = 'button';
            b.dataset.mask = mask; b.dataset.delta = delta; b.id = `membership-${mask}-${delta}`;
            b.setAttribute('aria-label', t[delta === 1 ? 'plus' : 'minus'](name(mask))); row.append(b);
        }
        groups.append(row);
    }
    document.getElementById('club-empty').hidden = a.total !== 0;
    document.getElementById('club-total').textContent = t.total(a.total);
    document.getElementById('club-distinct').textContent = t.distinct(a.distinct);
    document.getElementById('club-exact-pairs').textContent = t.pairs(a.exactPairs);
    const message = document.getElementById('club-message');
    message.textContent = a.complete ? t.complete : t.pending;
    message.dataset.state = a.complete ? 'complete' : '';
    document.getElementById('club-undo').disabled = game.history.length === 0;
    document.getElementById('club-reset').disabled = a.total === 0 && selected === 0 && game.history.length === 0;
    if (focusId) (document.getElementById(focusId) || (add.disabled ? selection.querySelector("button") : add)).focus({ preventScroll: true });
}
selection.addEventListener('click', event => {
    const b = event.target.closest('button[data-club]'); if (!b) return;
    selected ^= 1 << Number(b.dataset.club); render();
});
selection.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...selection.querySelectorAll('button:not(:disabled)')];
    const current = buttons.indexOf(event.target); if (current < 0) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)));
    buttons[index].focus();
});
add.addEventListener('click', () => { if (game.change(selected, 1)) render(); });
document.getElementById('club-clear').addEventListener('click', () => { selected = 0; render(); });
groups.addEventListener('click', event => {
    const b = event.target.closest('button[data-mask]'); if (!b) return;
    if (game.change(Number(b.dataset.mask), Number(b.dataset.delta))) render(b.id);
});
document.getElementById('club-undo').addEventListener('click', () => { game.undo(); render(); });
document.getElementById('club-reset').addEventListener('click', () => { game.reset(); selected = 0; render(); });
language.addEventListener('change', () => render());
render(); root.hidden = false;
