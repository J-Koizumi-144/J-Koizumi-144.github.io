import { analyze, act } from './spreading-game.mjs';

// Advance one legal cell per frame without accumulating missed frames.
export class SpreadingPlayback {
    constructor(readState, commit, render) {
        this.readState = readState;
        this.commit = commit;
        this.render = render;
        this.running = false;
        this.timer = null;
        this.generation = 0;
    }
    start() {
        if (this.running) return;
        const state = this.readState();
        if (state.phase !== 'grow' || !analyze(state).available) return;
        this.running = true;
        this.schedule();
    }
    stop() {
        clearTimeout(this.timer);
        this.timer = null;
        this.running = false;
        this.generation++;
    }
    schedule() {
        const generation = this.generation;
        this.timer = setTimeout(() => {
            if (!this.running || generation !== this.generation) return;
            this.timer = null;
            const state = this.readState();
            const index = state.phase === 'grow' ? analyze(state).legal.findIndex(Boolean) : -1;
            if (index < 0) {
                this.stop();
            } else {
                this.commit(act(state, 'cell', index));
                if (analyze(this.readState()).available) this.schedule();
                else this.stop();
            }
            this.render();
        }, 200);
    }
}
