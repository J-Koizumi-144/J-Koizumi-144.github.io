export const MIN_PEOPLE = 3;
export const MAX_PEOPLE = 12;

export function pairKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export class PhotoGame {
    constructor(n = 6) {
        if (!Number.isInteger(n) || n < MIN_PEOPLE || n > MAX_PEOPLE) {
            throw new RangeError(`Choose ${MIN_PEOPLE} to ${MAX_PEOPLE} people.`);
        }
        this.n = n;
        this.selected = [];
        this.photos = [];
        this.remaining = new Set();
        for (let a = 1; a <= n; a++) {
            for (let b = a + 1; b <= n; b++) this.remaining.add(pairKey(a, b));
        }
    }

    toggle(person) {
        if (!Number.isInteger(person) || person < 1 || person > this.n) return false;
        const index = this.selected.indexOf(person);
        if (index === -1) this.selected.push(person);
        else this.selected.splice(index, 1);
        return true;
    }

    clearSelection() {
        this.selected = [];
    }

    get conflicts() {
        const selected = [...this.selected].sort((a, b) => a - b);
        const result = [];
        for (let i = 0; i < selected.length; i++) {
            for (let j = i + 1; j < selected.length; j++) {
                if (!this.remaining.has(pairKey(selected[i], selected[j]))) {
                    result.push([selected[i], selected[j]]);
                }
            }
        }
        return result;
    }

    get issue() {
        if (this.selected.length < 2) return 'too-few';
        if (this.conflicts.length) return 'already-together';
        if (this.selected.length === this.n) return 'everyone';
        return null;
    }

    get canTakePhoto() {
        return this.issue === null;
    }

    get complete() {
        return this.remaining.size === 0;
    }

    takePhoto() {
        if (!this.canTakePhoto) return false;
        const photo = [...this.selected];
        for (let i = 0; i < photo.length; i++) {
            for (let j = i + 1; j < photo.length; j++) {
                this.remaining.delete(pairKey(photo[i], photo[j]));
            }
        }
        this.photos.push(photo);
        this.clearSelection();
        return true;
    }

    undo() {
        const photo = this.photos.pop();
        if (!photo) return false;
        for (let i = 0; i < photo.length; i++) {
            for (let j = i + 1; j < photo.length; j++) {
                this.remaining.add(pairKey(photo[i], photo[j]));
            }
        }
        this.selected = [...photo];
        return true;
    }
}
