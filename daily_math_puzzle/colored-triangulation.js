import {createGame, operation, toggle, undo, inspect} from './colored-triangulation-game.mjs';
const root = document.querySelector('#triangulation-game');
if (root) {
    let game = createGame(2), selected = [], lang = 'en';
    const $ = id => root.querySelector(`#${id}`);
    const words = {
        en: {language:'言語', instruction:'Select two vertices, then add or remove their diagonal.', legend:'R = red · B = blue · d = number of diagonals at the vertex', diagonals:'Diagonals', triangles:'Triangles formed', mono:'Monochromatic triangles', odd:'Odd-degree vertices', undo:'Undo', reset:'Reset', errors:'Mark odd-degree vertices', add:'Add diagonal', remove:'Remove diagonal', select:'Select two vertices.', boundary:'These vertices share a boundary edge.', crossing:'This diagonal crosses an existing diagonal.', chosen:'Selected', empty:'None', incomplete:'Triangulation incomplete.', parity:'Triangulation complete; some vertices have odd degree.', complete:'All conditions satisfied.', vertex:'Vertex', red:'red', blue:'blue', degree:'diagonals', board:'Polygon vertices'},
        ja: {language:'Language', instruction:'頂点を2個選び，対角線を追加・削除します．', legend:'R＝赤 · B＝青 · d＝その頂点から出る対角線の本数', diagonals:'対角線', triangles:'できた三角形', mono:'単色の三角形', odd:'本数が奇数の頂点', undo:'1手戻す', reset:'リセット', errors:'奇数の頂点を強調', add:'対角線を追加', remove:'対角線を削除', select:'頂点を2個選んでください．', boundary:'この2頂点は外周の辺で結ばれています．', crossing:'既存の対角線と交差します．', chosen:'選択中', empty:'なし', incomplete:'三角形への分割は未完成です．', parity:'分割は完成しましたが，本数が奇数の頂点があります．', complete:'すべての条件を満たしています．', vertex:'頂点', red:'赤', blue:'青', degree:'対角線', board:'多角形の頂点'}
    };
    const svgNS = 'http://www.w3.org/2000/svg';
    function draw() {
        const active = document.activeElement?.dataset.vertex;
        const t = words[lang], s = inspect(game), m = 6 * game.n;
        root.lang = lang;
        root.querySelectorAll('[data-label]').forEach(el => el.textContent = t[el.dataset.label]);
        $('tri-diagonals').textContent = `${game.edges.length} / ${m-3}`;
        $('tri-triangles').textContent = `${s.triangles.length} / ${m-2}`;
        $('tri-mono').textContent = s.monochromatic.length;
        $('tri-odd').textContent = s.odd;
        $('tri-selection').textContent = `${t.chosen}: ${selected.length ? selected.map(v=>v+1).join(' · ') : t.empty}`;
        const op = selected.length === 2 ? operation(game, ...selected) : 'select';
        $('tri-confirm').textContent = op === 'remove' ? t.remove : t.add;
        $('tri-confirm').disabled = !['add','remove'].includes(op);
        $('tri-operation').textContent = ['add','remove'].includes(op) ? `${selected[0]+1} — ${selected[1]+1}` : t[op];
        $('tri-undo').disabled = !game.history.length;
        $('tri-reset').disabled = !game.edges.length && !selected.length;
        $('tri-status').textContent = s.complete ? t.complete : s.triangulated ? t.parity : t.incomplete;
        $('tri-status').dataset.state = s.complete ? 'complete' : '';
        const width = m <= 12 ? 440 : 660, radius = width / 2 - 42;
        const pts = Array.from({length:m}, (_,i)=>[width/2+radius*Math.sin(i*2*Math.PI/m), width/2-radius*Math.cos(i*2*Math.PI/m)]);
        const board = $('tri-board'); board.style.width = `${width}px`; board.style.height = `${width}px`;
        board.setAttribute('aria-label',t.board); board.replaceChildren();
        const svg = document.createElementNS(svgNS,'svg'); svg.setAttribute('viewBox',`0 0 ${width} ${width}`); svg.setAttribute('aria-hidden','true');
        function shape(tag, attrs) {const el=document.createElementNS(svgNS,tag); for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v); svg.append(el);}
        for (const tri of s.triangles) {
            const mono = tri.every(v=>v%2===tri[0]%2);
            shape('polygon',{points:tri.map(v=>pts[v].join(',')).join(' '),fill:mono?(tri[0]%2?'#dce7fa':'#f9dcd7'):'#f8f8f4'});
        }
        for(let a=0;a<m;a++){const b=(a+1)%m; shape('line',{x1:pts[a][0],y1:pts[a][1],x2:pts[b][0],y2:pts[b][1],stroke:'#777','stroke-width':2});}
        for(const [a,b] of game.edges) shape('line',{x1:pts[a][0],y1:pts[a][1],x2:pts[b][0],y2:pts[b][1],stroke:'#555','stroke-width':2});
        if(selected.length===2){const [a,b]=selected; shape('line',{x1:pts[a][0],y1:pts[a][1],x2:pts[b][0],y2:pts[b][1],stroke:op==='crossing'?'#a43f27':'#087b7f','stroke-width':3,'stroke-dasharray':'7 5'});}
        board.append(svg);
        pts.forEach(([x,y],i)=>{
            const btn=document.createElement('button'); btn.type='button'; btn.dataset.vertex=i;
            btn.className=`tri-vertex tri-${i%2?'blue':'red'}${$('tri-errors').checked && s.degree[i]%2?' tri-odd':''}`;
            btn.style.left=`${x}px`; btn.style.top=`${y}px`; btn.setAttribute('aria-pressed',String(selected.includes(i)));
            btn.setAttribute('aria-label',`${t.vertex} ${i+1}, ${i%2?t.blue:t.red}, ${t.degree} ${s.degree[i]}`);
            btn.append(document.createTextNode(`${i+1} ${i%2?'B':'R'}`)); const small=document.createElement('small'); small.textContent=`d=${s.degree[i]}`; btn.append(small);
            btn.addEventListener('click',()=>{selected=selected.includes(i)?selected.filter(v=>v!==i):selected.length===2?[i]:[...selected,i]; draw();});
            btn.addEventListener('keydown',event=>{let next;if(['ArrowRight','ArrowDown'].includes(event.key)) next=(i+1)%m; else if(['ArrowLeft','ArrowUp'].includes(event.key)) next=(i+m-1)%m; else if(event.key==='Home') next=0; else if(event.key==='End') next=m-1; if(next!==undefined){event.preventDefault(); board.querySelector(`[data-vertex="${next}"]`).focus();}});
            board.append(btn);
        });
        if(active!==undefined) board.querySelector(`[data-vertex="${active}"]`)?.focus({preventScroll:true});
    }
    $('tri-language').addEventListener('change',e=>{lang=e.target.value;draw();});
    $('tri-size').addEventListener('change',e=>{game=createGame(Number(e.target.value));selected=[];draw();});
    $('tri-confirm').addEventListener('click',()=>{if(selected.length===2 && toggle(game,...selected)){selected=[];draw();}});
    $('tri-undo').addEventListener('click',()=>{undo(game);selected=[];draw();});
    $('tri-reset').addEventListener('click',()=>{game=createGame(game.n);selected=[];draw();});
    $('tri-errors').addEventListener('change',draw);
    draw(); root.hidden=false;
}
