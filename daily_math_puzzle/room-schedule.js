import { MIN_GROUPS, MAX_GROUPS, createState, initialGroups, randomGroups, cloneState, moveGroup, resetState, sameState, inspectSchedule } from './room-schedule-model.mjs';

const root = document.getElementById('room-schedule');
const $ = selector => root.querySelector(selector);
const palette = [
    ['#d8e7f4', '#416a8d'], ['#f6dfc7', '#93622e'], ['#d4e9df', '#39765d'], ['#e5def2', '#775b9a'],
    ['#f3dbe1', '#995269'], ['#e6e5c8', '#77702c'], ['#dfe7eb', '#526e80'], ['#ebddd2', '#8b6245'],
];
const copy = {
    en: {
        groups: 'Groups', language: '言語', roomA: 'Room A', roomB: 'Room B',
        instruction: 'Drag the groups to reorder each room.',
        keyboardHelp: 'Focus a group and use the arrow keys to move it. Home and End move it to the first and last positions.',
        schedule: 'Schedule', minutes: 'minutes',
        undo: 'Undo', reset: 'Reset', newTimes: 'Random times', minute: 'min',
        success: 'No overlaps.',
        conflict: ids => 'Overlapping groups: ' + ids.join(', '),
        card: (room, id, duration, position, count) => 'Room ' + room + ', group ' + id + ', ' + duration + ' minutes, position ' + position + ' of ' + count + '.',
        overlap: ' Usage times overlap.',
        dragTitle: 'Drag to reorder. Arrow keys also work.',
        interval: (room, id, start, end) => 'Room ' + room + ', group ' + id + ': ' + start + '–' + end + ' minutes',
        moved: (room, id, position) => 'Group ' + id + ' moved to position ' + position + ' in room ' + room + '.',
        newNotice: 'New requested times.', resetNotice: 'Starting order restored.', undoNotice: 'Previous state restored.',
    },
    ja: {
        groups: '団体数', language: 'Language', roomA: '部屋A', roomB: '部屋B',
        instruction: '団体をドラッグして、各部屋の順序を変えられます。',
        keyboardHelp: '団体にフォーカスし、矢印キーで移動できます。Home・Endキーで先頭・末尾に移動できます。',
        schedule: '予定表', minutes: '分',
        undo: '1手戻す', reset: 'リセット', newTimes: '時間をランダムに変更', minute: '分',
        success: '重なりはありません。',
        conflict: ids => '重なっている団体：' + ids.join('、'),
        card: (room, id, duration, position, count) => '部屋' + room + '、団体' + id + '、' + duration + '分、' + count + '団体中' + position + '番目。',
        overlap: '使用時間が重なっています。',
        dragTitle: 'ドラッグで移動。矢印キーでも移動できます。',
        interval: (room, id, start, end) => '部屋' + room + '、団体' + id + '：' + start + '〜' + end + '分',
        moved: (room, id, position) => '部屋' + room + 'の団体' + id + 'を' + position + '番目に移動しました。',
        newNotice: '希望時間を変更しました。', resetNotice: '最初の順序に戻しました。', undoNotice: '一つ前の状態に戻しました。',
    },
};
let language = 'en';
let state = createState(initialGroups());
let undoStack = [];
let drag = null;
const words = () => copy[language];
const number = value => new Intl.NumberFormat(language, { maximumFractionDigits: 6 }).format(value);
const color = id => '--fill:' + palette[id - 1][0] + ';--edge:' + palette[id - 1][1];
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const laneFor = room => $('#room-' + room.toLowerCase() + '-order');

for (let count = MIN_GROUPS; count <= MAX_GROUPS; count++) {
    $('#rooms-count').add(new Option(String(count), String(count)));
}

function remember(previous) {
    undoStack.push(cloneState(previous));
    if (undoStack.length > 100) undoStack.shift();
}

function commit(next, announcement) {
    cancelDrag();
    if (sameState(next, state)) return;
    remember(state);
    state = next;
    render();
    $('#rooms-announcement').textContent = announcement || '';
}

