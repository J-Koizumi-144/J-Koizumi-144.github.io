export class PairDifferenceGame {
    constructor(n = 4) {
        if (!Number.isInteger(n) || n < 1 || n > 12) throw new RangeError('n must be between 1 and 12');
        this.n = n;
        this.pairs = [];
        this.selected = [];
        this.history = [];
    }
    get available() {
        const used = new Set(this.pairs.flat());
        return Array.from({ length: 2 * this.n }, (_, i) => i + 1).filter(x => !used.has(x));
    }
    get total() { return this.pairs.reduce((sum, [a, b]) => sum + b - a, 0); }
    get complete() { return this.pairs.length === this.n; }
    select(value) {
        if (!this.available.includes(value)) return false;
        if (this.selected.includes(value)) this.selected = this.selected.filter(x => x !== value);
        else if (this.selected.length < 2) this.selected.push(value);
        else return false;
        return true;
    }
    pair() {
        if (this.selected.length !== 2) return false;
        this.history.push(this.pairs.map(pair => [...pair]));
        this.pairs.push([...this.selected].sort((a, b) => a - b));
        this.selected = [];
        return true;
    }
    remove(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.pairs.length) return false;
        this.history.push(this.pairs.map(pair => [...pair]));
        this.pairs.splice(index, 1);
        this.selected = [];
        return true;
    }
    undo() {
        if (!this.history.length) return false;
        this.pairs = this.history.pop();
        this.selected = [];
        return true;
    }
}
