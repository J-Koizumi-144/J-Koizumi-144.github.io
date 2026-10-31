export class ChocolateGame {
    constructor(size = 4) {
        if (!Number.isInteger(size) || size < 2 || size > 10) throw new RangeError('Invalid size');
        this.size = size;
        this.reset();
    }

    reset() {
        this.pieces = [{ x: 0, y: 0, w: this.size, h: this.size }];
        this.equal = 0;
        this.history = [];
    }

    split(index, axis, offset) {
        const p = Number.isInteger(index) && this.pieces[index];
        if (!p || !['vertical', 'horizontal'].includes(axis) || !Number.isInteger(offset)) return false;
        const length = axis === 'vertical' ? p.w : p.h;
        if (offset <= 0 || offset >= length) return false;
        this.history.push({ pieces: this.pieces.map(piece => ({ ...piece })), equal: this.equal, index });
        const parts = axis === 'vertical'
            ? [{ ...p, w: offset }, { ...p, x: p.x + offset, w: p.w - offset }]
            : [{ ...p, h: offset }, { ...p, y: p.y + offset, h: p.h - offset }];
        this.pieces = [...this.pieces.slice(0, index), ...parts, ...this.pieces.slice(index + 1)];
        if (offset * 2 === length) this.equal++;
        return true;
    }

    undo() {
        const previous = this.history.pop();
        if (!previous) return null;
        this.pieces = previous.pieces;
        this.equal = previous.equal;
        return previous.index;
    }

    get analysis() {
        const singles = this.pieces.filter(p => p.w === 1 && p.h === 1).length;
        return { moves: this.history.length, equal: this.equal, pieces: this.pieces.length,
            singles, complete: singles === this.size * this.size };
    }
}