function drawTimeline(analysis) {
    const width = Math.max(210, $('#rooms-timeline').clientWidth);
    const left = 28, right = width - 16, plotWidth = right - left;
    const x = minute => left + minute / 60 * plotWidth;
    const y = { A: 35, B: 95 };
    const labels = [];
    let chart = '<svg viewBox="0 0 ' + width + ' 146" role="img" aria-label="TIMELINE_LABEL">';
    for (const tick of [0, 15, 30, 45, 60]) {
        chart += '<line x1="' + x(tick) + '" x2="' + x(tick) + '" y1="25" y2="132" stroke="#d7dcdd" stroke-width="1"/>' +
            '<text x="' + x(tick) + '" y="17" text-anchor="middle" font-size="14">' + tick + '</text>';
    }
    for (const room of ['A', 'B']) {
        chart += '<text x="2" y="' + (y[room] + 24) + '" font-size="16">' + room + '</text>';
        for (const interval of analysis.rooms[room]) {
            const label = words().interval(room, interval.id, number(interval.start), number(interval.end));
            labels.push(label);
            if (interval.duration <= 0) continue;
            const span = interval.duration / 60 * plotWidth;
            chart += '<g><title>' + escape(label) + '</title>' +
                '<rect x="' + x(interval.start) + '" y="' + y[room] + '" width="' + span + '" height="36" fill="' + palette[interval.id - 1][0] + '" stroke="' + palette[interval.id - 1][1] + '" stroke-width="1"/>';
            if (span >= 20) chart += '<text class="timeline-number" x="' + (x(interval.start) + span / 2) + '" y="' + (y[room] + 24) + '" text-anchor="middle" font-size="16" paint-order="stroke" stroke="' + palette[interval.id - 1][0] + '" stroke-width="3">' + interval.id + '</text>';
            chart += '</g>';
        }
    }
    chart += '</svg>';
    $('#rooms-timeline').innerHTML = chart.replace('TIMELINE_LABEL', escape(labels.join('; ')));
}

function renderSchedule() {
    const analysis = inspectSchedule(state);
    root.dataset.complete = String(analysis.complete);
    for (const room of ['A', 'B']) {
        const lane = laneFor(room);
        lane.style.setProperty('--columns', state.groups.length <= 5 ? state.groups.length : Math.ceil(state.groups.length / 2));
        lane.style.setProperty('--mobile-columns', Math.min(3, state.groups.length));
        lane.innerHTML = state.orders[room].map((id, index) => {
            const group = state.groups.find(item => item.id === id);
            const duration = number(group[room.toLowerCase()]);
            const overlap = analysis.overlaps.find(item => item.id === id);
            const label = words().card(room, id, duration, index + 1, state.groups.length) + (overlap ? words().overlap : '');
            const moving = drag?.active && drag.room === room && drag.id === id;
            return '<li><button type="button" class="group-tile' + (moving ? ' drag-placeholder' : '') + '" data-room="' + room + '" data-group="' + id +
                '" data-minutes="' + group[room.toLowerCase()] + '" style="' + color(id) + '" aria-label="' + escape(label) +
                '" aria-describedby="rooms-keyboard-help" title="' + escape(words().dragTitle) + '">' +
                '<span class="grip" aria-hidden="true"></span><span class="group-number" aria-hidden="true">' + id + '</span>' +
                '<span class="group-time" aria-hidden="true">' + duration + (language === 'en' ? ' ' : '') + words().minute + '</span></button></li>';
        }).join('');
    }
    drawTimeline(analysis);
    const status = $('#rooms-status');
    status.textContent = analysis.complete ? words().success : words().conflict(analysis.overlaps.map(item => item.id));
    status.dataset.state = analysis.complete ? 'complete' : 'overlap';
    $('#rooms-undo').disabled = !undoStack.length;
    $('#rooms-reset').disabled = sameState(state, resetState(state));
}

function render() {
    root.lang = language;
    for (const node of root.querySelectorAll('[data-copy]')) node.textContent = words()[node.dataset.copy];
    $('#rooms-count').value = String(state.groups.length);
    $('#rooms-count').setAttribute('aria-label', words().groups);
    renderSchedule();
}

function focusGroup(room, id) {
    laneFor(room).querySelector('[data-group="' + id + '"]')?.focus({ preventScroll: true });
}

function endDrag(commitMove) {
    if (!drag) return;
    const finished = drag;
    drag = null;
    finished.ghost?.remove();
    if (commitMove && finished.active && finished.valid && !sameState(state, finished.original)) {
        remember(finished.original);
        $('#rooms-announcement').textContent = words().moved(finished.room, finished.id, state.orders[finished.room].indexOf(finished.id) + 1);
    } else {
        state = finished.original;
    }
    if (root.hasPointerCapture(finished.pointerId)) root.releasePointerCapture(finished.pointerId);
    renderSchedule();
    focusGroup(finished.room, finished.id);
}

function cancelDrag() { endDrag(false); }

