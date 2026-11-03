import { SeatingGame } from "./seating-game.mjs";

const game = document.querySelector("#seat-game");
const row = document.querySelector("#seat-row");
const size = document.querySelector("#size");
const language = document.querySelector("#language");
const undo = document.querySelector("#undo");
const reset = document.querySelector("#reset");
const words = {
    en: {
        language: "言語", size: "Seats", guide: "Choose an empty seat. The number on each occupied seat shows when it was taken.",
        seated: "Seated", last: "Last score", total: "Total score", undo: "Undo", reset: "Reset",
        row: "Seats from left to right", empty: i => `Seat ${i}, empty`, taken: (i, t) => `Seat ${i}, taken on turn ${t}`,
        start: "Choose the first seat.", move: (i, pts) => `Seat ${i} earned ${pts} ${pts === 1 ? "point" : "points"}.`,
        complete: "All seats are occupied."
    },
    ja: {
        language: "Language", size: "席数", guide: "空席を押してください。着席した席の中の数字は、座った順番です。",
        seated: "着席人数", last: "今回の得点", total: "合計得点", undo: "1手戻す", reset: "リセット",
        row: "左から順に並んだ席", empty: i => `${i}番席、空席`, taken: (i, t) => `${i}番席、${t}人目が着席`,
        start: "最初の席を選んでください。", move: (i, pts) => `${i}番席に座り、${pts}点を得ました。`,
        complete: "全員が座りました。"
    }
};
let state;
function render() {
    const t = words[language.value];
    const last = state.moves.at(-1);
    game.lang = language.value;
    for (const el of game.querySelectorAll("[data-label]")) el.textContent = t[el.dataset.label];
    row.setAttribute("aria-label", t.row);
    for (const [i, button] of Array.from(row.children).entries()) {
        const turn = state.order[i];
        button.setAttribute("aria-disabled", String(Boolean(turn)));
        button.setAttribute("aria-label", turn ? t.taken(i + 1, turn) : t.empty(i + 1));
        button.firstElementChild.textContent = turn || "–";
        button.classList.toggle("in-block", !!last && i >= last.left && i <= last.right);
        button.classList.toggle("latest", i === last?.seat);
    }
    document.querySelector("#seated").textContent = `${state.moves.length} / ${state.order.length}`;
    document.querySelector("#points").textContent = last?.points ?? "–";
    document.querySelector("#total").textContent = state.total;
    const message = document.querySelector("#message");
    const full = state.moves.length === state.order.length;
    message.dataset.state = full ? "complete" : "";
    message.textContent = last ? [t.move(last.seat + 1, last.points), full ? t.complete : ""].join(" ").trim() : t.start;
    undo.disabled = reset.disabled = !last;
}
function restart() {
    state = new SeatingGame(Number(size.value));
    row.replaceChildren();
    state.order.forEach((_, i) => {
        const button = document.createElement("button");
        button.type = "button";
        const mark = document.createElement("b");
        mark.className = "seat-symbol";
        button.append(mark, String(i + 1));
        button.addEventListener("click", () => { if (state.sit(i)) render(); });
        row.append(button);
    });
    row.parentElement.scrollLeft = 0;
    render();
}
row.addEventListener("keydown", event => {
    const seats = Array.from(row.children);
    const at = seats.indexOf(event.target);
    if (at < 0) return;
    const next = { ArrowLeft: Math.max(0, at - 1), ArrowRight: Math.min(seats.length - 1, at + 1), Home: 0, End: seats.length - 1 };
    if (!(event.key in next)) return;
    event.preventDefault();
    seats[next[event.key]].focus();
});
language.addEventListener("change", render);
size.addEventListener("change", restart);
reset.addEventListener("click", restart);
undo.addEventListener("click", () => { state.undo(); render(); });
restart();
game.hidden = false;
