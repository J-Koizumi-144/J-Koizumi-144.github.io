export const MIN_STATIONS = 6;
export const MAX_STATIONS = 12;

export function routeFromCounts(counts) {
    const size = counts.length + counts.reduce((sum, count) => sum + count, 0);
    if (!counts.length || counts.some(count => !Number.isInteger(count) || count < 0) ||
        size < 2 || size > MAX_STATIONS) throw new RangeError('Invalid route');

    const tracks = [];
    let nextStation = counts.length;
    const branches = counts.map((count, main) => {
        if (main > 0) tracks.push([main - 1, main]);
        return Array.from({ length: count }, () => {
            const end = nextStation++;
            tracks.push([main, end]);
            return end;
        });
    });
    return { size, branches, tracks };
}

export function randomRoute(size, previous = null, random = Math.random) {
    if (!Number.isInteger(size) || size < MIN_STATIONS || size > MAX_STATIONS) {
        throw new RangeError('Invalid station count');
    }
    const choices = [];
    function collect(remaining, counts) {
        if (remaining === 0) {
            const same = previous?.branches.length === counts.length &&
                counts.every((count, i) => count === previous.branches[i].length);
            if (!same) choices.push(counts);
            return;
        }
        // Each group uses one main-line station plus a terminal for each branch.
        for (let branches = 1; branches <= 4 && 1 + branches <= remaining; branches++) {
            collect(remaining - 1 - branches, [...counts, branches]);
        }
    }
    collect(size, []);
    return routeFromCounts(choices[Math.floor(random() * choices.length)]);
}

export class Numbering {
    constructor(route) {
        this.route = route;
        this.numbers = Array(route.size).fill(null);
        this.history = [];
    }

    setNumber(station, number) {
        if (!Number.isInteger(station) || station < 0 || station >= this.numbers.length) return false;
        if (number !== null && (!Number.isInteger(number) || number < 1 ||
            number > this.numbers.length || this.numbers.includes(number))) return false;
        if (this.numbers[station] === number) return false;
        const next = this.numbers.slice();
        next[station] = number;
        this.history.push(this.numbers);
        this.numbers = next;
        return true;
    }

    reset() {
        if (this.numbers.every(number => number === null)) return false;
        this.history.push(this.numbers);
        this.numbers = Array(this.route.size).fill(null);
        return true;
    }

    undo() {
        if (!this.history.length) return false;
        this.numbers = this.history.pop();
        return true;
    }
}

export function inspectFares(route, numbers) {
    const counts = new Map();
    const fares = route.tracks.map(([a, b]) => {
        if (numbers[a] === null || numbers[b] === null) return null;
        const fare = Math.abs(numbers[a] - numbers[b]);
        counts.set(fare, (counts.get(fare) || 0) + 1);
        return fare;
    });
    const repeated = [...counts.keys()].filter(fare => counts.get(fare) > 1).sort((a, b) => a - b);
    const placed = numbers.filter(number => number !== null).length;
    return { fares, repeated, placed, distinct: counts.size,
        complete: placed === route.size && counts.size === route.tracks.length };
}
