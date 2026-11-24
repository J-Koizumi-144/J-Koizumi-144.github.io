import {createState, swapFlip, isSorted, randomOrder} from './swap-flip-model.mjs';
const root=document.querySelector('#swap-flip');
const $=s=>root.querySelector(s);
let language='en', initial=randomOrder(5), cards=createState(initial), history=[];
const words={en:{language:'言語',size:'Cards',initial:'Initial order',white:'White',black:'Black',undo:'Undo',reset:'Reset',random:'New order',moves:'Moves',playing:'Keep swapping.',sorted:'In increasing order.',help:'Press ↔ below two neighboring cards.',pair:(a,b)=>`Swap positions ${a} and ${b}`},ja:{language:'Language',size:'枚数',initial:'初めの並び',white:'白',black:'黒',undo:'1手戻す',reset:'リセット',random:'別の並び',moves:'手数',playing:'並べ替え中',sorted:'小さい順に並びました．',help:'隣り合う2枚の下の ↔ を押します．',pair:(a,b)=>`位置${a}と${b}を交換`}};
function render(focusIndex) {
 const t=words[language]; root.lang=language;
 for(const el of root.querySelectorAll('[data-label]')) el.textContent=t[el.dataset.label];
 $('#sf-start').textContent=initial.join(' · ');
 $('#sf-moves').textContent=history.length;
 $('#sf-message').textContent=isSorted(cards)?t.sorted:t.playing;
 $('#sf-message').dataset.sorted=String(isSorted(cards));
 $('#sf-undo').disabled=history.length===0;
 $('#sf-reset').disabled=history.length===0;
 const board=$('#sf-board'); board.style.gridTemplateColumns=`repeat(${cards.length}, minmax(0,1fr))`; board.replaceChildren();
 for(const card of cards) {
  const el=document.createElement('div'); el.className='sf-card'+(card.black?' black':''); el.dataset.number=card.number; el.dataset.black=card.black;
  const num=document.createElement('span'); num.className='sf-number'; num.textContent=card.number;
  const face=document.createElement('span'); face.className='sf-face'; face.textContent=card.black?t.black:t.white;
  el.append(num,face); board.append(el);
 }
 const pairs=$('#sf-pairs'); pairs.style.gridTemplateColumns=`repeat(${cards.length-1},minmax(0,1fr))`; pairs.replaceChildren();
 for(let i=0;i<cards.length-1;i++) {
  const b=document.createElement('button'); b.type='button'; b.className='sf-pair'; b.dataset.index=i; b.textContent='↔'; b.setAttribute('aria-label',t.pair(i+1,i+2));
  b.addEventListener('click',()=>{history.push(cards); cards=swapFlip(cards,i); render(i);});
  b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return; e.preventDefault(); pairs.children[(i+(e.key==='ArrowRight'?1:cards.length-2))%(cards.length-1)].focus();});
  pairs.append(b);
 }
 if(focusIndex!==undefined) pairs.children[focusIndex]?.focus();
}
$('#sf-language').addEventListener('change',e=>{language=e.target.value;render();});
function restart(newOrder) {initial=[...newOrder];cards=createState(initial);history=[];render();}
$('#sf-size').addEventListener('change',e=>restart(randomOrder(Number(e.target.value))));
$('#sf-random').addEventListener('click',()=>{let next=randomOrder(initial.length);if(next.join()===initial.join()) [next[0],next[1]]=[next[1],next[0]];restart(next);});
$('#sf-reset').addEventListener('click',()=>restart(initial));
$('#sf-undo').addEventListener('click',()=>{if(history.length){cards=history.pop();render();}});
render();root.hidden=false;
