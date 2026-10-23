export const MIN_TEAMS = 3;
export const MAX_TEAMS = 20;

export class TournamentGame {
    constructor(size = 6) {
        if (!Number.isInteger(size) || size < MIN_TEAMS || size > MAX_TEAMS) {
            throw new RangeError('Invalid team count');
        }
        this.size = size;
        this.reset();
    }
    reset() {
        this.results = Array.from({ length: this.size }, () => Array(this.size).fill(0));
        this.history = [];
    }
    cycle(row, column) {
        if (![row, column].every(i => Number.isInteger(i) && i >= 0 && i < this.size) || row === column) return false;
        const before = this.results[row][column];
        this.history.push({ row, column, before });
        const after = before === 0 ? 1 : before === 1 ? -1 : 0;
        this.results[row][column] = after;
        this.results[column][row] = -after;
        return true;
    }
    undo() {
        const move = this.history.pop();
        if (!move) return false;
        const { row, column, before } = move;
        this.results[row][column] = before;
        this.results[column][row] = -before;
        return true;
    }
    get analysis() {
        const teams = this.results.map((row, i) => {
            let wins = 0, draws = 0, losses = 0;
            row.forEach((value, j) => {
                if (i === j) return;
                if (value === 1) wins++;
                else if (value === -1) losses++;
                else draws++;
            });
            return { wins, draws, losses, two: 2 * wins + draws, three: 3 * wins + draws };
        });
        const [a, b, c] = teams;
        return {
            teams,
            twoMet: a.two > b.two && b.two > c.two,
            threeMet: c.three > b.three && b.three > a.three,
            complete: a.two > b.two && b.two > c.two && c.three > b.three && b.three > a.three,
        };
    }
}
