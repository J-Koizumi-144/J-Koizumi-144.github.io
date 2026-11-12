export const boardSizes = [2, 3, 4, 5, 6, 7];

export class CoinCrossGame {
    constructor(size = 3) {
        if (!boardSizes.includes(size)) throw new RangeError('Unsupported board size');
        this.size = size;
        this.cells = Array(size * size).fill(false);
        this.history = [];
    }

    get tails() {
        return this.cells.filter(Boolean).length;
    }

    get complete() {
        return this.cells.every(Boolean);
    }

    play(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) return false;
        this.#flipCross(index);
        this.history.push(index);
        return true;
    }

    undo() {
        if (this.history.length === 0) return null;
        const index = this.history.pop();
        this.#flipCross(index);
        return index;
    }

    reset() {
        this.cells.fill(false);
        this.history.length = 0;
    }

    #flipCross(index) {
        const rowStart = index - index % this.size;
        const column = index % this.size;
        for (let i = 0; i < this.size; i++) {
            const inRow = rowStart + i;
            const inColumn = i * this.size + column;
            this.cells[inRow] = !this.cells[inRow];
            if (inColumn !== index) this.cells[inColumn] = !this.cells[inColumn];
        }
    }
}
