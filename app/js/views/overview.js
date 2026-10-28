import { isLeader, state } from '../state.js';
import { platformName } from '../platforms.js';
import { busy, date, esc, html, mount, raw, toast } from '../ui.js';

const num = (v) => Number(v).toLocaleString('da-DK', { maximumFractionDigits: 2 });

// Lille kurve for én platform på ét sted. Hver kurve har sin egen akse, fordi
// platformene bruger forskellige skalaer (5, 6 eller 10). De lægges aldrig sammen.
function sparkline(points, scale) {
  if (points.length < 2) return '';
  const w = 160, h = 40, pad = 4;
  const vals = points.map((p) => Number(p.rating));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, scale * 0.04); // undgå at små udsving ligner store fald
  const mid = (lo + hi) / 2;
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v) => h / 2 - ((v - mid) / span) * (h - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(Number(p.rating)).toFixed(1)}`).join('');
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(Number(p.rating)).toFixed(1)}" r="${i === points.length - 1 ? 4 : 9}" class="${i === points.length - 1 ? 'spark-end' : 'spark-hit'}"><title>${esc(date(p.observed_at))}: ${esc(num(p.rating))} af ${scale}</title></circle>`).join('');
  return raw(`<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Udvikling fra ${esc(num(vals[0]))} til ${esc(num(vals.at(-1)))}"><path d="${d}" class="spark-line"/>${dots}</svg>`);
}

export async function renderOverview(view) {
  const competitors = await state.api.competitors(state.org.id).catch(() => []);
  mount(view, html`<h1 class="page-title">Overblik</h1><p class="loading">Henter bedømmelser</p>`);
  const snaps = await state.api.snapshots(state.org.id);

  const rows = state.properties.map((p) => {
    const byPlatform = {};
    for (const s of snaps.filter((s) => s.property_id === p.id)) (byPlatform[s.platform] ??= []).push(s);
    const lines = Object.entries(byPlatform).map(([platform, pts]) => {
      pts.sort((a, b) => a.observed_at.localeCompare(b.observed_at));
      const first = pts[0], last = pts.at(-1);
      const change = Number(last.rating) - Number(first.rating);
      return { platform, pts, first, last, change };
    }).sort((a, b) => a.platform.localeCompare(b.platform));
    return { p, lines };
  });

  const open = state.queue.filter((r) => ['unanswered', 'awaiting_approval', 'approved'].includes(r.reply_status) && !r.removal_hold).length;
  const answered30 = state.queue.filter((r) => r.reply_status === 'posted' && r.owner_reply_at && Date.now() - new Date(r.owner_reply_at) < 30 * 86400000).length;

  mount(view, html`<h1 class="page-title">Overblik</h1>
    <p class="summary">${open} ${open === 1 ? 'anmeldelse venter' : 'anmeldelser venter'} på svar. ${answered30} besvaret de seneste 30 dage.</p>
    ${topicsPanel(state.queue)}
    ${rows.map(({ p, lines }) => html`<section class="panel">
      <h2>${p.name}</h2>
      ${lines.length ? html`<table class="scores">
        <thead><tr><th scope="col">Platform</th><th scope="col">Bedømmelse nu</th><th scope="col">Anmeldelser</th><th scope="col">Siden ${date(lines[0].first.observed_at)}</th><th scope="col" class="trend-col"><span class="sr-only">Udvikling</span></th></tr></thead>
        <tbody>${lines.map((l) => html`<tr>
          <th scope="row">${platformName(l.platform)}</th>
          <td><strong>${num(l.last.rating)}</strong> <span class="muted">af ${l.last.scale}</span></td>
          <td>${l.last.review_count ?? ''}</td>
          <td class="${l.change > 0.001 ? 'up' : l.change < -0.001 ? 'down' : ''}">${Math.abs(l.change) < 0.001 ? 'Uændret' : `${l.change > 0 ? 'Op' : 'Ned'} ${num(Math.abs(l.change))}`}</td>
          <td class="trend-col">${sparkline(l.pts, Number(l.last.scale))}</td>
        </tr>`)}</tbody></table>`
      : html`<p class="hint">Ingen bedømmelser målt endnu. De kommer, når Google er forbundet, eller når I importerer tal.</p>`}
    </section>`)}
    <section class="panel" id="competitors">
      <h2>Konkurrenter på Google</h2>
      <p class="hint">Følg op til 5 steder i nærheden for hvert af jeres steder. Bedømmelserne måles hver nat, så I kan se, om I halter efter eller trækker fra.</p>
      ${state.properties.map((p) => competitorBlock(p, competitors.filter((c) => c.property_id === p.id), snaps))}
    </section>`);
  wireCompetitors(view, () => renderOverview(view));
}

// Seneste og første måling inden for de sidste 30 dage
function trend(points) {
  if (!points.length) return { last: null, change: null };
  const last = points.at(-1);
  const since = Date.now() - 30 * 86400000;
  // Sammenlign med den nyeste måling, der er mindst 30 dage gammel, ellers den ældste vi har
  const base = [...points].reverse().find((p) => new Date(p.observed_at).getTime() <= since) ?? points[0];
  return { last, change: base === last ? null : Number(last.rating) - Number(base.rating) };
}
const changeCell = (c) => c == null || Math.abs(c) < 0.001
  ? html`<td class="muted">Uændret</td>`
  : html`<td class="${c > 0 ? 'up' : 'down'}">${c > 0 ? 'Op' : 'Ned'} ${num(Math.abs(c))}</td>`;

