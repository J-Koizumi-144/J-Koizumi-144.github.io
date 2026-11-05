import { PairDifferenceGame } from './pair-difference-game.mjs';

const copy = {
    en: {
        language: '言語', pair: 'Make pair', undo: 'Undo', reset: 'Reset', pairs: 'Pairs', total: 'Total of differences',
        cards: 'Unpaired cards', made: 'Pairs and differences', card: x => `Card ${x}`,
        remove: (a, b) => `Unpair ${a} and ${b}`, choose: 'Select two cards.', one: 'Select one more card.',
        ready: 'Make a pair with the selected cards.', done: 'All cards paired.', empty: 'No pairs yet.',
    },
    ja: {
        language: 'Language', pair: '組にする', undo: '1手戻す', reset: 'リセット', pairs: '作った組', total: '差の合計',
        cards: '組にしていないカード', made: '作った組と差', card: x => `カード${x}`,
        remove: (a, b) => `${a}と${b}の組を解除`, choose: 'カードを2枚選んでください．', one: 'もう1枚選んでください．',
        ready: '選んだ2枚を組にできます．', done: 'すべてのカードを組にしました．', empty: 'まだ組はありません．',
    },
};
const root = document.getElementById('pair-game');
const board = document.getElementById('pair-cards');
const list = document.getElementById('pair-list');
const size = document.getElementById('pair-size');
const language = document.getElementById('pair-language');
const make = document.getElementById('pair-make');
const undo = document.getElementById('pair-undo');
let game = new PairDifferenceGame(Number(size.value));

function render(focusCard) {
    const t = copy[language.value];
    root.lang = language.value;
    root.querySelectorAll('[data-label]').forEach(el => { el.textContent = t[el.dataset.label]; });
    board.setAttribute('aria-label', t.cards);
    list.setAttribute('aria-label', t.made);
    document.getElementById('pair-count').textContent = `${game.pairs.length} / ${game.n}`;
    document.getElementById('pair-total').textContent = game.total;
    make.disabled = game.selected.length !== 2;
    undo.disabled = game.history.length === 0;
    board.replaceChildren(...game.available.map(value => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'number-card';
        button.dataset.card = value;
        button.textContent = value;
        button.setAttribute('aria-label', t.card(value));
        button.setAttribute('aria-pressed', String(game.selected.includes(value)));
        button.disabled = game.selected.length === 2 && !game.selected.includes(value);
        button.addEventListener('click', () => { game.select(value); render(value); });
        button.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
            event.preventDefault();
            const buttons = [...board.querySelectorAll('button:not(:disabled)')];
            const index = buttons.indexOf(button);
            const offset = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
            buttons[(index + offset + buttons.length) % buttons.length]?.focus();
        });
        return button;
    }));
    list.replaceChildren(...game.pairs.map(([a, b], index) => {
        const item = document.createElement('li');
        const difference = document.createElement('span');
        difference.textContent = `${b} − ${a} = ${b - a}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', t.remove(a, b));
        remove.addEventListener('click', () => { game.remove(index); render(a); });
        item.append(difference, remove);
        return item;
    }));
    document.getElementById('pair-empty').textContent = game.pairs.length ? '' : t.empty;
    const message = document.getElementById('pair-message');
    message.textContent = game.complete ? t.done : game.selected.length === 2 ? t.ready : game.selected.length === 1 ? t.one : t.choose;
    message.dataset.state = game.complete ? 'complete' : '';
    if (focusCard !== undefined) board.querySelector(`[data-card="${focusCard}"]`)?.focus({ preventScroll: true });
}
make.addEventListener('click', () => {
    if (game.pair()) {
        render(game.available[0]);
        if (game.complete) list.querySelector('button')?.focus({ preventScroll: true });
    }
});
undo.addEventListener('click', () => { if (game.undo()) render(game.available[0]); });
function reset() { game = new PairDifferenceGame(Number(size.value)); render(); }
document.getElementById('pair-reset').addEventListener('click', reset);
size.addEventListener('change', reset);
language.addEventListener('change', () => render());
render();
root.hidden = false;
