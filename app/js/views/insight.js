// Indsigt: spørg jeres anmeldelser, stederne side om side og emner over tid.
import { state } from '../state.js';
import { avgByMonth, byProperty, monthKey, monthName, monthsBack, shiftMonth, since, summary, topicByMonth, topicCounts } from '../stats.js';
import { busy, esc, html, mount, raw } from '../ui.js';

const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const score = (x) => (x == null ? '–' : x.toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const PERIODS = { 90: 'Seneste 90 dage', 365: 'Seneste 12 måneder', 0: 'Alle anmeldelser' };
const SUGGESTIONS = ['Hvad klager gæsterne mest over?', 'Hvad skal vi forbedre først?', 'Hvad siger gæsterne om morgenmaden?', 'Hvad roser gæsterne mest?'];

const filters = { days: 365, place: 'all', topic: null };

export async function loadStats() {
  if (!state.stats || state.stats.org !== state.org.id || Date.now() - state.stats.at > 5 * 60000) {
    state.stats = { org: state.org.id, at: Date.now(), list: await state.api.reviewStats(state.org.id) };
  }
  return state.stats.list;
}

export async function renderInsight(view) {
  mount(view, html`<h1 class="page-title">Indsigt</h1><p class="loading">Henter anmeldelser</p>`);
  let all;
  try { all = await loadStats(); } catch (e) { mount(view, html`<h1 class="page-title">Indsigt</h1><p>${e.message}</p>`); return; }
  draw(view, all);
}

function draw(view, all) {
  const placeList = filters.place === 'all' ? all : all.filter((r) => r.property_id === filters.place);
  const periodList = filters.days ? since(placeList, filters.days) : placeList;
  const propsInPeriod = byProperty(filters.days ? since(all, filters.days) : all, state.properties);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const months = monthsBack(thisMonth, 12);
  const yearList = since(placeList, 366);
  const negTop = topicCounts(yearList, 'negative', 20), posTop = topicCounts(yearList, 'positive', 20);
  const topics = [...new Set([...negTop, ...posTop].map(([t]) => t))].sort((a, b) => a.localeCompare(b, 'da'));
  if (!filters.topic || !topics.includes(filters.topic)) filters.topic = negTop[0]?.[0] ?? posTop[0]?.[0] ?? null;
  const placeName = filters.place === 'all' ? 'alle steder' : state.properties.find((p) => p.id === filters.place)?.name;
  const lastMonth = shiftMonth(thisMonth, -1);

  mount(view, html`<div class="insight">
    <div class="insight-head">
      <h1 class="page-title">Indsigt</h1>
      <a class="secondary" href="#/rapport/${lastMonth}">Månedsrapport for ${monthName(lastMonth)}</a>
    </div>
    <div class="filter-row" role="group" aria-label="Filtre">
      <label><span class="sr-only">Periode</span><select id="fDays">${Object.entries(PERIODS).map(([v, l]) => html`<option value="${v}" ${Number(v) === filters.days ? 'selected' : ''}>${l}</option>`)}</select></label>
      ${state.properties.length > 1 ? html`<label><span class="sr-only">Sted</span><select id="fPlace"><option value="all">Alle steder</option>${state.properties.map((p) => html`<option value="${p.id}" ${p.id === filters.place ? 'selected' : ''}>${p.name}</option>`)}</select></label>` : ''}
    </div>

    <section class="panel ask-panel" aria-labelledby="askTitle">
      <h2 id="askTitle">Spørg jeres anmeldelser</h2>
      <p class="hint">Stil et spørgsmål, så læser Ekkoly anmeldelserne for ${placeName} (${PERIODS[filters.days].toLowerCase()}) og svarer med eksempler.</p>
      <form id="askForm" class="stack-tight">
        <label class="sr-only" for="askQ">Spørgsmål</label>
        <textarea id="askQ" name="q" rows="2" required minlength="4" maxlength="500" placeholder="Fx: Hvad klager gæsterne over på værelserne?"></textarea>
        <div class="chips">${SUGGESTIONS.map((s) => html`<button type="button" class="chip" data-suggest="${s}">${s}</button>`)}</div>
        <div class="actions"><button class="primary" type="submit">Spørg</button></div>
      </form>
      <div id="askOut" aria-live="polite"></div>
    </section>

    <section class="panel" aria-labelledby="cmpTitle">
      <h2 id="cmpTitle">Stederne side om side</h2>
      <p class="hint">${PERIODS[filters.days]}. Karakterer er omregnet til 10-skala, så Google (af 5) og Booking.com (af 10) kan sammenlignes.</p>
      ${propsInPeriod.length ? html`<div class="table-scroll"><table class="scores compare keep-cols">
        <thead><tr><th scope="col">Sted</th><th scope="col">Anmeldelser</th><th scope="col">Gennemsnit <span class="muted">af 10</span></th><th scope="col">Besvaret</th><th scope="col">Mest ros</th><th scope="col">Mest kritik</th></tr></thead>
        <tbody>${propsInPeriod.map((x) => html`<tr>
          <th scope="row">${x.property.name}</th><td>${x.count}</td><td><strong>${score(x.avg10)}</strong></td><td>${pct(x.replyRate)}</td>
          <td>${x.praise ? html`${x.praise[0]} <span class="muted">(${x.praise[1]})</span>` : '–'}</td>
          <td>${x.critique ? html`${x.critique[0]} <span class="muted">(${x.critique[1]})</span>` : '–'}</td></tr>`)}</tbody>
        <tfoot><tr><th scope="row">I alt</th>${(() => { const s = summary(filters.days ? since(all, filters.days) : all); return html`<td>${s.count}</td><td><strong>${score(s.avg10)}</strong></td><td>${pct(s.replyRate)}</td><td></td><td></td>`; })()}</tr></tfoot>
      </table></div>` : html`<p class="hint">Ingen anmeldelser i perioden.</p>`}
    </section>

    <section class="panel" aria-labelledby="trendTitle">
      <h2 id="trendTitle">Emner over tid</h2>
      <p class="hint">Hvor mange anmeldelser der roser og kritiserer emnet, måned for måned de seneste 12 måneder, ${placeName}.</p>
      ${filters.topic ? html`
        <label class="field topic-pick"><span>Emne</span><select id="fTopic">${topics.map((t) => html`<option value="${t}" ${t === filters.topic ? 'selected' : ''}>${t}</option>`)}</select></label>
        ${topicChart(topicByMonth(placeList, filters.topic, months), filters.topic)}
        ${scoreTable(avgByMonth(placeList, months))}`
      : html`<p class="hint">Emnerne kommer, når anmeldelserne er analyseret.</p>`}
    </section>
  </div>`);

  view.querySelector('#fDays')?.addEventListener('change', (e) => { filters.days = Number(e.target.value); draw(view, all); });
  view.querySelector('#fPlace')?.addEventListener('change', (e) => { filters.place = e.target.value; draw(view, all); });
  view.querySelector('#fTopic')?.addEventListener('change', (e) => { filters.topic = e.target.value; draw(view, all); });
  const q = view.querySelector('#askQ');
  view.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => { q.value = b.dataset.suggest; q.focus(); }));
  view.querySelector('#askForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const out = view.querySelector('#askOut');
    const button = e.target.querySelector('button[type=submit]');
    mount(out, html`<p class="loading">Ekkoly læser anmeldelserne. Det tager typisk 10–30 sekunder.</p>`);
    busy(button, async () => {
      try {
        const res = await state.api.ask(state.org.id, q.value.trim(), filters.place === 'all' ? null : filters.place, filters.days);
        const byId = new Map(all.map((r) => [r.id, r]));
        mount(out, html`<div class="ask-answer">
          ${res.answer.split(/\n+/).filter(Boolean).map((p) => html`<p>${p.replace(/^[-•*]\s*/, '')}</p>`)}
          ${res.examples.length ? html`<h3>Eksempler</h3><ul class="ask-examples">${res.examples.map((x) => {
            const r = byId.get(x.review_id);
            return html`<li><a href="#/anmeldelse/${x.review_id}"><q>${x.quote}</q></a><span class="muted">${r ? `${r.author ?? 'Gæst'}, ${state.properties.find((p) => p.id === r.property_id)?.name ?? ''}` : ''}</span></li>`;
          })}</ul>` : ''}
          <p class="hint">Bygger på ${res.count} ${res.count === 1 ? 'anmeldelse' : 'anmeldelser'}. Svaret er lavet af AI ud fra jeres anmeldelser, så tjek eksemplerne, før I handler på det.</p>
        </div>`);
      } catch (err) {
        mount(out, '');
        throw err;
      }
    });
  });
}

