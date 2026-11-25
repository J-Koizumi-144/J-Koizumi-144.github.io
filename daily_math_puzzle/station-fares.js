import { MIN_STATIONS, MAX_STATIONS, randomRoute, Numbering, inspectFares } from './station-fares-model.mjs';

const root = document.getElementById('station-fares');
const get = id => root.querySelector('#rail-' + id);
const map = get('map');
const tracks = get('tracks');
const tray = get('cards');
const sizeSelect = get('size');
const languageSelect = get('language');
const words = {
    en: {
        stations: 'Stations', newMap: 'New map', language: '言語', distinct: 'Distinct fares',
        cards: 'Number cards', remove: 'Remove number', undo: 'Undo', reset: 'Reset numbers',
        map: 'Route map', help: 'Choose a number card, then a station.',
        edit: 'Choose a card to place, or select a numbered station to remove its number.',
        full: 'Select a station to return its number card.',
        place: n => 'Card ' + n + ' selected. Choose a station.',
        unplace: n => 'Station number ' + n + ' selected. Use “Remove number” to return the card.',
        stock: n => n + ' available', repeat: ns => 'Repeated ' + (ns.length === 1 ? 'fare ' : 'fares ') + ns.join(', '),
        complete: 'All fares are different!', main: i => 'Main-line station ' + i,
        branch: (i, j) => 'Branch ' + j + ' at main-line station ' + i,
        number: n => n === null ? 'unnumbered' : 'number ' + n,
        card: (n, used) => 'Card ' + n + (used ? ', in use' : ''),
        fare: n => n === null ? 'fare undetermined' : 'fare ' + n,
    },
    ja: {
        stations: '駅数', newMap: '新しい路線図', language: 'Language', distinct: '異なる料金',
        cards: '番号カード', remove: '番号を外す', undo: '1手戻す', reset: '番号をリセット',
        map: '路線図', help: '番号カードを選び，次に駅を押してください．',
        edit: '番号を付けるにはカードを，外すには番号の付いた駅を選んでください．',
        full: 'カードを戻すには駅を選んでください．',
        place: n => 'カード ' + n + ' を選択中です．番号を付ける駅を押してください．',
        unplace: n => '番号 ' + n + ' の駅を選択中です．「番号を外す」でカードが戻ります．',
        stock: n => '残り ' + n + ' 枚', repeat: ns => '重複する料金　' + ns.join('，'),
        complete: 'すべての線路の料金が異なります！', main: i => '本線の' + i + '番目の駅',
        branch: (i, j) => '本線の' + i + '番目の駅につながる支線の終点' + j,
        number: n => n === null ? '番号なし' : '番号' + n,
        card: (n, used) => '番号カード' + n + (used ? '，使用中' : ''),
        fare: n => n === null ? '料金未定' : '料金' + n,
    },
};

let game;
let chosenCard = null;
let chosenStation = null;
let stationButtons = [];
let cardButtons = [];
let points = [];
let trackLayout = [];
let mapWidth = 0;
const copy = () => words[languageSelect.value];

function clearSelection() {
    chosenCard = null;
    chosenStation = null;
}

function createMap() {
    game = new Numbering(randomRoute(Number(sizeSelect.value), game?.route));
    clearSelection();
    for (const button of stationButtons) button.remove();
    tray.replaceChildren();
    stationButtons = Array.from({ length: game.route.size }, (_, station) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rail-station';
        button.classList.toggle('main-station', station < game.route.branches.length);
        button.dataset.station = station;
        const disc = document.createElement('span');
        disc.className = 'station-disc';
        disc.setAttribute('aria-hidden', 'true');
        button.append(disc);
        map.append(button);
        return button;
    });
    cardButtons = stationButtons.map((_, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'number-card';
        button.dataset.card = i + 1;
        button.textContent = i + 1;
        tray.append(button);
        return button;
    });
    layoutMap();
    render();
}