function competitorBlock(p, list, snaps) {
  const own = snaps.filter((s) => s.property_id === p.id && s.platform === 'google').sort((a, b) => a.observed_at.localeCompare(b.observed_at));
  const ownT = trend(own);
  const leader = isLeader();
  if (!list.length && !leader) return '';
  return html`<div class="competitor-block">
    <h3>${p.name}</h3>
    ${list.length || ownT.last ? html`<table class="scores">
      <thead><tr><th scope="col">Sted</th><th scope="col">Google nu</th><th scope="col">Anmeldelser</th><th scope="col">Sidste 30 dage</th>${leader ? html`<th scope="col"><span class="sr-only">Fjern</span></th>` : ''}</tr></thead>
      <tbody>
        ${ownT.last ? html`<tr class="own"><th scope="row">${p.name} (jer)</th><td><strong>${num(ownT.last.rating)}</strong> <span class="muted">af 5</span></td><td>${ownT.last.review_count ?? ''}</td>${changeCell(ownT.change)}${leader ? html`<td></td>` : ''}</tr>` : ''}
        ${list.map((c) => { const t = trend(c.snapshots); return html`<tr>
          <th scope="row">${c.name}${c.address ? html`<small class="muted">${c.address}</small>` : ''}</th>
          <td>${t.last ? html`<strong>${num(t.last.rating)}</strong> <span class="muted">af 5</span>` : html`<span class="muted">Måles i nat</span>`}</td>
          <td>${t.last?.review_count ?? ''}</td>${changeCell(t.change)}
          ${leader ? html`<td><button type="button" class="link quiet" data-remove-competitor="${c.id}">Fjern</button></td>` : ''}</tr>`; })}
      </tbody></table>` : ''}
    ${leader && list.length < 5 ? html`<form class="inline-form" data-competitor-search="${p.id}">
      <input name="q" required minlength="3" placeholder="Søg fx: hotel Gudhjem" aria-label="Søg efter konkurrent til ${p.name}">
      <button class="secondary" type="submit">Søg</button></form>
      <ul class="search-results" data-results-for="${p.id}"></ul>` : ''}
  </div>`;
}

function wireCompetitors(view, rerender) {
  view.querySelectorAll('[data-competitor-search]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const propertyId = form.dataset.competitorSearch;
    const out = view.querySelector(`[data-results-for="${propertyId}"]`);
    busy(form.querySelector('button'), async () => {
      const hits = await state.api.searchCompetitors(state.org.id, form.q.value.trim());
      mount(out, hits.length ? html`${hits.map((h) => html`<li><span><strong>${h.name}</strong><small class="muted">${h.address ?? ''}${h.rating ? `, ${num(h.rating)} af 5 (${h.review_count ?? 0})` : ''}</small></span>
        <button type="button" class="secondary" data-add-place="${h.place_id}">Følg</button></li>`)}` : html`<li class="muted">Ingen steder fundet. Prøv med by eller adresse.</li>`);
      out.querySelectorAll('[data-add-place]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
        await state.api.addCompetitor(state.org.id, propertyId, b.dataset.addPlace);
        toast('Konkurrenten er tilføjet.');
        await rerender();
      })));
    });
  }));
  view.querySelectorAll('[data-remove-competitor]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    await state.api.removeCompetitor(b.dataset.removeCompetitor);
    await rerender();
  })));
}

// Ros og kritik pr. emne de seneste 90 dage. Tallet er antal anmeldelser, der nævner emnet.
function topicsPanel(queue) {
  const since = Date.now() - 90 * 86400000;
  const recent = queue.filter((r) => r.topics?.length && new Date(r.published_at || r.first_seen_at).getTime() >= since);
  if (!recent.length) return '';
  const count = (sentiment) => {
    const m = new Map();
    for (const r of recent) for (const t of r.topics) if (t.sentiment === sentiment) m.set(t.topic, (m.get(t.topic) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const pos = count('positive'), neg = count('negative');
  const max = Math.max(1, ...pos.map((x) => x[1]), ...neg.map((x) => x[1]));
  const list = (items, cls) => items.length
    ? html`<ul class="topic-bars">${items.map(([t, n]) => html`<li><span class="topic-name">${t}</span><span class="bar ${cls}" style="--w:${Math.round((n / max) * 100)}%"></span><span class="topic-n">${n}</span></li>`)}</ul>`
    : html`<p class="hint">Intet endnu.</p>`;
  return html`<section class="panel topics-panel">
    <h2>Det siger gæsterne</h2>
    <p class="hint">Emner fra ${recent.length} ${recent.length === 1 ? 'anmeldelse' : 'anmeldelser'} de seneste 90 dage, alle steder.</p>
    <div class="topic-cols">
      <div><h3>Mest ros</h3>${list(pos, 'bar-pos')}</div>
      <div><h3>Mest kritik</h3>${list(neg, 'bar-neg')}</div>
    </div>
  </section>`;
}
