export function shuffledCards(n, random = Math.random) {
    if (!Number.isInteger(n) || n < 3 || n > 8) throw new RangeError('Card count must be 3–8.');
    const cards = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

export class SwapGame {
    constructor(cards) {
        if (!Array.isArray(cards) || cards.length < 3 || cards.length > 8 ||
            new Set(cards).size !== cards.length ||
            cards.some(x => !Number.isInteger(x) || x < 1 || x > cards.length)) {
            throw new RangeError('Expected a permutation of 1 through n, with 3–8 cards.');
        }
        this.initial = [...cards];
        this.reset();
    }
    reset() {
        this.cards = [...this.initial];
        this.pairs = [];
        this.pending = null;
        this.history = [];
    }
    get rounds() { return this.history.length; }
    get finished() { return this.rounds === 2; }
    get sorted() { return this.cards.every((x, i) => x === i + 1); }
    get canApply() { return !this.finished && this.pending === null; }
    select(index) {
        if (this.finished || !Number.isInteger(index) || index < 0 || index >= this.cards.length) return false;
        const pair = this.pairs.findIndex(p => p.includes(index));
        if (pair !== -1) {
            this.pairs.splice(pair, 1);
        } else if (this.pending === index) {
            this.pending = null;
        } else if (this.pending === null) {
            this.pending = index;
        } else {
            this.pairs.push([this.pending, index].sort((a, b) => a - b));
            this.pending = null;
        }
        return true;
    }
    clear() {
        this.pairs = [];
        this.pending = null;
    }
    apply() {
        if (!this.canApply) return false;
        this.history.push({ cards: [...this.cards], pairs: this.pairs.map(p => [...p]) });
        const before = [...this.cards];
        for (const [a, b] of this.pairs) {
            this.cards[a] = before[b];
            this.cards[b] = before[a];
        }
        this.clear();
        return true;
    }
    undo() {
        const previous = this.history.pop();
        if (!previous) return false;
        this.cards = previous.cards;
        this.pairs = previous.pairs;
        this.pending = null;
        return true;
    }
}
