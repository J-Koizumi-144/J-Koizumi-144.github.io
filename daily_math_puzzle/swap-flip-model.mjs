export function createState(order) {
  if (!Array.isArray(order) || order.length < 2 || order.length > 6 || new Set(order).size !== order.length || order.some(x => !Number.isInteger(x) || x < 1 || x > order.length)) throw new Error('Invalid order');
  return order.map(number => ({ number, black: false }));
}
export function swapFlip(cards, index) {
  if (!Number.isInteger(index) || index < 0 || index >= cards.length - 1) throw new Error('Invalid pair');
  const result = cards.map(card => ({...card}));
  [result[index], result[index + 1]] = [result[index + 1], result[index]];
  result[index].black = !result[index].black;
  result[index + 1].black = !result[index + 1].black;
  return result;
}
export function isSorted(cards) { return cards.every((card, index) => card.number === index + 1); }
export function randomOrder(n, random = Math.random) {
  const order = Array.from({length:n}, (_,i) => i+1);
  for (let i=n-1; i>0; i--) { const j=Math.floor(random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  if (order.every((v,i)=>v===i+1)) [order[0],order[1]]=[order[1],order[0]];
  return order;
}