function layoutMap() {
    mapWidth = map.clientWidth;
    const groups = game.route.branches;
    const terminalCount = game.route.size - groups.length;
    const pitch = Math.max(1, Math.min(104, (mapWidth - 52) / (terminalCount - 1)));
    const left = (mapWidth - (terminalCount - 1) * pitch) / 2;
    const xs = Array(game.route.size);
    let column = 0;
    groups.forEach((leaves, main) => {
        // Keep siblings together and center their main-line station above them.
        xs[main] = left + (column + (leaves.length - 1) / 2) * pitch;
        for (const station of leaves) xs[station] = left + column++ * pitch;
    });

    const mainPitch = Math.min(...groups.slice(1).map((_, i) => xs[i + 1] - xs[i]));
    const mainDiameter = stationButtons[0].firstElementChild.offsetWidth;
    const terminalDiameter = stationButtons[groups.length].firstElementChild.offsetWidth;
    const mainScale = Math.min(1, mainPitch / (mainDiameter + 6));
    const terminalScale = Math.min(mainScale, pitch / (terminalDiameter + 6));
    map.style.setProperty('--rail-main-scale', mainScale);
    map.style.setProperty('--rail-station-scale', terminalScale);
    map.style.setProperty('--rail-main-hit-width', Math.min(44, mainPitch) + 'px');
    map.style.setProperty('--rail-hit-width', Math.min(44, pitch) + 'px');

    const widestFare = game.route.size >= 12 ? 41 : 34;
    const mainSize = mainDiameter * mainScale;
    const fareLift = mainSize / 2 + 16;
    const mainY = mainPitch < mainSize + widestFare + 8 ? fareLift + 16 : 32;
    const widestFan = (Math.max(...groups.map(leaves => leaves.length)) - 1) * pitch / 2;
    const bendY = mainY + Math.max(30, Math.min(76, 0.65 * widestFan));
    const staggerFares = pitch < widestFare + 5;
    const terminalY = bendY + (staggerFares ? 86 : 60);
    const height = terminalY + 30;
    map.style.height = height + 'px';
    tracks.setAttribute('viewBox', '0 0 ' + mapWidth + ' ' + height);
    points = xs.map((x, station) => ({ x, y: station < groups.length ? mainY : terminalY }));
    points.forEach((point, station) => {
        stationButtons[station].style.left = point.x + 'px';
        stationButtons[station].style.top = point.y + 'px';
    });

    trackLayout = game.route.tracks.map(([a, b]) => {
        if (b < groups.length) {
            return { x: (xs[a] + xs[b]) / 2, y: mainY, raisedY: mainY - fareLift,
                inlineSpace: xs[b] - xs[a] - mainSize - 8, maxWidth: Math.max(1, mainPitch - 4) };
        }
        // Draw the fare on its own vertical track. Alternate tag heights in narrow columns.
        const lower = staggerFares && (b - groups.length) % 2 === 1;
        return { x: xs[b], y: bendY + (lower ? 48 : 22), bendY,
            maxWidth: Math.max(1, (staggerFares ? 2 : 1) * pitch - 4) };
    });
}

function svgElement(name, attributes) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
}

