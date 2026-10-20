// The puzzle rules are independent of the page and can be tested with Node.
export class CoinGame {
    constructor(n = 3) {
        if (!Number.isInteger(n) || n < 1 || n > 6) {
            throw new RangeError('Choose an integer n from 1 to 6.');
        }
        this.n = n;
        this.total = 2 ** n + 1;
        this.piles = Array.from({ length: this.total }, (_, id) => ({ id, size: 1 }));
        this.selected = [];
        this.history = [];
        this.unequal = 0;
        this.nextId = this.total;
    }

    static canCombine(a, b) {
        return Math.max(a, b) <= 2 * Math.min(a, b);
    }

    select(id) {
        if (!this.piles.some(pile => pile.id === id)) return;
        if (this.selected.includes(id)) {
            this.selected = this.selected.filter(value => value !== id);
        } else if (this.selected.length < 2) {
            this.selected.push(id);
        } else {
            // Keep the first selection; the newly clicked pile replaces the second.
            this.selected = [this.selected[0], id];
        }
    }

    get pair() {
        return this.selected.map(id => this.piles.find(pile => pile.id === id));
    }

    get canMerge() {
        const [a, b] = this.pair;
        return Boolean(a && b && CoinGame.canCombine(a.size, b.size));
    }

    get complete() {
        return this.piles.length === 1;
    }

    get stuck() {
        if (this.complete) return false;
        const sizes = this.piles.map(pile => pile.size).sort((a, b) => a - b);
        return !sizes.some((size, index) => index > 0 && CoinGame.canCombine(sizes[index - 1], size));
    }

    merge() {
        if (!this.canMerge) return false;
        const [a, b] = this.pair;
        this.history.push({
            piles: this.piles.map(pile => ({ ...pile })),
            unequal: this.unequal,
            nextId: this.nextId,
        });
        const insertionIndex = this.piles.findIndex(pile => this.selected.includes(pile.id));
        const merged = { id: this.nextId++, size: a.size + b.size };
        this.piles = this.piles.filter(pile => !this.selected.includes(pile.id));
        this.piles.splice(insertionIndex, 0, merged);
        if (a.size !== b.size) this.unequal++;
        this.selected = [];
        return merged.id;
    }

    undo() {
        const previous = this.history.pop();
        if (!previous) return false;
        this.piles = previous.piles;
        this.unequal = previous.unequal;
        this.nextId = previous.nextId;
        this.selected = [];
        return true;
    }
}
