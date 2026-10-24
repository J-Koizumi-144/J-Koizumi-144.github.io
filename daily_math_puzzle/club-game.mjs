export const CLUBS = 'ABCDEFG';
export const INITIAL_ROWS = 5;
export const MAX_ROWS = 100;
export const clubsOf = mask => Array.from({ length: 7 }, (_, i) => i).filter(i => mask & (1 << i));

export class ClubGame {
    constructor() { this.reset(); }
    reset() { this.rows = Array(INITIAL_ROWS).fill(0); this.history = []; }
    hasRow(row) { return Number.isInteger(row) && row >= 0 && row < this.rows.length; }
    canToggle(row, club) {
        if (!this.hasRow(row) || !Number.isInteger(club) || club < 0 || club >= 7) return false;
        return !!(this.rows[row] & (1 << club)) || clubsOf(this.rows[row]).length < 3;
    }
    toggle(row, club) {
        if (!this.canToggle(row, club)) return false;
        this.history.push({ type: 'toggle', row, club });
        this.rows[row] ^= 1 << club; return true;
    }
    add() {
        if (this.rows.length >= MAX_ROWS) return false;
        this.history.push({ type: 'add', row: this.rows.length });
        this.rows.push(0); return true;
    }
    remove(row) {
        if (!this.hasRow(row)) return false;
        this.history.push({ type: 'remove', row, mask: this.rows[row] });
        this.rows.splice(row, 1); return true;
    }
    undo() {
        const action = this.history.pop();
        if (!action) return false;
        if (action.type === 'toggle') this.rows[action.row] ^= 1 << action.club;
        else if (action.type === 'add') this.rows.pop();
        else this.rows.splice(action.row, 0, action.mask);
        return true;
    }
    get analysis() {
        const sizes = Array(7).fill(0);
        const pairs = Array.from({ length: 7 }, () => Array(7).fill(0));
        let total = 0;
        for (const mask of this.rows) {
            if (!mask) continue;
            total++;
            const members = clubsOf(mask);
            members.forEach(i => { sizes[i]++; });
            for (let a = 0; a < members.length; a++) for (let b = a + 1; b < members.length; b++) {
                const i = members[a], j = members[b];
                pairs[i][j]++; pairs[j][i]++;
            }
        }
        let exactPairs = 0;
        for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) if (pairs[i][j] === 1) exactPairs++;
        const distinct = new Set(sizes).size;
        return { sizes, pairs, total, empty: this.rows.length - total, exactPairs, distinct, complete: distinct === 7 && exactPairs === 21 };
    }
}
