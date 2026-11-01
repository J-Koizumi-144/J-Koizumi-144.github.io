export class PenGame {
    constructor(size) {
        if (!Number.isInteger(size) || size < 2 || size > 8) throw new RangeError('Invalid grid size');
        this.size = size;
        this.strokes = [];
        this.down = false;
        this.history = [];
    }

    get current() { return this.down ? this.strokes.at(-1) : []; }
    get edgeCount() { return this.strokes.reduce((count, path) => count + path.length - 1, 0); }
    get totalEdges() { return 2 * this.size * (this.size + 1); }
    get strokeCount() { return this.strokes.filter(path => path.length > 1).length; }

    neighbors(point) {
        const width = this.size + 1;
        const x = point % width, y = Math.floor(point / width);
        const result = [];
        if (x > 0) result.push(point - 1);
        if (x < this.size) result.push(point + 1);
        if (y > 0) result.push(point - width);
        if (y < this.size) result.push(point + width);
        return result;
    }

    used(a, b) {
        return this.strokes.some(path => path.some((point, i) => i > 0 &&
            ((point === a && path[i - 1] === b) || (point === b && path[i - 1] === a))));
    }

    canSelect(point) {
        const width = this.size + 1;
        if (!Number.isInteger(point) || point < 0 || point >= width * width) return false;
        const path = this.current;
        if (!path.length) return this.neighbors(point).some(next => !this.used(point, next));
        const tip = path.at(-1);
        if (!this.neighbors(tip).includes(point) || this.used(tip, point)) return false;
        if (path.length === 1) return true;
        const from = path.at(-2);
        const dx = tip % width - from % width;
        const dy = Math.floor(tip / width) - Math.floor(from / width);
        return point === tip - dy + dx * width;
    }

    select(point) {
        if (!this.canSelect(point)) return false;
        this.history.push([this.strokes, this.down]);
        this.strokes = this.down
            ? [...this.strokes.slice(0, -1), [...this.current, point]]
            : [...this.strokes, [point]];
        this.down = true;
        return true;
    }

    lift() {
        if (!this.down) return false;
        this.history.push([this.strokes, this.down]);
        if (this.current.length === 1) this.strokes = this.strokes.slice(0, -1);
        this.down = false;
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        [this.strokes, this.down] = this.history.pop();
        return true;
    }
}
