export const GRID_SIZES = [2, 4, 6, 8];

export class PaintGrid {
    constructor(size = 4) {
        if (!GRID_SIZES.includes(size)) throw new RangeError('Unsupported grid size');
        this.size = size;
        this.moves = [];
        this.turns = new Map([
            ['row', Array(size).fill(0)],
            ['column', Array(size).fill(0)],
        ]);
    }

    canPaint(axis, index) {
        return Number.isInteger(index) && this.turns.get(axis)?.[index] === 0;
    }

    paint(axis, index) {
        if (!this.canPaint(axis, index)) return false;
        this.moves.push({ axis, index });
        this.turns.get(axis)[index] = this.moves.length;
        return true;
    }

    undo() {
        const move = this.moves.pop();
        if (!move) return;
        this.turns.get(move.axis)[move.index] = 0;
        return move;
    }

    reset() {
        this.moves.length = 0;
        for (const times of this.turns.values()) times.fill(0);
    }

    get complete() {
        return this.moves.length === 2 * this.size;
    }

    colors() {
        const columns = this.turns.get('column');
        return this.turns.get('row').map(rowTurn => columns.map(columnTurn => {
            if (rowTurn > columnTurn) return 'red';
            if (columnTurn > 0) return 'blue';
            return 'white';
        }));
    }
}

// Store each boundary on the lower or right-hand cell that touches it.
export function boundaryEdges(colors) {
    const edges = [];
    for (const [row, line] of colors.entries()) {
        for (const [column, color] of line.entries()) {
            if (color === 'white') continue;
            const other = color === 'red' ? 'blue' : 'red';
            if (row > 0 && colors[row - 1][column] === other) {
                edges.push({ row, column, side: 'top' });
            }
            if (column > 0 && line[column - 1] === other) {
                edges.push({ row, column, side: 'left' });
            }
        }
    }
    return edges;
}
