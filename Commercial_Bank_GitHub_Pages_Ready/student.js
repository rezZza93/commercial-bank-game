import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously,signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,runTransaction,updateDoc,serverTimestamp,onSnapshot} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {firebaseConfig} from './config.js';
import {COMPANIES,STARTING_CASH,TEAM_IDS,emptyDecisions,portfolioStats,bankResult,loanResult,esc,dollars,percentage,signedMoney,MIN_APPROVALS,friendlyDecision} from './shared.js';
const el=id=>document.getElementById(id);const status=el('status');
const show=(id,yes)=>el(id).classList.toggle('sectionhidden',!yes);
let db,auth,uid=null,teamId=null,team=null,gameConfig=null,decisions=emptyDecisions(),teamUnsub=null,configUnsub=null,outcomes={};
const alertMsg=(m,type='error')=>{status.innerHTML=`<div class="${type}">${esc(m)}</div>`;};
function renderLoans(){
  el('loans').innerHTML=COMPANIES.map(c=>`<tr><td><strong>${esc(c.name)}</strong><br><small>${esc(c.property)}</small></td><td class="right">${dollars(c.amount,0)}</td><td class="right">${percentage(c.rate)}</td><td class="right">${c.ltv}%</td><td class="right">${c.dscr.toFixed(2)}</td><td><select class="decisionselect" data-id="${c.id}" ${team?.submitted?'disabled':''}><option value="reject">Reject</option><option value="hold">Approve · Hold</option><option value="sell">Approve · Sell</option></select></td></tr>`).join('');
  document.querySelectorAll('[data-id]').forEach(s=>{s.value=decisions[s.dataset.id];s.addEventListener('change',()=>{decisions[s.dataset.id]=s.value;renderMetrics()})});
  renderMetrics();
}
function renderMetrics(){
  const s=portfolioStats(decisions);
  el('groupMetrics').innerHTML=`<div class="metric"><span>YOUR GROUP</span><strong>${teamId||'—'}</strong><span>${team?.submitted?'Submitted · locked':'Decision in progress'}</span></div><div class="metric"><span>LOANS APPROVED</span><strong>${s.approved} / 7</strong><span>Minimum ${MIN_APPROVALS}</span></div><div class="metric"><span>LOAN BUDGET REMAINING</span><strong class="${s.remaining<0?'negative':''}">${dollars(s.remaining,0)}</strong><span>From ${dollars(STARTING_CASH,0)} starting cash</span></div>`;
  el('decisionSummary').innerHTML=`<strong>${dollars(s.committed,0)} committed</strong><div class="tiny muted">${s.valid?'Ready to submit':'Approve at least 3; do not exceed $1,000B'}</div>`;
  el('submitBtn').disabled=!!team?.submitted||!s.valid||gameConfig?.phase!=='open';
  el('submitBtn').textContent=team?.submitted?'Decisions locked':'Submit final decisions';
}
async function subscribeGroup(group){
  if(teamUnsub)teamUnsub(); teamId=group;
  teamUnsub=onSnapshot(doc(db,'teams',group),snap=>{
    team=snap.data(); if(!team){alertMsg('This group is not configured by the instructor.');return;}
    if(team.submitted)decisions={...team.decisions};
    show('join',false);show('game',true);
    renderLoans();renderReveals();
    if(team.submitted)alertMsg('Your decisions have been submitted and locked. Watch for the instructor reveal.','success');
    else status.innerHTML='';
  },e=>alertMsg('Group access error: '+e.message));
}
async function join(){
  const group=el('group').value; const pin=el('pin').value.trim().toUpperCase();
  if(!TEAM_IDS.includes(group)||!pin){alertMsg('Select a group and enter the group join code.');return;}
  el('joinBtn').disabled=true;
  try{
    await runTransaction(db,async tx=>{
      const teamRef=doc(db,'teams',group),claimRef=doc(db,'claims',uid);
      const s=await tx.get(teamRef);
      if(!s.exists())throw new Error('The instructor has not initialized this game.');
      if(s.data().ownerUid)throw new Error('This group already has a leader. Ask the instructor to reset that group.');
      tx.set(claimRef,{groupId:group,pin});
      tx.update(teamRef,{ownerUid:uid});
    });
    await subscribeGroup(group);
  }catch(e){alertMsg('Unable to join: '+e.message+'. Check your group code.');}
  finally{el('joinBtn').disabled=false;}
}
async function submit(){
  const s=portfolioStats(decisions);
  if(!s.valid){alertMsg('Approve at least 3 customers and keep the budget at or below $1,000B.');return;}
  if(!confirm(`Submit final decisions for ${teamId}? You cannot change them after submission.`))return;
  el('submitBtn').disabled=true;
  try{await updateDoc(doc(db,'teams',teamId),{decisions:{...decisions},submitted:true,submittedAt:serverTimestamp()});alertMsg('Final decisions submitted successfully.','success');}
  catch(e){alertMsg('Unable to submit: '+e.message);renderMetrics();}
}
async function loadRevealed(){
  if(!gameConfig||!['reveal','results'].includes(gameConfig.phase))return;
  const n=Math.min(gameConfig.revealCount||0,7);
  await Promise.all(COMPANIES.slice(0,n).filter(c=>!outcomes[c.id]).map(async c=>{
    try{let d=await getDoc(doc(db,'outcomes',c.id));if(d.exists())outcomes[c.id]=d.data();}
    catch(e){console.warn('Outcome unavailable',c.id,e);}
  }));
  renderReveals();
}
function renderReveals(){
  const phase=gameConfig?.phase||'open',count=gameConfig?.revealCount||0;
  show('reveal',!!team&&['reveal','results'].includes(phase));
  if(phase==='reveal'||phase==='results'){
    el('revealPhase').textContent=`${count} / 7 outcomes revealed`;
    el('revealDetails').innerHTML=COMPANIES.slice(0,count).map(c=>{
      const o=outcomes[c.id];if(!o)return '';
      const r=loanResult(c,'hold',o);
      const outcomeName=o.type==='default'?'DEFAULT':o.type==='refinanced'?'REFINANCED':'REPAID';
      return `<div class="revealLine"><div style="flex:1"><strong>${esc(c.name)}</strong> <span class="pill ${o.type==='default'?'lost':'done'}">${outcomeName}</span><div class="tiny muted">${esc(o.event)}</div><div class="tiny muted">Interest collected ${dollars(r.interest)} · Recovered principal ${dollars(r.recovered)} · Principal lost ${dollars(r.loss)} · Holding P/L <span class="${r.profit<0?'negative':'positive'}">${signedMoney(r.profit)}</span></div></div></div>`;
    }).join('')||'<div class="muted">The instructor has not revealed the first corporation yet.</div>';
  }
  show('results',!!team&&team.submitted&&phase==='results'&&count===7&&Object.keys(outcomes).length===7);
  if(team&&team.submitted&&phase==='results'&&count===7&&Object.keys(outcomes).length===7){
    const r=bankResult(team.decisions,outcomes);
    el('studentResults').innerHTML=`<div class="metrics"><div class="metric"><span>YOUR BANK PROFIT / LOSS</span><strong class="${r.profit<0?'negative':'positive'}">${signedMoney(r.profit)}</strong></div><div class="metric"><span>ENDING CASH</span><strong>${dollars(r.endingCash)}</strong></div><div class="metric"><span>LOANS APPROVED</span><strong>${r.approved}</strong></div></div><div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Corporation</th><th>Decision</th><th class="right">Interest</th><th class="right">Principal lost</th><th class="right">Fees</th><th class="right">P/L</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td>${esc(x.company.name)}</td><td>${friendlyDecision(x.decision)}</td><td class="right">${dollars(x.interest)}</td><td class="right">${dollars(x.loss)}</td><td class="right">${dollars(x.fee)}</td><td class="right ${x.profit<0?'negative':'positive'}">${signedMoney(x.profit)}</td></tr>`).join('')}</tbody></table></div>`;
  }
}
async function init(){
  if(firebaseConfig.apiKey.startsWith('PASTE_')){alertMsg('This app needs a Firebase project configuration. See README.md in the downloaded project.');return;}
  try{
    const app=initializeApp(firebaseConfig);db=getFirestore(app);auth=getAuth(app);
    onAuthStateChanged(auth,async u=>{
      try{
        if(!u){await signInAnonymously(auth);return;}
        if(!u.isAnonymous){await signOut(auth);await signInAnonymously(auth);return;}
        uid=u.uid;
        const claim=await getDoc(doc(db,'claims',uid));
        if(claim.exists())await subscribeGroup(claim.data().groupId);
        else show('join',true);
        if(configUnsub)configUnsub();
        configUnsub=onSnapshot(doc(db,'config','main'),s=>{
          gameConfig=s.data()||{phase:'setup',revealCount:0};renderMetrics();loadRevealed();
          if(gameConfig.phase!=='open'&&!teamId)alertMsg('The game is not accepting new decisions. Ask your instructor.');
        },e=>alertMsg('Cannot load game status: '+e.message));
      }catch(e){alertMsg('Connection error: '+e.message);}
    });
  }catch(e){alertMsg('Unable to initialize Firebase: '+e.message);}
}
el('joinBtn').addEventListener('click',join);el('pin').addEventListener('keydown',e=>{if(e.key==='Enter')join()});el('submitBtn').addEventListener('click',submit);renderLoans();init();
