export const MAX_BEADS = 24;

export class BeadRing {
    constructor(n = 3, length = 10) {
        if (!Number.isInteger(n) || n < 2 || n > 4 ||
            !Number.isInteger(length) || length < n || length > MAX_BEADS) {
            throw new RangeError('Unsupported ring size');
        }
        this.n = n;
        this.beads = Array(length).fill(false);
        this.history = [];
    }

    flip(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.beads.length) return;
        this.beads[index] = !this.beads[index];
        this.history.push(index);
    }

    undo() {
        if (!this.history.length) return;
        const index = this.history.pop();
        this.beads[index] = !this.beads[index];
    }

    inspect() {
        const patterns = new Set();
        const changes = [];
        const length = this.beads.length;
        for (let start = 0; start < length; start++) {
            let pattern = 0;
            for (let offset = 0; offset < this.n; offset++) {
                pattern = 2 * pattern + Number(this.beads[(start + offset) % length]);
            }
            patterns.add(pattern);
            if (this.beads[start] !== this.beads[(start + 1) % length]) changes.push(start);
        }
        return { patterns: patterns.size, changes, complete: patterns.size === 2 ** this.n };
    }
}
