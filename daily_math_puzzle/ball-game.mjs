export class BallGame {
    constructor(n) {
        if (!Number.isInteger(n) || n < 2 || n > 12) throw new RangeError('Unsupported size');
        this.n = n;
        this.balls = Array.from({length: 2 * n}, (_, i) => Math.floor(i / 2) + 1);
        this.history = [];
    }
    swap(a, b) {
        if (![a, b].every(i => Number.isInteger(i) && i >= 0 && i < this.balls.length)
            || a === b || this.balls[a] === this.balls[b]) return false;
        [this.balls[a], this.balls[b]] = [this.balls[b], this.balls[a]];
        this.history.push([a, b]);
        return true;
    }
    undo() {
        if (!this.history.length) return false;
        const [a, b] = this.history.pop();
        [this.balls[a], this.balls[b]] = [this.balls[b], this.balls[a]];
        return true;
    }
    get analysis() {
        const records = Array.from({length: this.n}, (_, i) => {
            const label = i + 1;
            const gap = this.balls.lastIndexOf(label) - this.balls.indexOf(label) - 1;
            return {label, gap, valid: gap >= this.n - 2};
        });
        const valid = records.filter(record => record.valid).length;
        return {records, distinct: new Set(records.map(record => record.gap)).size,
            valid, complete: valid === this.n};
    }
}
