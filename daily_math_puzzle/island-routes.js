import { ISLAND_COUNTS, generateIslandTree, adjacency, findPath, IslandRouteGame } from './island-route-game.mjs';

const words = {
    en: {
        language: '言語', size: 'Islands', pairs: 'Pairs', common: 'Common islands',
        guide: 'Select two islands, then pair them. Select a pair to inspect its path.',
        pair: 'Pair islands', clear: 'Clear selection', undo: 'Undo', reset: 'Reset pairs', newMap: 'New map',
        showCommon: 'Color common islands', all: 'All paths', empty: 'No pairs yet.',
        initial: 'Select two islands.', one: 'Select one more island.',
        ready: (a,b) => `Pair islands ${a} and ${b}.`, full: 'Two islands are selected. Pair them or clear the selection.',
        remaining: n => `${n} islands left to pair.`, none: 'These paths have no common island.',
        failed: 'No common island. Change a pair.', success: ids => `All paths meet at ${ids.length === 1 ? 'island' : 'islands'} ${ids.join(', ')}.`,
        island: id => `Island ${id}`, bridges: ids => `Bridges to ${ids.join(', ')}.`,
        unpaired: 'Unpaired.', selected: 'Selected.', paired: id => `Paired with ${id}.`, commonNode: 'Common to all paired paths.',
        pairName: (letter,a,b) => `Pair ${letter}: ${a} and ${b}`, remove: (a,b) => `Remove pair ${a} and ${b}`,
        board: 'Islands and bridges. Use arrow keys to move between islands.', pairList: 'Island pairs',
    },
    ja: {
        language: 'Language', size: '島の数', pairs: '組数', common: '共通する島',
        guide: '島を二つ選んで組にします。組を選ぶと経路を確認できます。',
        pair: '組にする', clear: '選択を解除', undo: '1手戻す', reset: '組分けをリセット', newMap: '別の地図',
        showCommon: '共通する島に色を付ける', all: 'すべての経路', empty: 'まだ組がありません。',
        initial: '島を二つ選んでください。', one: 'もう一つ島を選んでください。',
        ready: (a,b) => `島${a}と島${b}を組にできます。`, full: '島は二つまで選べます。組にするか、選択を解除してください。',
        remaining: n => `残り${n}個の島を組にします。`, none: '現在の経路すべてに共通する島はありません。',
        failed: '共通する島がありません。組分けを変えてみてください。', success: ids => `すべての経路が島${ids.join('、')}を通ります。`,
        island: id => `島${id}`, bridges: ids => `島${ids.join('、')}への橋。`,
        unpaired: '未使用。', selected: '選択中。', paired: id => `島${id}と組。`, commonNode: '現在のすべての経路に共通する島。',
        pairName: (letter,a,b) => `組${letter}：島${a}と島${b}`, remove: (a,b) => `島${a}と島${b}の組を解除`,
        board: '島と橋。矢印キーで島の間を移動できます。', pairList: '島の組',
    },
};
const colors = ['#087b7f', '#b25d29', '#685a9d', '#c34b74', '#467339', '#326ba2', '#8e7625', '#8c4e3f', '#537a79', '#7c567e', '#526c31', '#5e6283'];
const $ = id => document.getElementById(id);
const app = $('island-game');
const board = $('island-board');
const svg = $('island-lines');
const nodesLayer = $('island-nodes');
const pairList = $('island-pairs');
const message = $('island-message');
let language = 'en';
let game;
let activePair = null;
let focusedIsland = 0;
let nodeButtons = [];
let positions = [];
let viewWidth, viewHeight;
let notice = null;
const ns = 'http://www.w3.org/2000/svg';

