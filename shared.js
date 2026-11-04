export const STARTING_CASH = 1000; // billions of simulated dollars
export const MAX_BUDGET = 1000;
export const MIN_APPROVALS = 3;
export const SELL_FEE_RATE = 0.005;
export const COMPANIES = [
  {id:'A', name:'Park Hotels & Resorts', property:'San Francisco hotels', amount:250, rate:0.08, ltv:80, dscr:1.10},
  {id:'B', name:'Brookfield', property:'Office portfolio', amount:150, rate:0.085, ltv:80, dscr:1.05},
  {id:'C', name:'Columbia Property Trust', property:'Office buildings', amount:400, rate:0.09, ltv:75, dscr:1.10},
  {id:'D', name:'Braemar Hotels & Resorts', property:'Washington, D.C. hotel', amount:100, rate:0.07, ltv:65, dscr:1.40},
  {id:'E', name:'Ashford Hospitality Trust', property:'Arlington hotel', amount:100, rate:0.075, ltv:70, dscr:1.30},
  {id:'F', name:'Chatham Lodging Trust', property:'Houston hotel', amount:50, rate:0.065, ltv:50, dscr:1.70},
  {id:'G', name:'Macerich', property:'Shopping mall', amount:200, rate:0.065, ltv:55, dscr:1.55}
];
export const TEAM_IDS = ['G1','G2','G3'];
export const emptyDecisions = () => Object.fromEntries(COMPANIES.map(c=>[c.id,'reject']));
export const dollars = (n, decimals=2) => (n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+'B';
export const percentage = n => (100*n).toFixed(1)+'%';
export const num = n => Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
export const signedMoney = (n) => (n>0?'+':'')+dollars(n);
export const friendlyDecision = d => d==='hold'?'Approve · Hold':d==='sell'?'Approve · Sell':'Reject';
export function portfolioStats(decisions){
  const d=decisions||{};
  const approvals=COMPANIES.filter(c=>d[c.id]&&d[c.id]!=='reject');
  const committed=approvals.reduce((s,c)=>s+c.amount,0);
  return {approved:approvals.length,committed,remaining:STARTING_CASH-committed, valid:approvals.length>=MIN_APPROVALS&&committed<=MAX_BUDGET&&COMPANIES.every(c=>['hold','sell','reject'].includes(d[c.id]))};
}
export function loanResult(c,decision,outcome){
  if (!outcome || decision==='reject') return {interest:0,recovered:0,loss:0,fee:0,profit:0,decision:decision||'reject'};
  if (decision==='sell') return {interest:0,recovered:c.amount,loss:0,fee:c.amount*SELL_FEE_RATE,profit:c.amount*SELL_FEE_RATE,decision};
  const interest=c.amount*c.rate*(outcome.months/12);
  const recovered=c.amount*outcome.recovery;
  const loss=c.amount-recovered;
  return {interest,recovered,loss,fee:0,profit:interest-loss,decision};
}
export function bankResult(decisions,outcomes){
  const rows=COMPANIES.map(c=>({company:c,...loanResult(c,decisions?.[c.id]||'reject',outcomes?.[c.id])}));
  const profit=rows.reduce((s,r)=>s+r.profit,0);
  return {rows,profit,endingCash:STARTING_CASH+profit, ...portfolioStats(decisions)};
}
export const esc = val => String(val??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
