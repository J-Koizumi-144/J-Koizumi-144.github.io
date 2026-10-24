export const CLUBS = 'ABCDEFG';
export const clubsOf = mask => Array.from({ length: 7 }, (_, i) => i).filter(i => mask & (1 << i));
export function validMembership(mask) {
    return Number.isInteger(mask) && mask > 0 && mask < 128 && clubsOf(mask).length <= 3;
}
export class ClubGame {
    constructor() { this.reset(); }
    reset() { this.counts = Array(128).fill(0); this.history = []; }
    change(mask, delta) {
        if (!validMembership(mask) || ![1, -1].includes(delta)) return false;
        const next = this.counts[mask] + delta;
        if (next < 0 || !Number.isSafeInteger(next) || (delta > 0 && this.analysis.total >= Number.MAX_SAFE_INTEGER)) return false;
        this.history.push({ mask, delta }); this.counts[mask] = next;
        return true;
    }
    undo() {
        const action = this.history.pop();
        if (!action) return false;
        this.counts[action.mask] -= action.delta; return true;
    }
    get analysis() {
        const sizes = Array(7).fill(0);
        const pairs = Array.from({ length: 7 }, () => Array(7).fill(0));
        let total = 0;
        for (let mask = 1; mask < 128; mask++) {
            const count = this.counts[mask];
            if (!count) continue;
            total += count;
            const members = clubsOf(mask);
            members.forEach(i => { sizes[i] += count; });
            for (let a = 0; a < members.length; a++) for (let b = a + 1; b < members.length; b++) {
                const i = members[a], j = members[b];
                pairs[i][j] += count; pairs[j][i] += count;
            }
        }
        let exactPairs = 0;
        for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) if (pairs[i][j] === 1) exactPairs++;
        const distinct = new Set(sizes).size;
        return { sizes, pairs, total, exactPairs, distinct, complete: distinct === 7 && exactPairs === 21 };
    }
}
