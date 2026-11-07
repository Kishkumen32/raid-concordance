const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}, text) { const el = document.createElementNS(NS, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v); if (text) el.textContent = text; return el; }
export function timeline(container, data) {
  const start = Date.parse(`${data.normalizedRange.start}T00:00:00Z`), end = Date.parse(`${data.normalizedRange.endExclusive}T00:00:00Z`);
  const width = 1080, left = 24, right = 1050, top = 90, laneHeight = 100;
  // Calendar-date projection is deliberately shared; timestamps convert to the canonical local day first.
  const x = date => left + (Date.parse(`${date.slice(0,10)}T00:00:00Z`) - start) / (end-start) * (right-left);
  const height = top + laneHeight * data.participants.length + 40;
  const svg = svgEl('svg', {viewBox: `0 0 ${width} ${height}`, role:'img', 'aria-labelledby':'timeline-title timeline-description'});
  svg.append(svgEl('title', {id:'timeline-title'}, 'Synchronized character activity timelines'), svgEl('desc', {id:'timeline-description'}, `Shared calendar axis ${data.normalizedRange.start} to ${data.normalizedRange.endExclusive}. Hatched lanes mean unavailable continuous coverage, not zero activity. Individual observations are dots. Priority window is gold. Read individual activity cards and evidence ledger for accessible timestamps.`));
  const defs = svgEl('defs'); const pattern = svgEl('pattern', {id:'hatch', width:8,height:8,patternUnits:'userSpaceOnUse'}); pattern.append(svgEl('path',{d:'M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4',stroke:'#454a60','stroke-width':1})); defs.append(pattern); svg.append(defs);
  if (data.highlight) {
    const a = Math.max(left,x(data.highlight.start)), b = Math.min(right,x(data.highlight.end));
    svg.append(svgEl('rect',{x:a,y:36,width:Math.max(0,b-a),height:height-50,class:'highlight'}),svgEl('text',{x:(a+b)/2,y:22,'text-anchor':'middle'}, data.highlight.start.slice(0,7)));
  }
  let month = new Date(start); month.setUTCDate(1);
  const months = Math.ceil((end-start)/86400000/30), step = months > 18 ? 3 : 2;
  for (let i=0; month.getTime()<end; i++,month.setUTCMonth(month.getUTCMonth()+1)) {
    if (i%step) continue;
    const date=month.toISOString().slice(0,10), pos=x(date);
    if (pos<left) continue;
    svg.append(svgEl('line',{x1:pos,x2:pos,y1:45,y2:height-30,stroke:'#303a53'}),svgEl('text',{x:pos,y:48,'text-anchor':pos<60?'start':'middle'},date.slice(0,7)));
  }
  svg.append(svgEl('text',{x:right,y:height-6,'text-anchor':'end'},`End exclusive: ${data.normalizedRange.endExclusive}`));
  data.participants.forEach((p,i)=>{
    const y=top+i*laneHeight;
    svg.append(svgEl('text',{x:left,y:y-9,class:'lane-name'},p.name),svgEl('rect',{x:left,y:y+3,width:right-left,height:45,fill:'url(#hatch)',stroke:'#485069'}));
    if (p.contextualHistoryStart) {
      const pos=x(p.contextualHistoryStart+'-01');
      const marker=svgEl('line',{x1:pos,x2:pos,y1:y+3,y2:y+48,stroke:'#e6ca8c','stroke-dasharray':'4 4'});
      marker.append(svgEl('title',{},`Reported external history approximately ${p.contextualHistoryStart}; participant context, not independently retrieved or continuous coverage.`));
      svg.append(marker,svgEl('text',{x:pos+4,y:y+66},`Reported history ≈ ${p.contextualHistoryStart} (context)`));
    }
    for(const f of data.individualActivity[p.key].fights){
      const point=svgEl('circle',{cx:x(f.timestamp.local),cy:y+25,r:3.2,class:'point'}); point.append(svgEl('title',{},`${p.name}: ${f.timestamp.local}, ${f.result}, ${f.reportCode} fight ${f.fightID}`));svg.append(point);
    }
    for (const f of data.sharedFights){svg.append(svgEl('path',{d:`M${x(f.timestamp.local)},${y+17} l6,8 l-6,8 l-6,-8 Z`,class:'shared'}));}
    for (const f of data.candidateActivity){svg.append(svgEl('circle',{cx:x(f.timestamp.local),cy:y+25,r:6,fill:'none',stroke:'#b6a0ed','stroke-width':2}));}
  });
  container.replaceChildren(svg);
  const text=document.createElement('p');text.className='muted';text.textContent=`Normalized start for every participant: ${data.normalizedRange.start}. Dates use ${data.timezone}. No continuous coverage is asserted.`;container.append(text);
}
