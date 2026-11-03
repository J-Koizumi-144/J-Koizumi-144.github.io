export class SeatingGame {
    constructor(size) {
        if (![2, 4, 8, 16, 32].includes(size)) throw new RangeError("Unsupported seat count");
        this.order = Array(size).fill(0);
        this.moves = [];
        this.total = 0;
    }

    sit(seat) {
        if (!Number.isInteger(seat) || this.order[seat] !== 0) return false;
        this.order[seat] = this.moves.length + 1;
        let left = seat;
        let right = seat;
        while (this.order[left - 1]) left--;
        while (this.order[right + 1]) right++;
        const points = right - left + 1;
        this.moves.push({ seat, left, right, points });
        this.total += points;
        return true;
    }

    undo() {
        const move = this.moves.pop();
        if (!move) return;
        this.order[move.seat] = 0;
        this.total -= move.points;
    }
}
