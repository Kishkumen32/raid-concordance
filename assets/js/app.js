const base = new URL('../../', import.meta.url);
const cards = document.querySelector('#comparison-cards');
const status = document.querySelector('#result-count');
const search = document.querySelector('#search');
const world = document.querySelector('#world');
const encounter = document.querySelector('#encounter');
function element(tag, text, className) { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; }
try {
  const response = await fetch(new URL('data/comparisons.json', base));
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  const {comparisons} = await response.json();
  for (const w of [...new Set(comparisons.flatMap(c => c.participants.map(p => p.world)))].sort()) world.add(new Option(w, w));
  for (const e of [...new Set(comparisons.map(c => c.encounter))].sort()) encounter.add(new Option(e, e));
  function render() {
    const terms = search.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = comparisons.filter(c => {
      const haystack = [c.title, c.encounter, ...c.participants.flatMap(p => [p.name, p.world, p.region])].join(' ').toLocaleLowerCase();
      return terms.every(t => haystack.includes(t)) && (!world.value || c.participants.some(p => p.world === world.value)) && (!encounter.value || c.encounter === encounter.value);
    });
    cards.replaceChildren();
    status.textContent = `${matches.length} published comparison${matches.length === 1 ? '' : 's'} found.`;
    for (const c of matches) {
      const card = element('article', '', 'comparison-card');
      card.append(element('span', c.classification, 'badge'), element('h3', c.participants.map(p => p.name).join(' + ')), element('p', c.encounter, 'lead'));
      const dl = element('dl');
      for (const [label, value] of [['Worlds', c.participants.map(p => `${p.world} (${p.region})`).join(' · ')], ['Period', `${c.start} → ${c.endExclusive} (end exclusive)`], ['Updated', c.updated.slice(0,10)]]) dl.append(element('dt', label), element('dd', value));
      const link = element('a', 'Read comparison →', 'button'); link.href = new URL(`comparisons/${c.slug}/`, base); card.append(dl, link); cards.append(card);
    }
    if (!matches.length) cards.append(element('p', 'No matching published comparisons. Try another character, world, or encounter.', 'empty'));
  }
  for (const control of [search, world, encounter]) control.addEventListener('input', render);
  render();
} catch (error) { status.textContent = `Unable to load published comparisons: ${error.message}. Use the static comparison index.`; const a = element('a', 'Browse comparisons'); a.href = new URL('comparisons/', base); cards.append(a); }