root.addEventListener('pointerdown', event => {
    const tile = event.target.closest('.group-tile');
    if (!tile || event.button !== 0 || !event.isPrimary || drag) return;
    const room = tile.dataset.room, lane = laneFor(room);
    const rect = tile.getBoundingClientRect();
    drag = {
        room, id: Number(tile.dataset.group), pointerId: event.pointerId,
        original: cloneState(state), startX: event.clientX, startY: event.clientY,
        offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
        width: rect.width, height: rect.height, element: tile, active: false, valid: false,
        target: state.orders[room].indexOf(Number(tile.dataset.group)),
        bounds: lane.getBoundingClientRect(),
        slots: [...lane.querySelectorAll('.group-tile')].map(item => item.getBoundingClientRect()),
    };
    tile.focus({ preventScroll: true });
    root.setPointerCapture(event.pointerId);
    event.preventDefault();
});

root.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
        drag.active = true;
        drag.ghost = drag.element.cloneNode(true);
        drag.ghost.classList.add('drag-ghost');
        drag.ghost.setAttribute('aria-hidden', 'true');
        drag.ghost.tabIndex = -1;
        drag.ghost.style.width = drag.width + 'px';
        drag.ghost.style.height = drag.height + 'px';
        root.append(drag.ghost);
    }
    event.preventDefault();
    const ghostX = Math.min(window.innerWidth - drag.width - 4, Math.max(4, event.clientX - drag.offsetX));
    const ghostY = Math.min(window.innerHeight - drag.height - 4, Math.max(4, event.clientY - drag.offsetY));
    drag.ghost.style.left = ghostX + 'px';
    drag.ghost.style.top = ghostY + 'px';
    const box = drag.bounds;
    const valid = event.clientX >= box.left - 8 && event.clientX <= box.right + 8 &&
        event.clientY >= box.top - 12 && event.clientY <= box.bottom + 12;
    let target = drag.original.orders[drag.room].indexOf(drag.id);
    if (valid) {
        let distance = Infinity;
        drag.slots.forEach((slot, index) => {
            const next = (event.clientX - slot.left - slot.width / 2) ** 2 + (event.clientY - slot.top - slot.height / 2) ** 2;
            if (next < distance) { distance = next; target = index; }
        });
    }
    if (target !== drag.target || valid !== drag.valid) {
        drag.target = target;
        drag.valid = valid;
        state = moveGroup(drag.original, drag.room, drag.id, target);
        renderSchedule();
    }
});

root.addEventListener('pointerup', event => {
    if (drag && event.pointerId === drag.pointerId) { event.preventDefault(); endDrag(true); }
});
root.addEventListener('pointercancel', cancelDrag);
root.addEventListener('lostpointercapture', cancelDrag);
root.addEventListener('contextmenu', event => { if (event.target.closest('.group-tile')) event.preventDefault(); });

root.addEventListener('keydown', event => {
    const tile = event.target.closest('.group-tile');
    if (!tile || drag) return;
    const room = tile.dataset.room, id = Number(tile.dataset.group);
    const index = state.orders[room].indexOf(id);
    const columns = getComputedStyle(laneFor(room)).gridTemplateColumns.split(' ').length;
    const destinations = { ArrowLeft: index - 1, ArrowRight: index + 1, ArrowUp: index - columns,
        ArrowDown: index + columns, Home: 0, End: state.groups.length - 1 };
    if (!(event.key in destinations)) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(state.groups.length - 1, destinations[event.key]));
    commit(moveGroup(state, room, id, target), words().moved(room, id, target + 1));
    focusGroup(room, id);
});

$('#rooms-language').addEventListener('change', event => {
    cancelDrag();
    language = event.target.value;
    $('#rooms-announcement').textContent = '';
    render();
});
$('#rooms-count').addEventListener('change', event => {
    commit(createState(randomGroups(Number(event.target.value))), words().newNotice);
});
$('#rooms-new').addEventListener('click', () => {
    commit(createState(randomGroups(state.groups.length)), words().newNotice);
});
$('#rooms-reset').addEventListener('click', () => commit(resetState(state), words().resetNotice));
$('#rooms-undo').addEventListener('click', () => {
    cancelDrag();
    if (!undoStack.length) return;
    state = undoStack.pop();
    render();
    $('#rooms-announcement').textContent = words().undoNotice;
});
window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(); }
});
window.addEventListener('resize', () => { cancelDrag(); drawTimeline(inspectSchedule(state)); });
root.hidden = false;
render();
