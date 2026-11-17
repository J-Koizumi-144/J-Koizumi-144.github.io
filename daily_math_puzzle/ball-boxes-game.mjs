export const MAX_PER_COLOR = 5;

export function shuffledBalls(n) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_PER_COLOR) throw new RangeError('Invalid size');
    const balls = [...Array(n).fill('red'), ...Array(n).fill('white')];
    for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    return balls;
}

export class BallBoxes {
    constructor(balls) {
        const n = balls.length / 2;
        if (!Number.isInteger(n) || n < 1 || n > MAX_PER_COLOR ||
            balls.filter(color => color === 'red').length !== n ||
            balls.filter(color => color === 'white').length !== n) throw new RangeError('Unbalanced row');
        this.balls = [...balls];
        this.startPlay();
    }

    startPlay() {
        this.editing = false;
        this.boxes = this.balls.map((color, start) => ({ start, size: 1, red: Number(color === 'red') }));
        this.selected = [];
        this.history = [];
    }

    startEditing() {
        this.editing = true;
        this.boxes = [];
        this.selected = [];
        this.history = [];
    }

    moveBall(from, to) {
        if (!this.editing || from === to ||
            ![from, to].every(i => Number.isInteger(i) && i >= 0 && i < this.balls.length)) return false;
        const [ball] = this.balls.splice(from, 1);
        this.balls.splice(to, 0, ball);
        return true;
    }

    selectBox(index) {
        if (this.editing || !Number.isInteger(index) || !this.boxes[index]) return;
        if (this.selected.includes(index)) {
            this.selected = this.selected.filter(i => i !== index);
        } else {
            this.selected = [...this.selected.slice(0, 1), index];
        }
    }

    canMergeAt(i) {
        const left = this.boxes[i];
        const right = this.boxes[i + 1];
        return Boolean(left && right && left.red * right.size <= right.red * left.size);
    }

    get selectionState() {
        if (!this.selected.length) return 'chooseTwo';
        if (this.selected.length === 1) return 'chooseSecond';
        const [a, b] = this.selected;
        if (Math.abs(a - b) !== 1) return 'notAdjacent';
        return this.canMergeAt(Math.min(a, b)) ? 'ready' : 'wrongRatio';
    }

    merge() {
        if (this.selectionState !== 'ready') return false;
        const i = Math.min(...this.selected);
        const [left, right] = this.boxes.slice(i, i + 2);
        const merged = { start: left.start, size: left.size + right.size, red: left.red + right.red };
        this.history.push(this.boxes);
        this.boxes = [...this.boxes.slice(0, i), merged, ...this.boxes.slice(i + 2)];
        this.selected = [];
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        this.boxes = this.history.pop();
        this.selected = [];
        return true;
    }

    get stuck() {
        return this.boxes.length > 1 && !this.boxes.some((_, i) => this.canMergeAt(i));
    }
}
