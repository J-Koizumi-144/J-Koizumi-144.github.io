export const MIN_SIZE = 1;
export const MAX_SIZE = 6;

export class BlackCellPairsGame {
    constructor(n = 4) {
        if (!Number.isInteger(n) || n < MIN_SIZE || n > MAX_SIZE) {
            throw new RangeError('Unsupported grid size');
        }
        this.n = n;
        this.cells = Array(n * n).fill(false);
        this.history = [];
    }

    toggle(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) return false;
        this.cells[index] = !this.cells[index];
        this.history.push(index);
        return true;
    }

    undo() {
        if (this.history.length === 0) return null;
        const index = this.history.pop();
        this.cells[index] = !this.cells[index];
        return index;
    }

    reset() {
        this.cells.fill(false);
        this.history = [];
    }

    get analysis() {
        const rows = Array(this.n).fill(0);
        const columns = Array(this.n).fill(0);
        let black = 0;
        for (let index = 0; index < this.cells.length; index++) {
            if (!this.cells[index]) continue;
            black++;
            rows[Math.floor(index / this.n)]++;
            columns[index % this.n]++;
        }
        const groups = new Map();
        const labels = this.cells.map((filled, index) => {
            if (!filled) return null;
            const pair = [rows[Math.floor(index / this.n)], columns[index % this.n]];
            const key = pair.join(',');
            if (!groups.has(key)) groups.set(key, { pair, indices: [] });
            groups.get(key).indices.push(index);
            return pair;
        });
        const duplicate = [...groups.values()].find(group => group.indices.length > 1) ?? null;
        return { rows, columns, black, labels, duplicate, valid: black > 0 && duplicate === null };
    }
}