function svgElement(tag, attributes) {
    const element = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
}
function line(a, b, attributes = {}, offset = 0) {
    const p = positions[a], q = positions[b];
    const distance = Math.hypot(q.x-p.x, q.y-p.y);
    const dx = -(q.y-p.y) / distance * offset, dy = (q.x-p.x) / distance * offset;
    return svgElement('line', { x1: p.x+dx, y1: p.y+dy, x2: q.x+dx, y2: q.y+dy, ...attributes });
}
function focusIsland(id) {
    focusedIsland = id;
    nodeButtons.forEach((button, i) => { button.tabIndex = i === id ? 0 : -1; });
    nodeButtons[id].focus({ preventScroll: true });
}
function navigate(event, from) {
    if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); focusIsland(event.key === 'Home' ? 0 : nodeButtons.length - 1); return;
    }
    const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    if (!(event.key in directions)) return;
    event.preventDefault();
    const [dx,dy] = directions[event.key];
    const p = positions[from];
    const candidates = positions.flatMap((q,i) => {
        const x=q.x-p.x, y=q.y-p.y, forward=x*dx+y*dy;
        return forward > 1 ? [{ i, score: Math.hypot(x,y) + Math.abs(x*dy-y*dx)*1.4 }] : [];
    });
    candidates.sort((a,b) => a.score-b.score);
    if (candidates.length) focusIsland(candidates[0].i);
}
function setupBoard() {
    const xs=game.graph.nodes.map(p => p.x), ys=game.graph.nodes.map(p => p.y);
    const minX=Math.min(...xs), minY=Math.min(...ys);
    viewWidth=(Math.max(...xs)-minX)*80+84;
    viewHeight=(Math.max(...ys)-minY)*80+84;
    positions=game.graph.nodes.map(p => ({ x:(p.x-minX)*80+42, y:(p.y-minY)*80+42 }));
    board.style.aspectRatio=`${viewWidth} / ${viewHeight}`;
    svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
    nodesLayer.replaceChildren();
    nodeButtons=positions.map((p,i) => {
        const button=document.createElement('button');
        button.type='button'; button.className='island'; button.dataset.islandId=i;
        button.style.left=`${p.x/viewWidth*100}%`; button.style.top=`${p.y/viewHeight*100}%`;
        button.tabIndex=i===0 ? 0 : -1;
        const number=document.createElement('span'); number.className='island-number'; number.textContent=i+1;
        const badge=document.createElement('span'); badge.className='island-badge'; badge.setAttribute('aria-hidden','true');
        button.append(number,badge);
        button.addEventListener('focus', () => { focusedIsland=i; nodeButtons.forEach((b,j) => b.tabIndex=j===i?0:-1); });
        button.addEventListener('keydown', event => navigate(event,i));
        button.addEventListener('click', () => {
            notice=null;
            const index=game.pairIndex(i);
            if (index>=0) { activePair=activePair===index ? null : index; game.clearSelection(); }
            else { activePair=null; if (game.select(i)==='full') notice='full'; }
            render();
        });
        nodesLayer.append(button); return button;
    });
    focusedIsland=0;
}
function drawRoutes(result) {
    svg.replaceChildren();
    for (const [a,b] of game.graph.edges) svg.append(line(a,b,{ class:'bridge' }));
    const usage=new Map();
    result.paths.forEach((path,pairIndex) => {
        for (let i=1; i<path.length; i++) {
            const a=Math.min(path[i-1],path[i]), b=Math.max(path[i-1],path[i]);
            const key=`${a}:${b}`;
            if (!usage.has(key)) usage.set(key, { a,b,pairs:[] });
            usage.get(key).pairs.push(pairIndex);
        }
    });
    for (const {a,b,pairs} of usage.values()) {
        pairs.forEach((index,i) => {
            const muted=activePair!==null && activePair!==index;
            svg.append(line(a,b,{ class:'pair-path', stroke:colors[index], opacity:muted?0.14:0.9, 'stroke-width':activePair===index?4:2.7 }, (i-(pairs.length-1)/2)*4));
        });
    }
    if (game.selected.length===2) {
        const preview=findPath(game.graph,...game.selected);
        for (let i=1;i<preview.length;i++) svg.append(line(preview[i-1],preview[i],{ class:'preview-path' }));
    }
}
function renderPairList(w) {
    const previousFocus=document.activeElement;
    const focusKey=previousFocus?.dataset.pairKey;
    pairList.replaceChildren();
    game.pairs.forEach(([a,b],index) => {
        const item=document.createElement('li'); item.className='route-pair'; item.style.setProperty('--pair-color',colors[index]);
        const inspect=document.createElement('button'); inspect.type='button'; inspect.className='inspect-pair';
        const letter=String.fromCharCode(65+index);
        inspect.textContent=`${letter}  ${a+1}–${b+1}`; inspect.dataset.pairKey=`view-${a}-${b}`;
        inspect.setAttribute('aria-label',w.pairName(letter,a+1,b+1)); inspect.setAttribute('aria-pressed',activePair===index);
        inspect.addEventListener('click',()=>{ activePair=activePair===index?null:index; game.clearSelection(); notice=null; render(); });
        const remove=document.createElement('button'); remove.type='button'; remove.className='remove-pair'; remove.textContent='×';
        remove.dataset.pairKey=`remove-${a}-${b}`; remove.setAttribute('aria-label',w.remove(a+1,b+1)); remove.title=w.remove(a+1,b+1);
        remove.addEventListener('click',()=>{ game.removePair(index); activePair=null; notice=null; render(); focusIsland(a); });
        item.append(inspect,remove); pairList.append(item);
    });
    if (focusKey) pairList.querySelector(`[data-pair-key="${focusKey}"]`)?.focus({preventScroll:true});
    $('island-empty').hidden=game.pairs.length>0;
}
function render() {
    const w=words[language], result=game.evaluate();
    app.lang=language;
    app.querySelectorAll('[data-word]').forEach(element=>element.textContent=w[element.dataset.word]);
    board.setAttribute('aria-label',w.board); pairList.setAttribute('aria-label',w.pairList);
    $('island-pair-count').textContent=`${game.pairs.length} / ${game.graph.nodes.length/2}`;
    $('island-common-count').textContent=game.pairs.length ? result.common.length : '—';
    $('island-apply').disabled=game.selected.length!==2;
    $('island-clear').disabled=!game.selected.length;
    $('island-undo').disabled=!game.history.length;
    $('island-reset').disabled=!game.pairs.length && !game.selected.length;
    $('island-all').disabled=activePair===null;
    $('island-show-common').disabled=!game.pairs.length;
    const markCommon=$('island-show-common').checked || result.success;
    const adj=adjacency(game.graph);
    nodeButtons.forEach((button,id)=>{
        const index=game.pairIndex(id), selected=game.selected.includes(id), common=markCommon && result.common.includes(id);
        button.classList.toggle('is-selected',selected); button.classList.toggle('is-paired',index>=0);
        button.classList.toggle('is-active',index>=0 && index===activePair); button.classList.toggle('is-common',common);
        button.style.setProperty('--pair-color',index>=0?colors[index]:'#087b7f');
        button.querySelector('.island-badge').textContent=index>=0?String.fromCharCode(65+index):'';
        button.setAttribute('aria-pressed',selected || (index>=0 && index===activePair));
        let label=`${w.island(id+1)}. ${w.bridges(adj[id].map(v=>v+1).sort((a,b)=>a-b))} `;
        label+=index>=0?w.paired(game.pairs[index].find(v=>v!==id)+1):selected?w.selected:w.unpaired;
        if (common) label+=` ${w.commonNode}`;
        button.setAttribute('aria-label',label);
    });
    let text;
    if (notice) text=w[notice];
    else if (game.selected.length===2) text=w.ready(...game.selected.map(id=>id+1));
    else if (game.selected.length===1) text=w.one;
    else if (result.success) text=w.success(result.common.map(id=>id+1));
    else if (result.complete) text=w.failed;
    else if (game.pairs.length && !result.common.length) text=w.none;
    else if (game.pairs.length) text=w.remaining(result.unpaired);
    else text=w.initial;
    message.textContent=text;
    message.dataset.state=result.success?'complete':game.pairs.length&&!result.common.length?'blocked':'';
    drawRoutes(result); renderPairList(w);
}
function newMap() {
    game=new IslandRouteGame(generateIslandTree(Number($('island-size').value)));
    activePair=null; notice=null; $('island-show-common').checked=false;
    setupBoard(); render();
}
for (const count of ISLAND_COUNTS) {
    const option=document.createElement('option'); option.value=count; option.textContent=count; option.selected=count===8; $('island-size').append(option);
}
$('island-language').addEventListener('change',event=>{ language=event.target.value; render(); });
$('island-size').addEventListener('change',newMap);
$('island-new').addEventListener('click',newMap);
$('island-apply').addEventListener('click',()=>{ if(game.addPair()) { activePair=null; notice=null; render(); } });
$('island-clear').addEventListener('click',()=>{ game.clearSelection(); notice=null; render(); });
$('island-undo').addEventListener('click',()=>{ game.undo(); activePair=null; notice=null; render(); });
$('island-reset').addEventListener('click',()=>{ game.reset(); activePair=null; notice=null; render(); });
$('island-all').addEventListener('click',()=>{ activePair=null; render(); });
$('island-show-common').addEventListener('change',render);
newMap();
app.hidden=false;
