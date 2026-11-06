(function () {
  'use strict';
  const game = window.CoinCircleGame;
  const root = document.querySelector('#coin-circle');
  const svg = root.querySelector('svg');
  const arrows = root.querySelector('#arrows');
  const people = root.querySelector('#people');
  const language = root.querySelector('#language');
  const pass = root.querySelector('#pass');
  const undo = root.querySelector('#undo');
  const reset = root.querySelector('#reset');
  const randomize = root.querySelector('#randomize');
  const status = root.querySelector('#status');
  const ns = 'http://www.w3.org/2000/svg';
  let state = game.create();
  let initial = [...state.coins];
  let lang = 'en';
  const words = {
    en: { language: '言語', instruction: 'Tap arrows to select the transfers.', pass: 'Pass coins',
      undo: 'Undo', reset: 'Reset', randomize: 'Randomize', round: 'Round', selected: n => `${n} selected`,
      ready: '', planned: n => `${n} coin${n === 1 ? '' : 's'} will be passed.`,
      error: 'Not enough coins at the highlighted position.', end: 'Five rounds used. Undo or reset to try again.',
      complete: 'Everyone has five coins!', board: 'Coins around a circular table',
      amount: (n, position) => `${n} coin${n === 1 ? '' : 's'}, ${position}`, arrow: (from, to) => `Pass one coin: ${from} to ${to}`,
      positions: ['top', 'upper right', 'right', 'lower right', 'bottom right', 'bottom left', 'lower left', 'left', 'upper left'] },
    ja: { language: 'Language', instruction: '矢印を押して，渡す向きを選びます．', pass: 'コインを渡す',
      undo: '1手戻す', reset: 'リセット', randomize: 'ランダムに配置', round: '操作回数', selected: n => `${n}本選択中`,
      ready: '', planned: n => `${n}枚を同時に渡します．`,
      error: '色の付いた場所のコインが足りません．', end: '5回終了．戻すか，リセットしてください．',
      complete: '全員5枚になりました！', board: '円卓のコイン',
      amount: (n, position) => `${position}，${n}枚`, arrow: (from, to) => `${from}から${to}へ1枚渡す`,
      positions: ['真上', '右上', '右', '右下', '下の右側', '下の左側', '左下', '左', '左上'] },
  };
  const points = Array.from({ length: 9 }, (_, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / 9;
    return { x: 240 + 190 * Math.cos(angle), y: 240 + 190 * Math.sin(angle) };
  });
  function element(tag, attributes, parent) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    parent.append(node);
    return node;
  }
  const arrowNodes = game.edges.map(({ from, to }, index) => {
    const a = points[from], b = points[to];
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length;
    const start = { x: a.x + ux * 34 - uy * 18, y: a.y + uy * 34 + ux * 18 };
    const size = length - 68;
    const arrow = element('g', {
      transform: `translate(${start.x} ${start.y}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`,
      class: 'arrow', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'data-edge': index,
    }, arrows);
    const shape = `M 0 -4 L ${size - 14} -4 L ${size - 14} -11 L ${size} 0 L ${size - 14} 11 L ${size - 14} 4 L 0 4 Z`;
    element('path', { d: shape, class: 'arrow-hit', 'aria-hidden': 'true' }, arrow);
    element('path', { d: shape, class: 'arrow-shape', 'aria-hidden': 'true' }, arrow);
    arrow.addEventListener('click', () => { state = game.toggle(state, index); render(); });
    arrow.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); state = game.toggle(state, index); render();
      } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        arrowNodes[(index + delta + 18) % 18].focus();
      }
    });
    return arrow;
  });
  const personNodes = points.map(point => {
    const group = element('g', { class: 'person-group', role: 'img' }, people);
    const circle = element('circle', { cx: point.x, cy: point.y, r: 25, class: 'person' }, group);
    const text = element('text', { x: point.x, y: point.y, class: 'amount' }, group);
    return { group, circle, text };
  });
  function render() {
    const w = words[lang];
    const check = game.inspect(state);
    root.lang = lang;
    root.querySelectorAll('[data-word]').forEach(node => { node.textContent = w[node.dataset.word]; });
    svg.setAttribute('aria-label', w.board);
    root.querySelector('#round').textContent = state.history.length;
    root.querySelector('#selected').textContent = w.selected(check.selectedCount);
    personNodes.forEach(({ group, circle, text }, i) => {
      text.textContent = state.coins[i];
      group.setAttribute('aria-label', w.amount(state.coins[i], w.positions[i]));
      circle.classList.toggle('short', check.shortages[i]);
    });
    arrowNodes.forEach((arrow, i) => {
      const { from, to } = game.edges[i];
      arrow.setAttribute('aria-pressed', String(state.selected[i]));
      arrow.setAttribute('aria-disabled', String(check.ended));
      arrow.setAttribute('aria-label', w.arrow(w.positions[from], w.positions[to]));
    });
    pass.disabled = !check.legal;
    undo.disabled = !state.history.length;
    if (check.shortages.some(Boolean)) {
      status.textContent = w.error; status.dataset.state = 'error';
    } else if (check.complete) {
      status.textContent = w.complete; status.dataset.state = 'complete';
    } else if (check.ended) {
      status.textContent = w.end; status.dataset.state = 'ended';
    } else {
      status.textContent = check.selectedCount ? w.planned(check.selectedCount) : w.ready;
      status.dataset.state = 'ready';
    }
  }
  pass.addEventListener('click', () => { state = game.advance(state); render(); });
  undo.addEventListener('click', () => { state = game.undo(state); render(); });
  reset.addEventListener('click', () => { state = game.create(initial); render(); });
  randomize.addEventListener('click', () => {
    let next = game.deal(initial);
    while (next.every((n, i) => n === state.coins[i])) next = game.deal(next);
    state = game.create(next); initial = [...next]; render();
  });
  language.addEventListener('change', () => { lang = language.value; render(); });
  render();
  root.hidden = false;
})();
