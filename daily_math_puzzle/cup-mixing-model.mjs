function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }
export function fraction(p, q = 1n) {
    if (q <= 0n) throw new RangeError('Positive denominator required.');
    const d = gcd(p, q); return Object.freeze({ p: p / d, q: q / d });
}
export function average(values) {
    let p = 0n, q = 1n;
    for (const v of values) { const r = fraction(p * v.q + v.p * q, q * v.q); p = r.p; q = r.q; }
    return fraction(p, q * BigInt(values.length));
}
export function exactText(v) { return v.q === 1n ? `${v.p}%` : `${v.p}/${v.q}%`; }
export class CupMixing {
    constructor(n = 6, initial) {
        if (!Number.isInteger(n) || n < 2 || n > 16) throw new RangeError('Choose 2–16 cups.');
        if (initial && (initial.length !== n || initial.some(x => x !== 6 && x !== 12))) throw new RangeError('Use 6% or 12%.');
        this.n = n; this.initial = initial ? [...initial] : Array.from({length:n}, (_, i) => i % 2 ? 12 : 6);
        this.values = this.initial.map(x => fraction(BigInt(x))); this.phase = 'setup';
        this.selected = []; this.tripleUsed = false; this.moves = 0; this.history = [];
    }
    snapshot() { return {initial:[...this.initial], values:[...this.values], tripleUsed:this.tripleUsed, moves:this.moves}; }
    toggle(i) {
        if (this.phase !== 'setup' || !Number.isInteger(i) || i < 0 || i >= this.n) return false;
        this.history.push(this.snapshot()); this.initial[i] = this.initial[i] === 6 ? 12 : 6;
        this.values[i] = fraction(BigInt(this.initial[i])); return true;
    }
    start() { if (this.phase !== 'setup') return false; this.phase = 'mix'; this.history = []; return true; }
    select(i) {
        if (this.phase !== 'mix' || !Number.isInteger(i) || i < 0 || i >= this.n) return false;
        if (this.selected.includes(i)) this.selected = this.selected.filter(x => x !== i);
        else if (this.selected.length < (this.tripleUsed ? 2 : 3)) this.selected.push(i);
        else return false;
        return true;
    }
    get canMix() { return this.phase === 'mix' && (this.selected.length === 2 || (this.selected.length === 3 && !this.tripleUsed)); }
    get equal() { return this.values.every(v => v.p === this.values[0].p && v.q === this.values[0].q); }
    mix() {
        if (!this.canMix) return false;
        this.history.push(this.snapshot()); const v = average(this.selected.map(i => this.values[i]));
        for (const i of this.selected) this.values[i] = v;
        if (this.selected.length === 3) this.tripleUsed = true;
        this.moves++; this.selected = []; return true;
    }
    undo() { const s = this.history.pop(); if (!s) return false; Object.assign(this, s); this.selected = []; return true; }
}
