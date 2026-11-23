export const MIN_GROUPS = 2;
export const MAX_GROUPS = 8;
export const TOTAL_MINUTES = 60;
const EPSILON = 1e-8;

export function validateGroups(groups) {
    const sumA = groups.reduce((sum, group) => sum + group.a, 0);
    const sumB = groups.reduce((sum, group) => sum + group.b, 0);
    const invalid = groups.filter(group => ![group.a, group.b].every(value =>
        Number.isFinite(value) && value >= 0 && value <= TOTAL_MINUTES));
    const tooLong = groups.filter(group => group.a + group.b > TOTAL_MINUTES + EPSILON);
    const countValid = groups.length >= MIN_GROUPS && groups.length <= MAX_GROUPS;
    const idsValid = groups.every((group, index) => group.id === index + 1);
    const totalsValid = Math.abs(sumA - TOTAL_MINUTES) < EPSILON && Math.abs(sumB - TOTAL_MINUTES) < EPSILON;
    return { valid: countValid && idsValid && !invalid.length && !tooLong.length && totalsValid,
        sumA, sumB, invalid: invalid.map(group => group.id), tooLong: tooLong.map(group => group.id) };
}

export function cloneState(state) {
    return {
        groups: state.groups.map(group => ({ ...group })),
        initialGroups: state.initialGroups.map(group => ({ ...group })),
        orders: { A: [...state.orders.A], B: [...state.orders.B] },
    };
}

export function createState(groups) {
    if (!validateGroups(groups).valid) throw new RangeError('Invalid requested times');
    return {
        groups: groups.map(group => ({ ...group })),
        initialGroups: groups.map(group => ({ ...group })),
        orders: { A: groups.map(group => group.id), B: groups.map(group => group.id) },
    };
}

export function initialGroups() {
    return [[18, 11], [9, 16], [14, 8], [11, 10], [8, 15]].map(([a, b], index) => ({ id: index + 1, a, b }));
}

export function randomGroups(count, random = Math.random) {
    if (!Number.isInteger(count) || count < MIN_GROUPS || count > MAX_GROUPS) throw new RangeError('Invalid group count');
    const distribute = capacities => {
        const values = Array(count).fill(1);
        const weights = Array.from({ length: count }, () => 0.1 + random() ** 2);
        for (let minute = count; minute < TOTAL_MINUTES; minute++) {
            const eligible = values.map((value, index) => value < capacities[index] ? index : -1).filter(index => index >= 0);
            let ticket = random() * eligible.reduce((sum, index) => sum + weights[index], 0);
            let chosen = eligible.at(-1);
            for (const index of eligible) {
                ticket -= weights[index];
                if (ticket < 0) { chosen = index; break; }
            }
            values[chosen]++;
        }
        return values;
    };
    const a = distribute(Array(count).fill(TOTAL_MINUTES));
    const b = distribute(a.map(value => TOTAL_MINUTES - value));
    return a.map((value, index) => ({ id: index + 1, a: value, b: b[index] }));
}

export function moveGroup(state, room, id, targetIndex) {
    if (!['A', 'B'].includes(room)) throw new RangeError('Invalid room');
    const sourceIndex = state.orders[room].indexOf(id);
    if (sourceIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= state.groups.length) {
        throw new RangeError('Invalid move');
    }
    const next = cloneState(state);
    next.orders[room].splice(sourceIndex, 1);
    next.orders[room].splice(targetIndex, 0, id);
    return next;
}

export function resetState(state) {
    return createState(state.initialGroups);
}

export function sameState(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function inspectSchedule(state) {
    const rooms = {};
    for (const room of ['A', 'B']) {
        let start = 0;
        rooms[room] = state.orders[room].map(id => {
            const group = state.groups.find(item => item.id === id);
            const duration = group[room.toLowerCase()];
            const interval = { id, start, end: start + duration, duration };
            start = interval.end;
            return interval;
        });
    }
    const overlaps = [];
    for (const group of state.groups) {
        const a = rooms.A.find(item => item.id === group.id);
        const b = rooms.B.find(item => item.id === group.id);
        const start = Math.max(a.start, b.start);
        const end = Math.min(a.end, b.end);
        if (end - start > EPSILON) overlaps.push({ id: group.id, start, end, duration: end - start });
    }
    return { rooms, overlaps, overlapMinutes: overlaps.reduce((sum, item) => sum + item.duration, 0),
        complete: overlaps.length === 0 };
}