// Søjler op for ros og ned for kritik, én måned pr. søjlepar. Tal står i tabellen under.
function topicChart(data, topic) {
  const w = 640, h = 200, padL = 28, padB = 26, mid = (h - padB) / 2;
  const max = Math.max(1, ...data.map((d) => Math.max(d.pos, d.neg)));
  const step = (w - padL) / data.length, bw = Math.min(22, step * 0.5);
  const y = (n) => (n / max) * (mid - 10);
  const bars = data.map((d, i) => {
    const x = padL + i * step + (step - bw) / 2;
    const label = `${monthName(d.month)}: ${d.pos} roser, ${d.neg} kritiserer ${topic}`;
    const up = d.pos ? `<rect class="bar-up" x="${x}" y="${mid - y(d.pos)}" width="${bw}" height="${y(d.pos)}" rx="3"/>` : '';
    const down = d.neg ? `<rect class="bar-down" x="${x}" y="${mid + 1}" width="${bw}" height="${y(d.neg)}" rx="3"/>` : '';
    const tick = `<text class="axis" x="${x + bw / 2}" y="${h - 8}" text-anchor="middle">${esc(monthName(d.month).slice(0, 3))}</text>`;
    return `<g class="bar-group"><rect class="hit" x="${padL + i * step}" y="0" width="${step}" height="${h - padB}"><title>${esc(label)}</title></rect>${up}${down}${tick}</g>`;
  }).join('');
  const total = data.reduce((a, d) => ({ pos: a.pos + d.pos, neg: a.neg + d.neg }), { pos: 0, neg: 0 });
  return html`<figure class="topic-chart">
    <div class="legend"><span><i class="key key-up"></i>Ros (${total.pos})</span><span><i class="key key-down"></i>Kritik (${total.neg})</span></div>
    ${raw(`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${topic}: ${total.pos} roser og ${total.neg} kritiserer de seneste 12 måneder`)}">
      <line class="baseline" x1="${padL}" x2="${w}" y1="${mid}" y2="${mid}"/>
      <text class="axis" x="${padL - 6}" y="${mid - y(max) + 4}" text-anchor="end">${max}</text>
      <text class="axis" x="${padL - 6}" y="${mid + y(max) + 4}" text-anchor="end">${max}</text>
      ${bars}</svg>`)}
    <details><summary>Vis som tabel</summary>
      <table class="scores small keep-cols"><thead><tr><th scope="col">Måned</th><th scope="col">Ros</th><th scope="col">Kritik</th></tr></thead>
      <tbody>${data.map((d) => html`<tr><th scope="row">${monthName(d.month)}</th><td>${d.pos}</td><td>${d.neg}</td></tr>`)}</tbody></table>
    </details>
  </figure>`;
}

function scoreTable(rows) {
  const shown = rows.filter((r) => r.count);
  if (!shown.length) return '';
  return html`<details class="month-scores"><summary>Gennemsnit og antal måned for måned</summary>
    <table class="scores small keep-cols"><thead><tr><th scope="col">Måned</th><th scope="col">Anmeldelser</th><th scope="col">Gennemsnit <span class="muted">af 10</span></th><th scope="col">Besvaret</th></tr></thead>
    <tbody>${shown.map((r) => html`<tr><th scope="row"><a href="#/rapport/${monthKey(r.month + '-01')}">${monthName(r.month)}</a></th><td>${r.count}</td><td>${score(r.avg10)}</td><td>${pct(r.replyRate)}</td></tr>`)}</tbody></table>
  </details>`;
}
