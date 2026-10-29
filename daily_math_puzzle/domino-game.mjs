export class DominoGame {
    constructor(n) {
        if (!Number.isInteger(n) || n < 2 || n > 10) throw new RangeError('Unsupported size');
        this.n = n;
        this.columns = 2 * n - 2;
        this.cells = Array(n * this.columns).fill(-1);
        this.history = [];
    }
    validIndex(i) { return Number.isInteger(i) && i >= 0 && i < this.cells.length; }
    place(i, direction) {
        if (!this.validIndex(i) || !['h', 'v'].includes(direction)) return 'invalid';
        const j = i + (direction === 'h' ? 1 : this.columns);
        if (!this.validIndex(j) || (direction === 'h' && i % this.columns === this.columns - 1)) return 'edge';
        if (this.cells[i] !== -1 || this.cells[j] !== -1) return 'overlap';
        this.history.push({ cells: this.cells.slice(), index: i });
        this.cells[i] = j;
        this.cells[j] = i;
        return 'placed';
    }
    remove(i) {
        if (!this.validIndex(i) || this.cells[i] === -1) return false;
        this.history.push({ cells: this.cells.slice(), index: i });
        const j = this.cells[i];
        this.cells[i] = this.cells[j] = -1;
        return true;
    }
    undo() {
        const previous = this.history.pop();
        if (!previous) return false;
        this.cells = previous.cells;
        return previous.index;
    }
    get analysis() {
        const rows = Array(this.n).fill(0);
        let tiles = 0;
        for (let i = 0; i < this.cells.length; i++) {
            const j = this.cells[i];
            if (j <= i) continue;
            tiles++;
            if (Math.floor(i / this.columns) === Math.floor(j / this.columns)) rows[Math.floor(i / this.columns)]++;
        }
        const distinct = new Set(rows).size;
        const empty = this.cells.length - 2 * tiles;
        const repeated = rows.map(count => rows.filter(value => value === count).length > 1);
        return { rows, tiles, empty, distinct, repeated, complete: empty === 0 && distinct === this.n };
    }
}
