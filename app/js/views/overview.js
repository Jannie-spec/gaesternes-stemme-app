import { state } from '../state.js';
import { platformName } from '../platforms.js';
import { date, esc, html, mount, raw } from '../ui.js';

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
    ${rows.map(({ p, lines }) => html`<section class="panel">
      <h2>${p.name}</h2>
      ${lines.length ? html`<table class="scores">
        <thead><tr><th scope="col">Platform</th><th scope="col">Bedømmelse nu</th><th scope="col">Anmeldelser</th><th scope="col">Siden ${date(lines[0].first.observed_at)}</th><th scope="col"><span class="sr-only">Udvikling</span></th></tr></thead>
        <tbody>${lines.map((l) => html`<tr>
          <th scope="row">${platformName(l.platform)}</th>
          <td><strong>${num(l.last.rating)}</strong> <span class="muted">af ${l.last.scale}</span></td>
          <td>${l.last.review_count ?? ''}</td>
          <td class="${l.change > 0.001 ? 'up' : l.change < -0.001 ? 'down' : ''}">${Math.abs(l.change) < 0.001 ? 'Uændret' : `${l.change > 0 ? 'Op' : 'Ned'} ${num(Math.abs(l.change))}`}</td>
          <td>${sparkline(l.pts, Number(l.last.scale))}</td>
        </tr>`)}</tbody></table>`
      : html`<p class="hint">Ingen bedømmelser målt endnu. De kommer, når Google er forbundet, eller når I importerer tal.</p>`}
    </section>`)}
    <section class="panel">
      <h2>Konkurrenter</h2>
      <p class="hint">Vælg 3 til 5 steder i nærheden og følg deres bedømmelser side om side med jeres. Kræver, at Google er forbundet under Indstillinger. Funktionen er den næste, der bliver bygget.</p>
    </section>`);
}
