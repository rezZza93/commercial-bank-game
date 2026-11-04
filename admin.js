import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocs,collection,writeBatch,setDoc,updateDoc,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {firebaseConfig} from './config.js';
import {COMPANIES,TEAM_IDS,STARTING_CASH,emptyDecisions,portfolioStats,bankResult,loanResult,esc,dollars,signedMoney,percentage,friendlyDecision} from './shared.js';
const el=id=>document.getElementById(id);const show=(id,yes)=>el(id).classList.toggle('sectionhidden',!yes);
let auth,db,config=null,teams={},outcomes={},codes={},unsubs=[],fileOutcomes=null,ready=false;
const alertMsg=(m,type='error')=>{el('status').innerHTML=`<div class="${type}">${esc(m)}</div>`;};
function resetSubscriptions(){unsubs.forEach(u=>u());unsubs=[];}
function generateCode(){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';return Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');}
function updatePage(){
  const phase=config?.phase||'setup';
  show('setupPanel',true);show('livePanel',true);show('revealPanel',phase==='reveal'||phase==='results');show('resultsPanel',phase==='results');
  el('phase').textContent='PHASE: '+phase.toUpperCase();
  el('workflow').innerHTML=[['open','1. Collect decisions'],['reveal','2. Reveal outcomes'],['results','3. Rank banks']].map(([p,name],i)=>`<span class="step ${phase===p?'active':''}"><i>${i+1}</i>${name}</span>`).join('');
  renderCodes();renderBoard();renderEvents();if(phase==='results')renderScores();
}
function renderCodes(){
  el('codes').innerHTML=Object.keys(codes).length?`<h3 style="margin-bottom:8px">Group join codes · give only to group leaders</h3><div class="groupcards">${TEAM_IDS.map(id=>`<div class="groupcard"><span class="pill soft">${id}</span><div class="big" style="letter-spacing:2px;font-size:19px">${esc(codes[id]||'—')}</div><div class="tiny muted">Student link: <code>${esc(new URL('./index.html', location.href).href)}</code></div></div>`).join('')}</div><p class="note">Each code may be claimed by one group leader only. Keep this page private.</p>`:'<p class="muted tiny">No group codes have been created yet.</p>';
}
function renderBoard(){
  const submitted=TEAM_IDS.filter(id=>teams[id]?.submitted).length;
  el('submitted').textContent=`${submitted} / 3 submitted`;
  el('groupCards').innerHTML=TEAM_IDS.map(id=>{
    let t=teams[id],s=t?.submitted?portfolioStats(t.decisions):null;
    return `<div class="groupcard"><div style="display:flex;justify-content:space-between"><h3>${id}</h3><span class="statusbadge ${t?.submitted?'submitted':'pending'}">${t?.submitted?'Submitted':t?.ownerUid?'Working':'Not joined'}</span></div><div class="big">${s?dollars(s.committed,0):'—'}</div><div class="tiny muted">${s?s.approved+' loans approved':'Awaiting group submission'}</div></div>`;
  }).join('');
  el('decisionBoard').innerHTML=COMPANIES.map(c=>`<tr><td><strong>${esc(c.name)}</strong><br><small>${esc(c.property)}</small></td><td class="right">${dollars(c.amount,0)}</td>${TEAM_IDS.map(id=>{const d=teams[id]?.submitted?teams[id].decisions[c.id]:null;return `<td>${d?`<span class="statusbadge ${d}">${friendlyDecision(d)}</span>`:'<span class="muted">—</span>'}</td>`;}).join('')}</tr>`).join('');
  el('startReveal').disabled=submitted!==3||config?.phase!=='open';
}
function renderEvents(){
  if(!['reveal','results'].includes(config?.phase||''))return;
  const count=Math.min(config.revealCount||0,7);
  el('revealProgress').textContent=`${count} / 7 revealed`;
  el('nextReveal').disabled=count>=7||config.phase!=='reveal';show('showResults',count===7&&config.phase==='reveal');
  el('events').innerHTML=COMPANIES.slice(0,count).map((c,i)=>{
    const o=outcomes[c.id];if(!o)return '';
    const r=loanResult(c,'hold',o),label=o.type==='default'?'DEFAULT':o.type==='refinanced'?'REFINANCED':'REPAID';
    return `<article class="event"><div class="eventtitle"><span class="pill soft">CORPORATION ${i+1} OF 7</span><span class="pill ${o.type==='default'?'lost':'done'}">${label}</span></div><h2>${esc(c.name)}</h2><p>${esc(o.event)}</p><div class="numbers"><div><span>Interest already collected</span><strong>${dollars(r.interest)}</strong></div><div><span>Principal recovered</span><strong>${dollars(r.recovered)}</strong></div><div><span>Unrecovered principal</span><strong class="${r.loss?'negative':''}">${dollars(r.loss)}</strong></div><div><span>HOLD net P/L</span><strong class="${r.profit<0?'negative':'positive'}">${signedMoney(r.profit)}</strong></div></div><div class="note">${esc(o.historicalNote)} · If SOLD at origination: +${dollars(c.amount*.005)} net fee, and no subsequent credit loss.</div></article>`;
  }).join('')||'<div class="notice">All decisions are locked. Select “Reveal next corporation” to show the first outcome.</div>';
}
function scoreData(){return TEAM_IDS.map(id=>({id,...bankResult(teams[id]?.decisions||emptyDecisions(),outcomes)})).sort((a,b)=>b.profit-a.profit);}
function renderScores(){
  if(Object.keys(outcomes).length!==7)return;
  const scores=scoreData();const best=scores[0];
  el('winner').innerHTML=`<div class="winners"><div><div class="eyebrow">Highest net profit</div><h2>${best.id} wins the Commercial Bank Challenge</h2><p class="muted">Ending cash ${dollars(best.endingCash)} from starting cash ${dollars(STARTING_CASH,0)}</p></div><div style="font-size:27px;font-weight:800" class="${best.profit<0?'negative':'positive'}">${signedMoney(best.profit)}</div></div>`;
  el('scorecards').innerHTML=scores.map((s,i)=>`<div class="groupcard ${i===0?'leader':''}"><span class="pill soft">RANK ${i+1}</span><h3 style="margin-top:9px">${s.id}</h3><div class="big ${s.profit<0?'negative':'positive'}">${signedMoney(s.profit)}</div><span class="tiny muted">Ending cash ${dollars(s.endingCash)} · ${s.approved} loans approved</span></div>`).join('');
  const val=x=>x<0?'negative':'positive';
  el('resultsTable').innerHTML=COMPANIES.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td>${TEAM_IDS.map(id=>{let d=teams[id]?.decisions[c.id]||'reject',r=loanResult(c,d,outcomes[c.id]);return `<td><span class="statusbadge ${d}">${friendlyDecision(d)}</span></td><td class="right ${val(r.profit)}">${signedMoney(r.profit)}</td>`}).join('')}</tr>`).join('')+`<tr style="background:#f0f5fb;font-weight:800"><td>TOTAL BANK P/L</td>${TEAM_IDS.map(id=>{let s=bankResult(teams[id]?.decisions||emptyDecisions(),outcomes);return `<td>Ending ${dollars(s.endingCash)}</td><td class="right ${val(s.profit)}">${signedMoney(s.profit)}</td>`}).join('')}</tr>`;
}
async function login(){try{await signInWithEmailAndPassword(auth,el('email').value.trim(),el('password').value);}catch(e){alertMsg('Instructor sign-in failed: '+e.message);}}
async function initGame(){
  if(!fileOutcomes||fileOutcomes.length!==7){alertMsg('First select the PRIVATE instructor_outcomes.json file.');return;}
  if(!confirm('Initialize / reset game? This clears group decisions and creates new group join codes.'))return;
  el('initGame').disabled=true;
  try{
    const claims=await getDocs(collection(db,'claims'));
    const batch=writeBatch(db);
    claims.forEach(s=>batch.delete(s.ref));
    const fresh={}; TEAM_IDS.forEach(id=>{fresh[id]=generateCode();batch.set(doc(db,'teamSecrets',id),{pin:fresh[id]});batch.set(doc(db,'teams',id),{name:id,ownerUid:null,submitted:false,submittedAt:null,decisions:emptyDecisions()});});
    fileOutcomes.forEach(o=>batch.set(doc(db,'outcomes',o.id),o));
    batch.set(doc(db,'config','main'),{phase:'open',revealCount:0,createdAt:Date.now(),maxBudget:1000});
    await batch.commit();codes=fresh;alertMsg('Game initialized. Share the student link and the three private group join codes.','success');updatePage();
  }catch(e){alertMsg('Setup failed: '+e.message);}
  finally{el('initGame').disabled=false;}
}
async function getCodes(){
  try{const all=await Promise.all(TEAM_IDS.map(id=>getDoc(doc(db,'teamSecrets',id))));codes=Object.fromEntries(all.map((s,i)=>[TEAM_IDS[i],s.data()?.pin]));renderCodes();}catch(e){console.warn('Group code read error',e);}
}
async function startReveal(){if(TEAM_IDS.some(id=>!teams[id]?.submitted))return; if(!confirm('Lock all decisions and begin the historical outcome reveal?'))return;try{await updateDoc(doc(db,'config','main'),{phase:'reveal',revealCount:0});}catch(e){alertMsg(e.message)}}
async function nextReveal(){const count=config?.revealCount||0;if(count>=7)return;try{await updateDoc(doc(db,'config','main'),{revealCount:count+1});}catch(e){alertMsg(e.message)}}
async function showResults(){if((config?.revealCount||0)!==7)return;try{await updateDoc(doc(db,'config','main'),{phase:'results'});el('resultsPanel').scrollIntoView({behavior:'smooth'});}catch(e){alertMsg(e.message)}}
async function parseFile(event){
  try{const f=event.target.files?.[0];if(!f)return;const parsed=JSON.parse(await f.text());
    if(!Array.isArray(parsed.outcomes)||parsed.outcomes.length!==7||COMPANIES.some((c,i)=>parsed.outcomes[i]?.id!==c.id||!['default','refinanced','repaid'].includes(parsed.outcomes[i]?.type)||parsed.outcomes[i]?.order!==i+1||typeof parsed.outcomes[i]?.recovery!=='number'||parsed.outcomes[i].recovery<0||parsed.outcomes[i].recovery>1||typeof parsed.outcomes[i]?.months!=='number'||parsed.outcomes[i].months<0||parsed.outcomes[i].months>12))throw new Error('Incorrect outcome data file format.');
    fileOutcomes=parsed.outcomes;alertMsg('Private outcome file loaded locally. It will be stored in protected Firestore documents when you initialize.','success');
  }catch(e){fileOutcomes=null;alertMsg('Could not read private outcomes: '+e.message);}
}
function exportCSV(){
  const head=['Corporation','G1 decision','G1 profit ($B)','G2 decision','G2 profit ($B)','G3 decision','G3 profit ($B)'];
  const lines=COMPANIES.map(c=>[c.name,...TEAM_IDS.flatMap(id=>{let d=teams[id]?.decisions[c.id]||'reject';return [d,loanResult(c,d,outcomes[c.id]).profit.toFixed(4)];})]);
  lines.push(['TOTAL',...TEAM_IDS.flatMap(id=>['',bankResult(teams[id]?.decisions||emptyDecisions(),outcomes).profit.toFixed(4)])]);
  const csv=[head,...lines].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='bank_challenge_results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function subscribe(){
  resetSubscriptions();
  unsubs.push(onSnapshot(doc(db,'config','main'),s=>{config=s.data()||{phase:'setup',revealCount:0};updatePage();},e=>alertMsg('Game status error: '+e.message)));
  unsubs.push(onSnapshot(collection(db,'teams'),s=>{teams={};s.forEach(x=>teams[x.id]=x.data());updatePage();},e=>alertMsg('Teams error: '+e.message)));
  unsubs.push(onSnapshot(collection(db,'outcomes'),s=>{outcomes={};s.forEach(x=>outcomes[x.id]=x.data());updatePage();},e=>alertMsg('Outcomes error: '+e.message)));
  getCodes();
}
function startup(){
  if(firebaseConfig.apiKey.startsWith('PASTE_')){alertMsg('Firebase is not configured yet. Add your Firebase Web App configuration in public/config.js; see README.md.');return;}
  try{
    const app=initializeApp(firebaseConfig);db=getFirestore(app);auth=getAuth(app);
    onAuthStateChanged(auth,async u=>{
      if(!u){ready=false;show('loginPanel',true);show('dashboard',false);resetSubscriptions();return;}
      if(u.isAnonymous){await signOut(auth);return;}
      try{const adminSnap=await getDoc(doc(db,'admins',u.uid));if(!adminSnap.exists())throw new Error('This account is not registered as an instructor admin in Firestore.');
        ready=true;show('loginPanel',false);show('dashboard',true);el('adminEmail').textContent=u.email||'';el('status').innerHTML='';subscribe();
      }catch(e){alertMsg('Access denied: '+e.message);await signOut(auth);}
    });
  }catch(e){alertMsg('Could not start instructor portal: '+e.message);}
}
el('login').addEventListener('click',login);el('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
el('logout').addEventListener('click',()=>signOut(auth));el('privateFile').addEventListener('change',parseFile);el('initGame').addEventListener('click',initGame);
el('startReveal').addEventListener('click',startReveal);el('nextReveal').addEventListener('click',nextReveal);el('showResults').addEventListener('click',showResults);el('exportCsv').addEventListener('click',exportCSV);startup();
