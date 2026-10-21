export class FrogGame {
    constructor(n) {
        if (!Number.isInteger(n) || n < 1 || n > 6) throw new RangeError('Unsupported stone count');
        this.n = n;
        this.size = 5 * n;
        this.path = [];
    }

    reason(stone) {
        if (!Number.isInteger(stone) || stone < 1 || stone > this.size) return 'outside';
        if (this.complete) return 'complete';
        if (!this.path.length) return '';
        const distance = Math.abs(stone - this.path.at(-1));
        if (distance !== 2 && distance !== 3) return 'distance';
        if (stone === this.path[0]) return this.path.length === this.size ? '' : 'early';
        if (this.path.includes(stone)) return 'visited';
        return '';
    }

    jump(stone) {
        if (this.reason(stone)) return false;
        this.path.push(stone);
        return true;
    }

    undo() {
        return this.path.length ? this.path.pop() : false;
    }

    get complete() {
        return this.path.length === this.size + 1 && this.path[0] === this.path.at(-1);
    }

    get analysis() {
        let short = 0;
        let long = 0;
        for (let i = 1; i < this.path.length; i++) {
            if (Math.abs(this.path[i] - this.path[i - 1]) === 2) short++;
            else long++;
        }
        const moves = Array.from({length: this.size}, (_, i) => i + 1).filter(stone => !this.reason(stone));
        return {short, long, jumps: short + long, visited: new Set(this.path).size,
            moves, complete: this.complete, blocked: !this.complete && moves.length === 0};
    }
}
