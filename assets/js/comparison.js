import {timeline} from './timeline.js';
const $ = selector => document.querySelector(selector);
const el = (tag, text='', cls='') => {const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
const link = (url,text) => {const a=el('a',text);a.href=url;return a;};
const pretty = (iso,tz) => new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'long',timeZone:tz}).format(new Date(iso));
try {
  const response=await fetch(new URL('data.json',location.href));
  if(!response.ok)throw new Error(`Evidence HTTP ${response.status}`);
  const d=await response.json();
  const names=new Map(d.participants.map(p=>[p.key,p.name]));
  const local = f => pretty(f.timestamp.utc,d.timezone);
  $('#classification').textContent=d.classification;
  $('#finding').textContent=d.sharedFights.length?'Shared logged encounter participation verified.':'No shared fight verified in examined records. Actual shared raid history remains unresolved.';
  $('#range').textContent=`${d.requestedRange.start} → ${d.requestedRange.endExclusive} (end exclusive) · ${d.timezone}`;
  const latest=d.sharedFights.at(-1);
  const latestLocal=latest?new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3,hourCycle:'h23',timeZoneName:'short',timeZone:d.timezone}).format(new Date(latest.timestamp.utc)):'';
  if(latest)$('#latest').append(el('strong',`Latest verified shared ${d.encounter.shortName || 'encounter'} fight: ${latestLocal} · ${latest.timestamp.utc} `),link(latest.url,'FFLogs fight ↗'));
  else $('#latest').textContent='Most recent verified shared pull: not established. Zero verified matches does not mean zero actual shared raids.';
  for(const [value,label] of [[d.sharedFights.length,'Verified shared pull records'],[d.sharedSessions.length,'Verified shared session clusters'],[d.reportsExamined,'Reports examined'],[d.encounterFightsEvaluated,'Encounter fights evaluated'],['Partial','Historical coverage'],[d.investigatedAt.slice(0,10),'Investigation date (UTC)']]) {const stat=el('div','','stat');stat.append(el('strong',String(value)),el('span',label));$('#stats').append(stat);}
  $('#stats').after(el('p',`Evidence snapshot: ${pretty(d.investigatedAt,d.timezone)} / ${d.investigatedAt}`,'muted'));
  if(d.publicRelease){const r=d.publicRelease;$('#latest').after(el('p',`${r.laterCachedEncounterFightsChecked.toLocaleString()} later cached ${d.encounter.shortName || 'encounter'} fights and ${r.priorityReportsChecked} additional priority reports checked: no newer shared fight found. ${r.broaderUnresolvedReports.toLocaleString()} broader candidates remain unresolved. This is the latest verified logged fight, not an exhaustively proven last actual instance.`, 'callout'));}
  timeline($('#timeline-chart'),d);
  for(const p of d.participants){const a=d.individualActivity[p.key];const note=el('p',`${p.name}: ${a.firstObserved ? `earliest encounter observation ${pretty(a.firstObserved.utc,d.timezone)}; latest ${pretty(a.lastObserved.utc,d.timezone)}.`:'No verified encounter observations returned.'} ${p.contextualHistoryStart ? `Reported Tomestone availability approximately ${p.contextualHistoryStart} onward (participant context; not independently retrieved).`:''} All other periods remain unobserved, not verified inactivity.`);$('#coverage-notes').append(note);}
  if(d.highlight){
    $('#priority').hidden=false;$('#priority-title').textContent=d.highlight.title;
    for(const note of d.contextNotes)$('#context').append(el('p',note));
    const inWindow=f=>f.timestamp.local.slice(0,10)>=d.highlight.start && f.timestamp.local.slice(0,10)<d.highlight.end;
    const shared=d.sharedFights.filter(inWindow), candidates=d.candidateActivity.filter(inWindow);
    $('#priority-findings').append(el('p',`${shared.length} verified shared fights; ${candidates.length} candidate shared fights in this priority window. ${shared.length ? 'See direct fight evidence below.':'No exact shared timestamp is established by this scan.'}`));
    const byDay=new Map();
    for(const f of [...shared,...candidates].sort((a,b)=>a.timestamp.utc.localeCompare(b.timestamp.utc))){const day=f.timestamp.local.slice(0,10);const bucket=byDay.get(day)||{shared:0,candidates:0,latest:f};bucket[f.classification==='Verified'?'shared':'candidates']++;bucket.latest=f;byDay.set(day,bucket);}
    const dates=el('ul');for(const [day,bucket] of [...byDay].slice(-12)){const row=el('li',`${day}: ${bucket.shared} verified shared report/fight records; ${bucket.candidates} candidates. `);row.append(link(bucket.latest.url,'Latest observed fight that day ↗'));dates.append(row);}$('#priority-findings').append(dates);
    if(byDay.size>12)$('#priority-findings').append(el('p','Showing the latest 12 observed dates; all fight records are available in the evidence ledger.'));
    $('#priority-findings').append(link('#evidence','Inspect all fight-level evidence ↓'));
    $('#priority-findings').append(el('p','The discovery audit and investigation report identify searched public, uploader, and guild collections. Missing or capped collections remain limitations; participant recollection remains separate from verified evidence.','muted'));
  }
  if(!d.sharedSessions.length)$('#session-list').append(el('p','No shared logged session verified. No instance entry or exit time can be inferred.','empty'));
  for(const s of d.sharedSessions){const card=el('details','','session');card.append(el('summary',`${pretty(s.first.utc,d.timezone)} · ${s.pulls} shared report/fight records`));card.append(el('h3',pretty(s.first.utc,d.timezone)),el('p',`${d.encounter.name} · ${s.pulls} shared pulls · ${s.wipes} wipes · ${s.clears} clears`),el('p',`First observed logged pull: ${pretty(s.first.utc,d.timezone)}. Last observed logged pull: ${pretty(s.last.utc,d.timezone)}.`));card.append(link(s.evidence[0],'First observed pull ↗'),el('span',' · '),link(s.evidence.at(-1),'Last observed pull ↗'));const detail=el('details');detail.append(el('summary',`${s.evidence.length} direct pull evidence links`));s.evidence.forEach((url,i)=>detail.append(link(url,`Pull ${i+1} ↗ `)));card.append(detail);$('#session-list').append(card);}
  for(const p of d.participants){const activity=d.individualActivity[p.key],first=activity.fights[0],last=activity.fights.at(-1);const card=el('article','','panel');card.append(el('h3',p.name),el('p',`${p.world} (${p.region}) · ${activity.fights.length} individually verified encounter records`));for(const [label,f] of [['Earliest observed',first],['Latest observed',last]])card.append(el('p',f?`${label}: ${local(f)} / ${f.timestamp.utc}`:`${label}: unavailable`));if(last)card.append(link(last.url,'Latest observed fight ↗'));if(p.tomestone)card.append(el('p',''),link(p.tomestone,'Tomestone activity (may require human verification) ↗'));$('#individual-cards').append(card);}
  d.coverage.limitations.forEach(text=>$('#limitations').append(el('li',text)));
  for(const c of d.discoveryCollections){const row=el('tr');row.append(el('td',`${c.source} ${c.participant || JSON.stringify(c.scope || {})}`),el('td',c.description || (c.window?`${c.window.start} → ${c.window.end} (exclusive), zone ${c.zoneID}`:'Recent history, not date filtered')),el('td',String(c.reports)),el('td',`${c.pages == null ? 'Metadata scope' : c.pages+' pages'} · ${c.truncated?'INCOMPLETE COVERAGE':'reviewed scope complete, not global coverage'}`));$('#collection-body').append(row);}
  const unique=new Map();for(const a of Object.values(d.individualActivity))for(const f of a.fights)unique.set(`${f.reportCode}-${f.fightID}`,f);for(const f of d.candidateActivity)unique.set(`${f.reportCode}-${f.fightID}`,f);
  const all=[...unique.values()]; let sortKey='timestamp',direction=1,page=0;const pageSize=50;
  function renderLedger(){
    let rows=$('#evidence-filter').value==='shared'?d.sharedFights:$('#evidence-filter').value==='candidate'?d.candidateActivity:all;
    rows=[...rows].sort((a,b)=>{const av=sortKey==='timestamp'?a.timestamp.utc:a[sortKey],bv=sortKey==='timestamp'?b.timestamp.utc:b[sortKey];return direction*(typeof av==='number'?av-bv:String(av).localeCompare(String(bv)));});
    const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.max(0,Math.min(page,pages-1));$('#ledger-body').replaceChildren();
    for(const f of rows.slice(page*pageSize,(page+1)*pageSize)){
      const tr=el('tr'),date=el('td',local(f));date.append(el('small',f.timestamp.utc));
      const verification=[...f.participants.map(k=>`${names.get(k)} verified`),...(f.uncertainParticipants||[]).map(k=>`${names.get(k)} uncertain`)].join('; ');
      const source=el('td');source.append(link(f.url,'FFLogs fight ↗'));
      tr.append(date,el('td',f.reportCode),el('td',String(f.fightID)),el('td',f.encounter),el('td',f.result),el('td',`${f.classification}: ${verification}. ${f.verification}`),source);$('#ledger-body').append(tr);
    }
    $('#ledger-count').textContent=`${rows.length} evidence records. Individual records are not necessarily shared fights.`;
    if(!rows.length){const tr=el('tr'),cell=el('td','No records in this evidence class. This is not proof of no actual shared raids.');cell.colSpan=7;tr.append(cell);$('#ledger-body').append(tr);}
    $('#page-label').textContent=`Page ${page+1} of ${pages}`;$('#previous').disabled=page===0;$('#next').disabled=page===pages-1;
  }
  document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.sort;direction=key===sortKey?-direction:1;sortKey=key;document.querySelectorAll('th[aria-sort]').forEach(th=>th.removeAttribute('aria-sort'));button.parentElement.setAttribute('aria-sort',direction===1?'ascending':'descending');page=0;renderLedger();}));
  $('#evidence-filter').addEventListener('change',()=>{page=0;renderLedger();});$('#previous').addEventListener('click',()=>{page--;renderLedger();});$('#next').addEventListener('click',()=>{page++;renderLedger();});renderLedger();
} catch(error){$('#load-error').hidden=false;$('#load-error').textContent=`Unable to render comparison: ${error.message}. Consult the investigation report and public JSON.`;}
