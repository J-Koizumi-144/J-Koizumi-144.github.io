export const MIN_SIZE = 2;
export const MAX_SIZE = 8;

function checkSize(n) {
    if (!Number.isInteger(n) || n < MIN_SIZE || n > MAX_SIZE) {
        throw new RangeError('Grid size must be an integer from 2 to 8');
    }
}

export function boardSums(board) {
    return {
        rows: board.map(row => row.reduce((sum, value) => sum + value, 0)),
        columns: board[0].map((_, col) => board.reduce((sum, row) => sum + row[col], 0)),
    };
}

export function randomBoard(n, random = Math.random) {
    checkSize(n);
    const board = Array.from({ length: n }, () => Array(n).fill(0));
    const completingValue = sum => {
        const remainder = (3 - sum % 3) % 3;
        return remainder || (random() < 0.5 ? 0 : 3);
    };
    for (let row = 0; row < n - 1; row++) {
        for (let col = 0; col < n - 1; col++) {
            board[row][col] = Math.floor(random() * 4);
        }
    }
    for (let row = 0; row < n - 1; row++) {
        board[row][n - 1] = completingValue(board[row].reduce((sum, value) => sum + value, 0));
    }
    for (let col = 0; col < n - 1; col++) {
        board[n - 1][col] = completingValue(board.reduce((sum, row) => sum + row[col], 0));
    }
    // The other row and column sums are already divisible by 3, so completing
    // the last row also completes the last column.
    board[n - 1][n - 1] = completingValue(board[n - 1].reduce((sum, value) => sum + value, 0));
    return board;
}

export class GridSums {
    constructor(original) {
        checkSize(original.length);
        const n = original.length;
        if (!original.every(row => Array.isArray(row) && row.length === n &&
            row.every(value => Number.isInteger(value) && value >= 0 && value <= 3))) {
            throw new RangeError('Invalid grid');
        }
        this.target = boardSums(original);
        if (![...this.target.rows, ...this.target.columns].every(sum => sum % 3 === 0)) {
            throw new RangeError('Every row and column sum must be divisible by 3');
        }
        this.original = original.map(row => [...row]);
        this.n = n;
        this.reset();
    }

    toggle(row, col) {
        if (![row, col].every(index => Number.isInteger(index) && index >= 0 && index < this.n)) {
            return false;
        }
        this.board[row][col] = 3 - this.board[row][col];
        this.history.push([row, col]);
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        const [row, col] = this.history.pop();
        this.board[row][col] = 3 - this.board[row][col];
        return true;
    }

    reset() {
        this.board = Array.from({ length: this.n }, () => Array(this.n).fill(0));
        this.history = [];
    }

    get status() {
        const sums = boardSums(this.board);
        const rows = sums.rows.map((value, row) => value === this.target.rows[row]);
        const columns = sums.columns.map((value, col) => value === this.target.columns[col]);
        return { sums, rows, columns, complete: rows.every(Boolean) && columns.every(Boolean) };
    }
}
