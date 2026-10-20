import { CoinGame } from './coin-game.mjs';

const copy = {
    en: {
        language: 'Language', size: 'n',
        coins: 'Coins', piles: 'Piles', moves: 'Moves', unequal: 'Unequal merges',
        merge: 'Combine', undo: 'Undo', reset: 'Reset',
        board: 'Coin piles',
        option: n => String(n),
        pile: (index, size) => `Pile ${index}: ${size} ${size === 1 ? 'coin' : 'coins'}`,
        choose: 'Select two piles.',
        one: 'Select one more pile.',
        preview: (a, b) => `${a} + ${b} = ${a + b}`,
        invalid: (a, b) => `Cannot combine: ${Math.max(a, b)} > 2 × ${Math.min(a, b)}.`,
        done: 'Complete!',
        stuck: 'No moves left. Undo or reset.',
    },
    ja: {
        language: '言語', size: 'n',
        coins: 'コインの枚数', piles: '山の数', moves: '操作回数', unequal: '異なる枚数の合流',
        merge: '合わせる', undo: '1手戻す', reset: 'リセット',
        board: 'コインの山',
        option: n => String(n),
        pile: (index, size) => `山${index}：${size}枚`,
        choose: '二つの山を選んでください．',
        one: 'もう一つ選んでください．',
        preview: (a, b) => `${a} + ${b} = ${a + b}`,
        invalid: (a, b) => `合流不可：${Math.max(a, b)} > 2 × ${Math.min(a, b)}`,
        done: '完了！',
        stuck: '合流できません．1手戻すかリセットしてください．',
    },
};

const root = document.getElementById('coin-game');
const board = document.getElementById('pile-board');
const message = document.getElementById('game-message');
const mergeButton = document.getElementById('merge-piles');
const undoButton = document.getElementById('undo-move');
const sizeSelect = document.getElementById('game-size');
const languageSelect = document.getElementById('game-language');
let game = new CoinGame(Number(sizeSelect.value));
let language = languageSelect.value;

function render(focusId) {
    const t = copy[language];
    root.lang = language;
    root.querySelectorAll('[data-label]').forEach(element => {
        element.textContent = t[element.dataset.label];
    });
    for (const option of sizeSelect.options) {
        const n = Number(option.value);
        option.textContent = t.option(n);
    }
    board.setAttribute('aria-label', t.board);
    document.getElementById('coin-total').textContent = game.total;
    document.getElementById('pile-total').textContent = game.piles.length;
    document.getElementById('move-total').textContent = game.history.length;
    document.getElementById('unequal-total').textContent = game.unequal;
    mergeButton.disabled = !game.canMerge;
    undoButton.disabled = game.history.length === 0;

    board.replaceChildren(...game.piles.map((pile, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pile';
        button.dataset.pileId = pile.id;
        button.setAttribute('aria-label', t.pile(index + 1, pile.size));
        button.setAttribute('aria-pressed', String(game.selected.includes(pile.id)));
        const coin = document.createElement('span');
        coin.className = 'pile-coin';
        coin.setAttribute('aria-hidden', 'true');
        coin.textContent = pile.size;
        button.append(coin);
        button.addEventListener('click', () => {
            game.select(pile.id);
            render(pile.id);
        });
        return button;
    }));

    const [a, b] = game.pair;
    message.dataset.state = '';
    if (game.complete) {
        message.textContent = t.done;
        message.dataset.state = 'complete';
    } else if (game.stuck) {
        message.textContent = t.stuck;
        message.dataset.state = 'blocked';
    } else if (a && b) {
        if (!game.canMerge) {
            message.textContent = t.invalid(a.size, b.size);
            message.dataset.state = 'blocked';
        } else {
            message.textContent = t.preview(a.size, b.size);
        }
    } else {
        message.textContent = a ? t.one : t.choose;
    }
    if (focusId !== undefined) {
        board.querySelector(`[data-pile-id="${focusId}"]`)?.focus({ preventScroll: true });
    }
}

mergeButton.addEventListener('click', () => {
    const mergedId = game.merge();
    if (mergedId !== false) render(mergedId);
});
undoButton.addEventListener('click', () => {
    if (game.undo()) render(game.piles[0].id);
});
document.getElementById('reset-game').addEventListener('click', () => {
    game = new CoinGame(Number(sizeSelect.value));
    render();
});
sizeSelect.addEventListener('change', () => {
    game = new CoinGame(Number(sizeSelect.value));
    render();
});
languageSelect.addEventListener('change', () => {
    language = languageSelect.value;
    render();
});

render();
root.hidden = false;
