(function (root) {
    'use strict';
    class FiveCoinGame {
        constructor(n = 9) {
            if (!Number.isInteger(n) || n < 5 || n > 12) throw new RangeError('Unsupported coin count');
            this.n = n;
            this.reset();
        }
        reset() {
            this.coins = Array(this.n).fill(true);
            this.history = [];
        }
        affected(center) {
            if (!Number.isInteger(center) || center < 0 || center >= this.n) return [];
            return [-2, -1, 0, 1, 2].map(offset => (center + offset + this.n) % this.n);
        }
        flip(center) {
            const indices = this.affected(center);
            if (!indices.length || !this.coins[center]) return false;
            indices.forEach(index => { this.coins[index] = !this.coins[index]; });
            this.history.push(center);
            return true;
        }
        undo() {
            if (!this.history.length) return false;
            const center = this.history.pop();
            this.affected(center).forEach(index => { this.coins[index] = !this.coins[index]; });
            return true;
        }
        get analysis() {
            const heads = this.coins.filter(Boolean).length;
            return { heads, tails: this.n - heads, moves: this.history.length, complete: heads === 0 };
        }
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = FiveCoinGame;
    else root.FiveCoinGame = FiveCoinGame;
})(globalThis);
