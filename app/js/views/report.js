// Månedsrapport: én side pr. måned, som kan gemmes som PDF med browserens "Udskriv".
import { state } from '../state.js';
import { platformName } from '../platforms.js';
import { byPlatform, byProperty, inMonth, monthName, quotes, shiftMonth, summary, to10, topicCounts } from '../stats.js';
import { date, html, mount } from '../ui.js';
import { loadStats } from './insight.js';

const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)} %`);
const one = (x) => (x == null ? '–' : x.toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

function delta(now, before, { unit = '', digits = 1, factor = 1, higherIsBetter = true } = {}) {
  if (now == null || before == null) return '';
  const d = (now - before) * factor;
  if (Math.abs(d) < (digits ? 0.05 : 0.5)) return html`<span class="delta">som måneden før</span>`;
  const good = higherIsBetter ? d > 0 : d < 0;
  return html`<span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('da-DK', { maximumFractionDigits: digits })}${unit} fra måneden før</span>`;
}

export async function renderReport(view, key) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(key ?? '')) key = shiftMonth(thisMonth, -1);
  mount(view, html`<p class="loading">Laver rapporten</p>`);
  let all;
  try { all = await loadStats(); } catch (e) { mount(view, html`<p>${e.message}</p>`); return; }

  const cur = inMonth(all, key), prev = inMonth(all, shiftMonth(key, -1));
  const s = summary(cur), p = summary(prev);
  const props = byProperty(cur, state.properties);
  const prevProps = new Map(byProperty(prev, state.properties).map((x) => [x.property.id, x]));
  const plats = byPlatform(cur);
  const posNow = topicCounts(cur, 'positive'), negNow = topicCounts(cur, 'negative');
  const prevCount = (sentiment) => new Map(topicCounts(prev, sentiment, 50));
  const posPrev = prevCount('positive'), negPrev = prevCount('negative');
  const { best, worst } = quotes(cur, 3);
  const place = (r) => state.properties.find((x) => x.id === r.property_id)?.name ?? '';
  const quoteText = (r) => { const t = (r.body || r.title || '').replace(/\s+/g, ' ').trim(); return t.length > 260 ? `${t.slice(0, 257)}…` : t; };

  mount(view, html`<article class="report">
    <div class="report-tools no-print">
      <a href="#/indsigt">Tilbage til Indsigt</a>
      <span class="month-nav">
        <a href="#/rapport/${shiftMonth(key, -1)}" aria-label="Forrige måned">‹ ${monthName(shiftMonth(key, -1))}</a>
        ${key < thisMonth ? html`<a href="#/rapport/${shiftMonth(key, 1)}" aria-label="Næste måned">${monthName(shiftMonth(key, 1))} ›</a>` : ''}
      </span>
      <button type="button" class="primary" id="printReport">Gem som PDF</button>
    </div>

    <header class="report-head">
      <p class="eyebrow">Ekkoly månedsrapport</p>
      <h1>Anmeldelser i ${monthName(key)}</h1>
      <p class="muted">${state.org.name}. Lavet ${date(new Date().toISOString())}.${key === thisMonth ? ' Måneden er ikke slut endnu.' : ''}</p>
    </header>

    ${!s.count ? html`<p class="empty-state">Ingen anmeldelser i ${monthName(key)}.</p>` : html`
    <dl class="kpis">
      <div><dt>Nye anmeldelser</dt><dd>${s.count}${delta(s.count, p.count || null, { digits: 0 })}</dd></div>
      <div><dt>Gennemsnit <span class="muted">af 10</span></dt><dd>${one(s.avg10)}${delta(s.avg10, p.avg10)}</dd></div>
      <div><dt>Besvaret</dt><dd>${pct(s.replyRate)}${delta(s.replyRate, p.replyRate, { unit: ' point', digits: 0, factor: 100 })}</dd></div>
      <div><dt>Med kritik <span class="muted">under 8 af 10</span></dt><dd>${pct(s.criticalShare)}${delta(s.criticalShare, p.criticalShare, { unit: ' point', digits: 0, factor: 100, higherIsBetter: false })}</dd></div>
    </dl>

    ${props.length > 1 ? html`<section><h2>Pr. sted</h2>
      <div class="table-scroll"><table class="scores keep-cols"><thead><tr><th scope="col">Sted</th><th scope="col">Anmeldelser</th><th scope="col">Gennemsnit <span class="muted">af 10</span></th><th scope="col">Måneden før</th><th scope="col">Besvaret</th><th scope="col">Mest kritik</th></tr></thead>
      <tbody>${props.map((x) => html`<tr><th scope="row">${x.property.name}</th><td>${x.count}</td><td><strong>${one(x.avg10)}</strong></td><td>${one(prevProps.get(x.property.id)?.avg10 ?? null)}</td><td>${pct(x.replyRate)}</td><td>${x.critique ? `${x.critique[0]} (${x.critique[1]})` : '–'}</td></tr>`)}</tbody></table></div>
    </section>` : ''}

    <section><h2>Pr. platform</h2>
      <div class="table-scroll"><table class="scores keep-cols"><thead><tr><th scope="col">Platform</th><th scope="col">Anmeldelser</th><th scope="col">Gennemsnit</th></tr></thead>
      <tbody>${plats.map((x) => html`<tr><th scope="row">${platformName(x.platform)}</th><td>${x.count}</td><td>${x.avg == null ? '–' : html`<strong>${one(x.avg)}</strong> <span class="muted">af ${x.scale}</span>`}</td></tr>`)}</tbody></table></div>
    </section>

    <section class="report-topics"><h2>Det siger gæsterne</h2>
      <div class="topic-cols">
        <div><h3>Mest ros</h3>${topicList(posNow, posPrev)}</div>
        <div><h3>Mest kritik</h3>${topicList(negNow, negPrev)}</div>
      </div>
      <p class="hint">Antal anmeldelser, der nævner emnet. Tallet i parentes er måneden før.</p>
    </section>

    <section class="report-quotes"><h2>Udvalgte anmeldelser</h2>
      <div class="topic-cols">
        <div><h3>De bedste</h3>${best.length ? html`${best.map((r) => html`<blockquote><p>${quoteText(r)}</p><footer>${r.author ?? 'Gæst'}, ${place(r)}, ${platformName(r.platform)}, ${r.rating}/${r.scale}</footer></blockquote>`)}` : html`<p class="hint">Ingen.</p>`}</div>
        <div><h3>De mest kritiske</h3>${worst.length ? html`${worst.map((r) => html`<blockquote class="critical"><p>${quoteText(r)}</p><footer>${r.author ?? 'Gæst'}, ${place(r)}, ${platformName(r.platform)}, ${r.rating}/${r.scale}${r.reply_status === 'posted' ? ', besvaret' : ', ikke besvaret'}</footer></blockquote>`)}` : html`<p class="hint">Ingen anmeldelser under 8 af 10.</p>`}</div>
      </div>
    </section>

    <p class="hint report-foot">Karakterer er omregnet til 10-skala, når platforme med forskellig skala lægges sammen (fx 4 af 5 = 8 af 10). Besvaret = andel af anmeldelser med tekst, der har fået et svar.${cur.some((r) => to10(r) == null) ? ' Anmeldelser uden karakter tæller med i antal, men ikke i gennemsnit.' : ''}</p>`}
  </article>`);

  view.querySelector('#printReport')?.addEventListener('click', () => {
    const old = document.title;
    document.title = `Ekkoly ${state.org.name} ${monthName(key)}`;
    window.print();
    setTimeout(() => { document.title = old; }, 500);
  });
}

function topicList(now, prev) {
  if (!now.length) return html`<p class="hint">Intet denne måned.</p>`;
  return html`<ol class="topic-rank">${now.map(([t, n]) => html`<li><span>${t}</span><strong>${n}</strong> <span class="muted">(${prev.get(t) ?? 0})</span></li>`)}</ol>`;
}
