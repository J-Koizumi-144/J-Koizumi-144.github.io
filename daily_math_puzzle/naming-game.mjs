function randomNames(size) {
    return Array.from({ length: size }, (_, person) => {
        const choices = Array.from({ length: size }, (_, i) => i).filter(i => i !== person);
        const first = choices.splice(Math.floor(Math.random() * choices.length), 1)[0];
        const second = choices.splice(Math.floor(Math.random() * choices.length), 1)[0];
        return [first, second];
    });
}

export class NamingGame {
    constructor(n = 2, nominations = null) {
        if (!Number.isInteger(n) || n < 1 || n > 3) throw new RangeError('n must be 1, 2, or 3');
        this.n = n;
        this.size = 5 * n;
        this.names = nominations ? nominations.map(pair => [...pair]) : randomNames(this.size);
        if (this.names.length !== this.size || this.names.some((pair, person) =>
            pair.length !== 2 || pair[0] === pair[1] || pair.some(target =>
                !Number.isInteger(target) || target < 0 || target >= this.size || target === person))) {
            throw new RangeError('Each person must name two distinct other people');
        }
        this.group = Array(this.size).fill(false);
        this.initial = this.snapshot();
        this.history = [];
    }

    snapshot() {
        return { names: this.names.map(pair => [...pair]), group: [...this.group] };
    }

    restore(state) {
        this.names = state.names.map(pair => [...pair]);
        this.group = [...state.group];
    }

    name(person, slot, target) {
        if (!Number.isInteger(person) || person < 0 || person >= this.size ||
            ![0, 1].includes(slot) || !Number.isInteger(target) || target < 0 ||
            target >= this.size || target === person || target === this.names[person][1 - slot]) return false;
        if (this.names[person][slot] === target) return false;
        this.history.push(this.snapshot());
        this.names[person][slot] = target;
        this.group.fill(false);
        return true;
    }

    toggleName(person, target) {
        if (!Number.isInteger(person) || person < 0 || person >= this.size ||
            !Number.isInteger(target) || target < 0 || target >= this.size || target === person) return false;
        const targets = this.names[person];
        if (!targets.includes(target) && targets.length === 2) return false;
        this.history.push(this.snapshot());
        this.names[person] = targets.includes(target) ? targets.filter(name => name !== target) : [...targets, target];
        this.group.fill(false);
        return true;
    }

    randomize() {
        const names = randomNames(this.size);
        if (names.every((pair, person) => pair.length === this.names[person].length &&
            pair.every(target => this.names[person].includes(target)))) {
            const alternatives = Array.from({ length: this.size }, (_, i) => i)
                .filter(target => target !== 0 && !names[0].includes(target));
            names[0][0] = alternatives[Math.floor(Math.random() * alternatives.length)];
        }
        this.history.push(this.snapshot());
        this.names = names;
        this.group.fill(false);
        return true;
    }

    clearGroup() {
        if (!this.group.some(Boolean)) return false;
        this.history.push(this.snapshot());
        this.group.fill(false);
        return true;
    }

    groupBlockReason(person) {
        if (!Number.isInteger(person) || person < 0 || person >= this.size) return 'invalid';
        if (this.group[person]) return null;
        if (this.group.some((member, other) => member && this.names[other].includes(person))) return 'named';
        if (this.names[person].some(other => this.group[other])) return 'names';
        return null;
    }

    toggle(person) {
        if (!Number.isInteger(person) || person < 0 || person >= this.size) return false;
        if (!this.group[person] && this.groupBlockReason(person)) return false;
        this.history.push(this.snapshot());
        this.group[person] = !this.group[person];
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        this.restore(this.history.pop());
        return true;
    }

    reset() {
        if (!this.history.length) return false;
        this.restore(this.initial);
        this.history = [];
        return true;
    }

    get analysis() {
        const selected = this.group.filter(Boolean).length;
        return { selected, valid: selected > 0 && this.names.every(targets => targets.length === 2) };
    }
}
