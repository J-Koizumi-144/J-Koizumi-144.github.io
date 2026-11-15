export const MIN_BOXES = 3;
export const MAX_BOXES = 11;
export const DEFAULT_BOXES = 7;

export function validBoxCount(size) {
    return Number.isInteger(size) && size >= MIN_BOXES && size <= MAX_BOXES && size % 2 === 1;
}

export class StoneRing {
    constructor(size = DEFAULT_BOXES) {
        if (!validBoxCount(size)) throw new RangeError('Choose an odd number of boxes from 3 to 11.');
        this.boxes = Array.from({ length: size }, () => []);
        this.boxes[0] = Array.from({ length: size }, (_, id) => id);
        this.history = [];
    }

    canMove(index) {
        return Number.isInteger(index) && (this.boxes[index]?.length ?? 0) >= 2;
    }

    neighbors(index) {
        const size = this.boxes.length;
        return [this.boxes[(index + size - 1) % size], this.boxes[(index + 1) % size]];
    }

    move(index) {
        if (!this.canMove(index)) return false;
        const source = this.boxes[index];
        const [left, right] = this.neighbors(index);
        right.push(source.pop());
        left.push(source.pop());
        this.history.push(index);
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        const index = this.history.pop();
        const [left, right] = this.neighbors(index);
        this.boxes[index].push(left.pop(), right.pop());
        return true;
    }

    get finished() {
        return this.boxes.every(box => box.length < 2);
    }
}
