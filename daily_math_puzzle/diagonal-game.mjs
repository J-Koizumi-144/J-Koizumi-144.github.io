export function analyze(cells, size) {
    if (!Number.isInteger(size) || size < 1 || cells.length !== size * size || cells.some(x => typeof x !== 'boolean')) throw new RangeError('Invalid grid');
    const rows = Array.from({ length: size }, (_, r) => cells.slice(r * size, (r + 1) * size));
    const columns = Array.from({ length: size }, (_, c) => rows.map(row => row[c]));
    function lines(values) {
        const counts = values.map(line => line.filter(Boolean).length);
        const frequency = new Map();
        counts.forEach(count => frequency.set(count, (frequency.get(count) || 0) + 1));
        return values.map((line, i) => {
            const count = counts[i];
            const consecutive = count > 0 && line.lastIndexOf(true) - line.indexOf(true) + 1 === count;
            const distinct = frequency.get(count) === 1;
            return { count, consecutive, distinct, valid: count > 0 && consecutive && distinct };
        });
    }
    const rowInfo = lines(rows), columnInfo = lines(columns);
    return {
        rows: rowInfo, columns: columnInfo,
        black: cells.filter(Boolean).length,
        diagonal: rows.reduce((sum, row, i) => sum + Number(row[i]), 0),
        invalidRows: rowInfo.filter(line => !line.valid).length,
        invalidColumns: columnInfo.filter(line => !line.valid).length,
        valid: [...rowInfo, ...columnInfo].every(line => line.valid),
    };
}

export class DiagonalGame {
    constructor(n = 2) {
        if (!Number.isInteger(n) || n < 1 || n > 6) throw new RangeError('Invalid size');
        this.n = n;
        this.size = 3 * n;
        this.cells = Array(this.size * this.size).fill(false);
        this.history = [];
    }
    get analysis() { return analyze(this.cells, this.size); }
    toggle(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) return false;
        this.cells[index] = !this.cells[index];
        this.history.push(index);
        return true;
    }
    undo() {
        if (!this.history.length) return false;
        const index = this.history.pop();
        this.cells[index] = !this.cells[index];
        return index;
    }
}
