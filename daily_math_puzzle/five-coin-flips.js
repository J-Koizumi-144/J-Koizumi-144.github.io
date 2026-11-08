(() => {
    'use strict';
    const root = document.querySelector('#five-coin-flips');
    const board = root.querySelector('#coin-board');
    const language = root.querySelector('#coin-language');
    const size = root.querySelector('#coin-size');
    const status = root.querySelector('#coin-status');
    const undo = root.querySelector('#coin-undo');
    const reset = root.querySelector('#coin-reset');
    let game = new window.FiveCoinGame(Number(size.value));
    let lang = 'en';
    let active = 0;
    let buttons = [];
    const words = {
        en: {
            language: '言語', size: 'Coins', instruction: 'Tap a heads coin to flip it and its two neighbors on each side.',
            moves: 'Moves', heads: 'Heads', tails: 'Tails', head: 'H', tail: 'T',
            undo: 'Undo', reset: 'Reset', board: 'Coins in clockwise order',
            complete: 'All coins show tails.',
            flipped: indices => `Flipped: ${indices.join(', ')}.`,
            coin: (i, heads) => `Coin ${i}: ${heads ? 'heads. Flip five coins' : 'tails. Choose a heads coin'}`,
        },
        ja: {
            language: 'Language', size: 'コインの枚数', instruction: '表のコインを押すと，左右2枚ずつと一緒に裏返ります．',
            moves: '操作回数', heads: '表', tails: '裏', head: '表', tail: '裏',
            undo: '1手戻す', reset: 'リセット', board: '時計回りに並ぶコイン',
            complete: 'すべて裏になりました．',
            flipped: indices => `裏返したコイン：${indices.join('，')}．`,
            coin: (i, heads) => `${i}番：${heads ? '表．5枚を裏返す' : '裏．表のコインを選んでください'}`,
        },
    };
    function focusCoin(index) {
        active = index;
        buttons.forEach((button, i) => { button.tabIndex = i === active ? 0 : -1; });
        buttons[index].focus();
    }
    function buildBoard() {
        buttons.forEach(button => button.remove());
        active = 0;
        buttons = game.coins.map((_, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'flip-coin';
            const angle = -Math.PI / 2 + index * 2 * Math.PI / game.n;
            button.style.left = `${50 + 40 * Math.cos(angle)}%`;
            button.style.top = `${50 + 40 * Math.sin(angle)}%`;
            const number = document.createElement('span');
            number.className = 'coin-number';
            number.textContent = index + 1;
            const face = document.createElement('span');
            face.className = 'coin-face';
            button.append(number, face);
            button.addEventListener('focus', () => {
                active = index;
                buttons.forEach((item, i) => { item.tabIndex = i === active ? 0 : -1; });
            });
            button.addEventListener('click', () => {
                if (game.flip(index)) { active = index; render(); }
            });
            button.addEventListener('keydown', event => {
                const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                if (delta) {
                    event.preventDefault();
                    focusCoin((index + delta + game.n) % game.n);
                } else if (event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    focusCoin(event.key === 'Home' ? 0 : game.n - 1);
                }
            });
            board.append(button);
            return button;
        });
    }
    function render() {
        const w = words[lang];
        const check = game.analysis;
        const last = game.history.length ? game.history[game.history.length - 1] : null;
        const affected = last === null ? [] : game.affected(last);
        root.lang = lang;
        root.querySelectorAll('[data-word]').forEach(node => { node.textContent = w[node.dataset.word]; });
        language.setAttribute('aria-label', w.language);
        board.setAttribute('aria-label', w.board);
        root.querySelector('#coin-moves').textContent = check.moves;
        root.querySelector('#coin-heads').textContent = check.heads;
        root.querySelector('#coin-tails').textContent = check.tails;
        buttons.forEach((button, index) => {
            const heads = game.coins[index];
            button.dataset.face = heads ? 'heads' : 'tails';
            // Keep unavailable coins focusable so the entire circle can be read with arrow keys.
            button.setAttribute('aria-disabled', String(!heads));
            button.setAttribute('aria-label', w.coin(index + 1, heads));
            button.classList.toggle('just-flipped', affected.includes(index));
            button.tabIndex = index === active ? 0 : -1;
            button.querySelector('.coin-face').textContent = heads ? w.head : w.tail;
        });
        undo.disabled = !check.moves;
        reset.disabled = !check.moves;
        status.dataset.state = check.complete ? 'complete' : 'ready';
        status.textContent = check.complete ? w.complete : affected.length ? w.flipped(affected.map(i => i + 1)) : '';
    }
    undo.addEventListener('click', () => {
        game.undo();
        render();
        if (undo.disabled) focusCoin(active);
    });
    reset.addEventListener('click', () => {
        game.reset();
        render();
        focusCoin(active);
    });
    size.addEventListener('change', () => {
        const n = Number(size.value);
        if (!Number.isInteger(n) || n < 5 || n > 12) { size.value = game.n; return; }
        game = new window.FiveCoinGame(n);
        buildBoard();
        render();
    });
    language.addEventListener('change', () => { lang = language.value === 'ja' ? 'ja' : 'en'; render(); });
    buildBoard();
    render();
    root.hidden = false;
})();
