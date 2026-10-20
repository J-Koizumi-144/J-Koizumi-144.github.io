export class GridGame {
    constructor(n) {
        if (!Number.isInteger(n) || n < 2 || n > 6) throw new RangeError('Unsupported grid size');
        this.n = n;
        this.size = 2 * n;
        this.cells = Array(this.size ** 2).fill(false);
        this.history = [];
    }

    toggle(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) return false;
        this.cells[index] = !this.cells[index];
        this.history.push(index);
        return true;
    }

    undo() {
        if (this.history.length === 0) return false;
        const index = this.history.pop();
        this.cells[index] = !this.cells[index];
        return index;
    }

    get analysis() {
        const rows = Array(this.size).fill(0);
        const columns = Array(this.size).fill(0);
        let black = 0;
        this.cells.forEach((filled, index) => {
            if (!filled) return;
            black++;
            rows[Math.floor(index / this.size)]++;
            columns[index % this.size]++;
        });
        const invalidSquares = [];
        for (let row = 0; row < this.size - 1; row++) {
            for (let column = 0; column < this.size - 1; column++) {
                const index = row * this.size + column;
                const count = Number(this.cells[index]) + Number(this.cells[index + 1])
                    + Number(this.cells[index + this.size]) + Number(this.cells[index + this.size + 1]);
                if (count % 2 === 0) invalidSquares.push({ row, column });
            }
        }
        const emptyRows = rows.filter(count => count === 0).length;
        const emptyColumns = columns.filter(count => count === 0).length;
        return {
            black, rows, columns, emptyRows, emptyColumns, invalidSquares,
            valid: emptyRows === 0 && emptyColumns === 0 && invalidSquares.length === 0,
        };
    }
}
