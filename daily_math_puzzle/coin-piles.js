import { CoinGame } from './coin-game.mjs';

const copy = {
    en: {
        language: 'Language', size: 'Choose n',
        instructions: 'Select two piles, then combine them. The larger pile must be at most twice the size of the smaller one. Try to finish with as few unequal merges as possible.',
        coins: 'Coins', piles: 'Piles', moves: 'Moves', unequal: 'Unequal merges',
        merge: 'Combine selected piles', undo: 'Undo', reset: 'Start over',
        note: 'Each number is the number of coins in that pile. Only merges of different-sized piles count toward the quantity asked for in the problem. Changing n starts a new game.',
        board: 'Coin piles',
        option: (n, total) => `n = ${n} (${total} coins)`,
        pile: (index, size) => `Pile ${index}: ${size} ${size === 1 ? 'coin' : 'coins'}`,
        choose: 'Select two piles. Click a selected pile again to deselect it.',
        one: size => `Selected: ${size} ${size === 1 ? 'coin' : 'coins'}. Select one more pile.`,
        equal: (a, b) => `${a} + ${b} = ${a + b}. Equal sizes: the unequal-merge count will stay the same.`,
        different: (a, b) => `${a} + ${b} = ${a + b}. Different sizes: the unequal-merge count will increase by 1.`,
        invalid: (a, b) => `These piles cannot be combined: ${Math.max(a, b)} > 2 × ${Math.min(a, b)}. Deselect a pile or choose another one.`,
        done: count => `All coins are in one pile! Unequal merges: ${count}. Try another order and compare your count.`,
        stuck: 'No pair can be combined. Undo a move or start over to try a different order.',
    },
    ja: {
        language: '言語', size: 'n を選ぶ',
        instructions: '二つの山を選んで合わせてみましょう．大きい山の枚数は，小さい山の2倍以下でなければなりません．異なる枚数の山を合わせる回数を，できるだけ少なくしてみてください．',
        coins: 'コインの枚数', piles: '山の数', moves: '操作回数', unequal: '異なる枚数の合流',
        merge: '選んだ二つの山を合わせる', undo: '1手戻す', reset: '最初から',
        note: '山の中の数字はコインの枚数です．問題で尋ねているのは，枚数の異なる山を合わせた回数だけです．n を変更すると最初から始まります．',
        board: 'コインの山',
        option: (n, total) => `n = ${n}（${total}枚）`,
        pile: (index, size) => `山${index}：${size}枚`,
        choose: '二つの山を選んでください．選んだ山をもう一度押すと，選択を解除できます．',
        one: size => `${size}枚の山を選択中．もう一つ選んでください．`,
        equal: (a, b) => `${a} + ${b} = ${a + b}．同じ枚数なので，異なる枚数の合流回数は増えません．`,
        different: (a, b) => `${a} + ${b} = ${a + b}．枚数が異なるので，異なる枚数の合流回数が1増えます．`,
        invalid: (a, b) => `${Math.max(a, b)} > 2 × ${Math.min(a, b)} なので，この二つは合わせられません．選択を解除するか，別の山を選んでください．`,
        done: count => `一つの山にまとまりました！ 異なる枚数の合流は${count}回です．別の順番でも試して，回数を比べてみましょう．`,
        stuck: '合わせられる山がありません．1手戻すか，最初から別の順番を試してください．',
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
        option.textContent = t.option(n, 2 ** n + 1);
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
        message.textContent = t.done(game.unequal);
        message.dataset.state = 'complete';
    } else if (game.stuck) {
        message.textContent = t.stuck;
        message.dataset.state = 'blocked';
    } else if (a && b) {
        if (!game.canMerge) {
            message.textContent = t.invalid(a.size, b.size);
            message.dataset.state = 'blocked';
        } else {
            message.textContent = a.size === b.size ? t.equal(a.size, b.size) : t.different(a.size, b.size);
        }
    } else {
        message.textContent = a ? t.one(a.size) : t.choose;
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
