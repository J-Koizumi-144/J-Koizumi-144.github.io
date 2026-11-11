export const BOARD_SIZES = Object.freeze([
    [2, 3], [3, 3], [3, 4], [3, 5], [4, 6],
    [5, 6], [6, 6], [6, 7], [6, 8],
].map(size => Object.freeze(size)));

export class DominoPackingGame {
    constructor(rows = 4, columns = 6) {
        if (!BOARD_SIZES.some(([r, c]) => r === rows && c === columns)) {
            throw new RangeError('Unsupported board size');
        }
        this.rows = rows;
        this.columns = columns;
        this.cells = Array(rows * columns).fill(-1);
        this.history = [];
        this.pending = null;
        this.selected = null;
    }

    validCell(index) {
        return Number.isInteger(index) && index >= 0 && index < this.cells.length;
    }

    adjacent(first, second) {
        if (!this.validCell(first) || !this.validCell(second)) return false;
        return Math.abs(Math.floor(first / this.columns) - Math.floor(second / this.columns))
            + Math.abs(first % this.columns - second % this.columns) === 1;
    }

    clearSelection() {
        this.pending = null;
        this.selected = null;
    }

    choose(index) {
        if (!this.validCell(index)) return 'invalid';
        if (this.cells[index] !== -1) {
            const tile = Math.min(index, this.cells[index]);
            this.pending = null;
            this.selected = this.selected === tile ? null : tile;
            return this.selected === null ? 'cleared' : 'selected';
        }
        this.selected = null;
        if (this.pending === index) {
            this.pending = null;
            return 'cleared';
        }
        if (this.pending === null) {
            this.pending = index;
            return 'first';
        }
        return this.place(this.pending, index);
    }

    place(first, second) {
        if (!this.validCell(first) || !this.validCell(second)) return 'invalid';
        if (!this.adjacent(first, second)) return 'nonadjacent';
        if (this.cells[first] !== -1 || this.cells[second] !== -1) return 'occupied';
        this.history.push({ cells: this.cells.slice(), focus: first });
        this.cells[first] = second;
        this.cells[second] = first;
        this.clearSelection();
        return 'placed';
    }

    removeSelected() {
        if (this.selected === null) return false;
        const first = this.selected;
        const second = this.cells[first];
        if (second === -1) return false;
        this.history.push({ cells: this.cells.slice(), focus: first });
        this.cells[first] = this.cells[second] = -1;
        this.clearSelection();
        return true;
    }

    undo() {
        const previous = this.history.pop();
        if (!previous) return false;
        this.cells = previous.cells;
        this.clearSelection();
        return previous.focus;
    }

    reset() {
        this.cells.fill(-1);
        this.history = [];
        this.clearSelection();
    }

    get analysis() {
        let dominoes = 0;
        let empty = 0;
        let available = 0;
        this.cells.forEach((partner, index) => {
            if (partner > index) dominoes++;
            if (partner !== -1) return;
            empty++;
            if (index % this.columns + 1 < this.columns && this.cells[index + 1] === -1) available++;
            if (index + this.columns < this.cells.length && this.cells[index + this.columns] === -1) available++;
        });
        return { dominoes, empty, available, stopped: available === 0 };
    }
}
