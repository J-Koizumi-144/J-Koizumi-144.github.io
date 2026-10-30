import {CupMixing, exactText} from './cup-mixing-model.mjs';
const text = {
 en:{language:'言語', setup:'Press a cup to switch between 6% and 12%.', choose:'Select two or three cups, then press Mix.', chooseTwo:'Select two cups, then press Mix.', start:'Start mixing', mix:'Mix', undo:'Undo', reset:'Reset', edit:'Edit initial cups', moves:'Moves', triple:'Three-cup mix left', selected:'Selected', board:'Cups', cup:'Cup', done:'All cups in this trial are exactly equal.', working:'Concentrations are not all equal.', ready:'Set the initial concentrations.', selection:n=>`${n} selected.`, percent:'concentration'},
 ja:{language:'Language', setup:'コップを押すと初めの濃度が6%と12%で切り替わります．', choose:'2個または3個を選んで「混ぜる」を押してください．', chooseTwo:'2個を選んで「混ぜる」を押してください．', start:'混合を始める', mix:'混ぜる', undo:'1手戻す', reset:'リセット', edit:'初めの濃度を編集', moves:'操作回数', triple:'3個の混合の残り', selected:'選択数', board:'コップ', cup:'コップ', done:'この初期配置の濃度がすべて等しくなりました．', working:'濃度はまだそろっていません．', ready:'初めの濃度を設定してください．', selection:n=>`${n}個を選択中．`, percent:'濃度'}
};
const root=document.getElementById('cup-game'), board=document.getElementById('cup-board');
const size=document.getElementById('cup-size'), language=document.getElementById('cup-language');
let game=new CupMixing(Number(size.value));
function render(focus) {
 const t=text[language.value]; root.lang=language.value;
 root.querySelectorAll('[data-label]').forEach(e=>e.textContent=t[e.dataset.label]);
 document.getElementById('cup-instruction').textContent=game.phase==='setup'?t.setup:game.tripleUsed?t.chooseTwo:t.choose;
 board.setAttribute('aria-label',t.board);
 board.replaceChildren(...game.values.map((v,i)=>{
  const b=document.createElement('button'); b.type='button'; b.className='cup'; b.dataset.index=i;
  b.setAttribute('aria-label',`${t.cup} ${i+1}, ${t.percent} ${exactText(v)}`);
  if(game.phase==='mix') b.setAttribute('aria-pressed',String(game.selected.includes(i)));
  const number=document.createElement('span'); number.className='cup-number'; number.textContent=String(i+1);
  const vessel=document.createElement('span'); vessel.className='cup-vessel'; vessel.setAttribute('aria-hidden','true');
  // Concentration controls the tint; the liquid level is fixed because masses are equal.
  const ratio=Number(v.p*1000n/v.q)/1000; vessel.style.setProperty('--tint',`${20+(ratio-6)*7}%`);
  const value=document.createElement('span'); value.className='cup-value'; value.textContent=exactText(v);
  b.append(number,vessel,value); b.addEventListener('click',()=>{game.phase==='setup'?game.toggle(i):game.select(i);render(i);});
  b.addEventListener('keydown',e=>{
   let next; if(e.key==='ArrowRight'||e.key==='ArrowDown') next=(i+1)%game.n;
   if(e.key==='ArrowLeft'||e.key==='ArrowUp') next=(i+game.n-1)%game.n;
   if(e.key==='Home') next=0; if(e.key==='End') next=game.n-1;
   if(next!==undefined){e.preventDefault();board.children[next].focus();}
  }); return b;
 }));
 document.getElementById('cup-moves').textContent=game.moves;
 document.getElementById('cup-triple').textContent=game.tripleUsed?0:1;
 document.getElementById('cup-selected').textContent=game.selected.length;
 document.getElementById('cup-start').hidden=game.phase!=='setup';
 document.getElementById('cup-mix').hidden=game.phase==='setup';
 document.getElementById('cup-mix').disabled=!game.canMix;
 document.getElementById('cup-undo').disabled=game.history.length===0;
 document.getElementById('cup-edit').hidden=game.phase==='setup';
 document.getElementById('cup-reset').disabled=game.phase==='setup'&&game.history.length===0;
 const status=document.getElementById('cup-status'); status.textContent=game.phase==='setup'?t.ready:game.equal?t.done:t.working;
 status.dataset.state=game.phase==='mix'&&game.equal?'complete':'';
 document.getElementById('cup-selection').textContent=game.phase==='mix'?t.selection(game.selected.length):'';
 if(focus!==undefined) board.children[focus]?.focus({preventScroll:true});
}
document.getElementById('cup-start').addEventListener('click',()=>{game.start();render(0);});
document.getElementById('cup-mix').addEventListener('click',()=>{const i=game.selected[0];if(game.mix())render(i);});
document.getElementById('cup-undo').addEventListener('click',()=>{game.undo();render();});
document.getElementById('cup-edit').addEventListener('click',()=>{game=new CupMixing(game.n,game.initial);render(0);});
document.getElementById('cup-reset').addEventListener('click',()=>{game=new CupMixing(game.n);render();});
size.addEventListener('change',()=>{game=new CupMixing(Number(size.value));render();});
language.addEventListener('change',()=>render());
render();root.hidden=false;