function drawTracks(result, names) {
    const lines = document.createDocumentFragment();
    const tags = document.createDocumentFragment();
    const descriptions = [];
    game.route.tracks.forEach(([a, b], index) => {
        const p = points[a], q = points[b];
        const main = b < game.route.branches.length;
        const fare = result.fares[index];
        const repeated = result.repeated.includes(fare);
        const layout = trackLayout[index];
        const line = main ? svgElement('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y }) :
            svgElement('polyline', { points: [p.x, p.y, q.x, layout.bendY, q.x, q.y].join(' ') });
        line.classList.add('track');
        line.classList.toggle('main', main);
        line.classList.toggle('priced', fare !== null);
        line.classList.toggle('repeated', repeated);
        lines.append(line);
        descriptions.push(names[a] + ' – ' + names[b] + ', ' + copy().fare(fare));
        if (fare === null) return;

        const label = String(fare);
        const width = 14 + label.length * 7 + (repeated ? 13 : 0);
        const { x } = layout;
        const y = main && width > layout.inlineSpace ? layout.raisedY : layout.y;
        const scale = Math.min(1, layout.maxWidth / width);
        if (y !== layout.y) {
            lines.append(svgElement('line', { class: 'fare-leader', x1: x, y1: layout.y, x2: x, y2: y }));
        }
        const tag = svgElement('g', { class: repeated ? 'fare-tag repeated' : 'fare-tag',
            transform: 'translate(' + x + ' ' + y + ') scale(' + scale + ')' });
        tag.append(svgElement('rect', { x: -width / 2, y: -10, width, height: 20, rx: 5 }));
        if (repeated) {
            const warning = svgElement('path', { class: 'fare-warning',
                transform: 'translate(' + (9 - width / 2) + ' 0)',
                d: 'M0 -5.5 5.5 4.5h-11Z M0 -2v2.5 M0 2.3v.3' });
            tag.append(warning);
        }
        const text = svgElement('text', { x: repeated ? 6.5 : 0, y: 0 });
        text.textContent = label;
        tag.append(text);
        tags.append(tag);
    });
    tracks.replaceChildren(lines, tags);
    tracks.setAttribute('aria-label', descriptions.join('. '));
}

function render() {
    const w = copy();
    const result = inspectFares(game.route, game.numbers);
    root.lang = languageSelect.value;
    for (const el of root.querySelectorAll('[data-copy]')) el.textContent = w[el.dataset.copy];
    root.querySelector('[data-copy="language"]').lang = root.lang === 'en' ? 'ja' : 'en';
    map.setAttribute('aria-label', w.map);
    const names = [];
    game.route.branches.forEach((leaves, i) => {
        names[i] = w.main(i + 1);
        leaves.forEach((station, j) => { names[station] = w.branch(i + 1, j + 1); });
    });
    stationButtons.forEach((button, station) => {
        const number = game.numbers[station];
        button.firstChild.textContent = number ?? '';
        button.classList.toggle('numbered', number !== null);
        button.setAttribute('aria-label', names[station] + ', ' + w.number(number));
        button.setAttribute('aria-pressed', chosenStation === station);
    });
    cardButtons.forEach((button, i) => {
        const number = i + 1;
        button.disabled = game.numbers.includes(number);
        button.setAttribute('aria-pressed', number === chosenCard);
        button.setAttribute('aria-label', w.card(number, button.disabled));
    });
    drawTracks(result, names);
    get('tally').textContent = result.distinct + ' / ' + game.route.tracks.length;
    const status = get('result');
    status.dataset.state = result.complete ? 'complete' : result.repeated.length ? 'duplicate' : '';
    status.textContent = result.complete ? w.complete : result.repeated.length ? w.repeat(result.repeated) : '';
    get('stock').textContent = w.stock(game.route.size - result.placed);
    let instruction = result.placed === 0 ? w.help : w.edit;
    if (result.placed === game.route.size) instruction = w.full;
    if (chosenCard !== null) instruction = w.place(chosenCard);
    if (chosenStation !== null) instruction = w.unplace(game.numbers[chosenStation]);
    get('instruction').textContent = instruction;
    get('remove').disabled = chosenStation === null;
    get('undo').disabled = game.history.length === 0;
    get('reset').disabled = result.placed === 0;
}

tray.addEventListener('click', event => {
    const button = event.target.closest('button[data-card]');
    if (!button || button.disabled) return;
    const number = Number(button.dataset.card);
    chosenCard = chosenCard === number ? null : number;
    chosenStation = null;
    render();
});

map.addEventListener('click', event => {
    const button = event.target.closest('button[data-station]');
    if (!button) return;
    const station = Number(button.dataset.station);
    if (chosenCard !== null) {
        game.setNumber(station, chosenCard);
        clearSelection();
    } else {
        chosenStation = game.numbers[station] !== null && chosenStation !== station ? station : null;
    }
    render();
});

get('remove').addEventListener('click', () => {
    if (chosenStation === null) return;
    const number = game.numbers[chosenStation];
    game.setNumber(chosenStation, null);
    clearSelection();
    render();
    cardButtons[number - 1].focus({ preventScroll: true });
});

for (const action of ['undo', 'reset']) {
    get(action).addEventListener('click', () => {
        game[action]();
        clearSelection();
        render();
        if (get(action).disabled) cardButtons.find(button => !button.disabled)?.focus({ preventScroll: true });
    });
}
get('new').addEventListener('click', createMap);
sizeSelect.addEventListener('change', createMap);
languageSelect.addEventListener('change', render);

root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        clearSelection();
        render();
        return;
    }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    const origin = event.target;
    const candidates = origin.matches('.rail-station') ? stationButtons :
        origin.matches('.number-card') ? cardButtons : [];
    if (!candidates.length) return;
    event.preventDefault();
    const box = origin.getBoundingClientRect();
    let best = null;
    let distance = Infinity;
    for (const button of candidates) {
        if (button === origin || button.disabled) continue;
        const other = button.getBoundingClientRect();
        const dx = other.x + other.width / 2 - box.x - box.width / 2;
        const dy = other.y + other.height / 2 - box.y - box.height / 2;
        const forward = dx * direction[0] + dy * direction[1];
        const sideways = Math.abs(dx * direction[1] - dy * direction[0]);
        if (forward > 1 && sideways <= forward * 1.5 && forward + 3 * sideways < distance) {
            best = button;
            distance = forward + 3 * sideways;
        }
    }
    best?.focus();
});

for (let n = MIN_STATIONS; n <= MAX_STATIONS; n++) sizeSelect.add(new Option(n, n));
sizeSelect.value = '7';
root.hidden = false;
createMap();
new ResizeObserver(() => {
    if (map.clientWidth === mapWidth) return;
    layoutMap();
    render();
}).observe(map);
