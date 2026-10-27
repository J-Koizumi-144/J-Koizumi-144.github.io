import { PEOPLE, neighbors, initialState, isFriend, toggleFriend, undo, inspect } from './friendship-game.mjs';
const root = document.getElementById('circular-friends');
const $ = name => root.querySelector(`#friends-${name}`);
let state = initialState();
let selected = [];
let lastAction = null;
let language = 'en';
const labels = {
    en: { language: '言語', guide: 'Select two people to toggle their friendship.', pairs: 'Pairs of friends', odd: 'Odd friend counts', triples: 'Triples with no friends', undo: 'Undo', reset: 'Reset', added: 'Friendship added', removed: 'Friendship removed', choose: 'Select two people.', fixed: 'Neighbors are always friends.', picked: 'Selected', legend: 'Each seat shows its number and friend count. Solid lines: neighbors; dashed lines: added friendships.', show: 'Show unmet conditions', complete: 'All conditions satisfied.', incomplete: 'Some conditions are not yet satisfied.', even: 'People with an even friend count', example: 'A triple with no friends', none: 'None', person: 'Person', friends: 'friends', table: 'Circular table, 14 people', clear: 'Clear selection' },
    ja: { language: 'Language', guide: '2人を選ぶと，その2人の友人関係が切り替わります．', pairs: '友人同士の組数', odd: '友人数が奇数の人', triples: '友人の組がない3人組', undo: '1手戻す', reset: 'リセット', added: '友人関係を追加しました', removed: '友人関係を削除しました', choose: '2人を選んでください．', fixed: '隣同士の友人関係は固定です．', picked: '選択中', legend: '各席に番号と友人数を表示．実線：隣同士，破線：追加した友人関係．', show: '満たしていない条件を表示', complete: 'すべての条件を満たしています．', incomplete: 'まだ満たしていない条件があります．', even: '友人数が偶数の人', example: '友人の組がない3人組の例', none: 'なし', person: '番号', friends: '友人', table: '14人の円卓', clear: '選択を解除' }
};
const positions = Array.from({ length: PEOPLE }, (_, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / PEOPLE;
    return [230 + 190 * Math.cos(angle), 230 + 190 * Math.sin(angle)];
});
const buttons = positions.map(([x, y], i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'friend-person'; button.dataset.person = i;
    button.style.left = `${x}px`; button.style.top = `${y}px`;
    button.addEventListener('click', () => {
        lastAction = null;
        if (selected.includes(i)) selected = [];
        else if (selected.length === 0) selected = [i];
        else {
            const pair = [selected[0], i];
            const next = toggleFriend(state, ...pair);
            lastAction = { pair, kind: next === state ? 'fixed' : (isFriend(next, ...pair) ? 'added' : 'removed') };
            state = next;
            selected = [];
        }
        render();
    });
    button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (i + 1) % PEOPLE;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (i + PEOPLE - 1) % PEOPLE;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = PEOPLE - 1;
        if (next !== undefined) { event.preventDefault(); buttons[next].focus(); }
    });
    $('board').append(button);
    return button;
});
function render() {
    const t = labels[language], result = inspect(state);
    root.lang = language;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    $('board').setAttribute('aria-label', t.table);
    $('pairs').textContent = result.pairs;
    $('odd').textContent = `${result.odd} / ${PEOPLE}`;
    $('triples').textContent = result.emptyTriples.length;
    const show = $('show').checked;
    buttons.forEach((button, i) => {
        button.innerHTML = `<span>${i + 1}</span><small>${language === 'ja' ? '友' : 'F'} ${result.degrees[i]}</small>`;
        button.setAttribute('aria-label', language === 'ja' ? `番号${i + 1}，友人${result.degrees[i]}人` : `Person ${i + 1}, ${result.degrees[i]} friends`);
        button.setAttribute('aria-pressed', String(selected.includes(i)));
        button.classList.toggle('even-count', show && result.degrees[i] % 2 === 0);
    });
    const lines = [];
    for (let a = 0; a < PEOPLE; a++) for (let b = a + 1; b < PEOPLE; b++) {
        if (isFriend(state, a, b)) {
            const [x1, y1] = positions[a], [x2, y2] = positions[b];
            lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${neighbors(a, b) ? 'neighbor' : 'added'}"/>`);
        }
    }
    $('lines').innerHTML = lines.join('');
    $('selection').textContent = lastAction
        ? `${lastAction.pair.map(i => i + 1).join(', ')}: ${t[lastAction.kind]}`
        : (selected.length ? `${t.picked}: ${selected[0] + 1}. ${t.choose}` : t.choose);
    $('clear').disabled = selected.length === 0;
    $('undo').disabled = state.history.length === 0;
    $('reset').disabled = state.history.length === 0 && selected.length === 0;
    $('message').textContent = result.complete ? t.complete : t.incomplete;
    $('message').dataset.state = result.complete ? 'complete' : '';
    $('details').hidden = !show;
    $('even').textContent = `${t.even}: ${result.degrees.flatMap((d, i) => d % 2 === 0 ? [i + 1] : []).join(', ') || t.none}`;
    $('example').textContent = `${t.example}: ${result.emptyTriples.length ? result.emptyTriples[0].map(i => i + 1).join(', ') : t.none}`;
}
$('language').addEventListener('change', event => { language = event.target.value; render(); });
$('clear').addEventListener('click', () => { const focus = selected[0] ?? 0; selected = []; lastAction = null; render(); buttons[focus].focus(); });
$('undo').addEventListener('click', () => { state = undo(state); selected = []; lastAction = null; render(); });
$('reset').addEventListener('click', () => { state = initialState(); selected = []; lastAction = null; render(); });
$('show').addEventListener('change', render);
render(); root.hidden = false;
