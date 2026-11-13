export const MIN_HEIGHT = 2;
export const MAX_HEIGHT = 9;
export const DEFAULT_HEIGHT = 5;

export function newGame(n = DEFAULT_HEIGHT) {
    if (!Number.isInteger(n) || n < MIN_HEIGHT || n > MAX_HEIGHT) {
        throw new RangeError('Unsupported building height');
    }
    const inner = Array.from({ length: n - 1 }, (_, i) => i + 1);
    const order = [n, ...inner.filter(h => h % 2 === 0), ...inner.filter(h => h % 2 !== 0), n];
    return { initial: order, order, history: [] };
}

export function reorder(order, from, to) {
    const movable = i => Number.isInteger(i) && i > 0 && i < order.length - 1;
    if (from === to || !movable(from) || !movable(to)) return order;
    const result = order.slice();
    const [building] = result.splice(from, 1);
    result.splice(to, 0, building);
    return result;
}

export function moveBuilding(state, from, to) {
    const order = reorder(state.order, from, to);
    if (order === state.order) return state;
    return { ...state, order, history: [...state.history, state.order] };
}

export function undoMove(state) {
    if (!state.history.length) return state;
    return { ...state, order: state.history.at(-1), history: state.history.slice(0, -1) };
}

export function communication(order) {
    const degrees = Array(order.length).fill(0);
    const links = [];
    for (let left = 0; left < order.length - 1; left++) {
        let highestBetween = 0;
        for (let right = left + 1; right < order.length; right++) {
            const floor = Math.min(order[left], order[right]);
            if (highestBetween < floor) {
                links.push({ left, right, floor });
                degrees[left]++;
                degrees[right]++;
            }
            if (order[right] >= order[left]) break;
            highestBetween = Math.max(highestBetween, order[right]);
        }
    }
    return { links, degrees };
}
