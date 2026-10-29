// Udregninger til Indsigt og månedsrapporten. Rene funktioner uden DOM, så de kan testes.
// Karakterer lægges kun sammen efter omregning til 10-skalaen (fx 4/5 = 8/10).

export const when = (r) => r.published_at || r.first_seen_at || null;
export const monthKey = (iso) => (iso ? iso.slice(0, 7) : null);
export const to10 = (r) => (r.rating == null || !r.scale ? null : (Number(r.rating) / Number(r.scale)) * 10);

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
export const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
export function shiftMonth(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
/** De seneste n måneder til og med `last`, ældste først */
export const monthsBack = (last, n) => Array.from({ length: n }, (_, i) => shiftMonth(last, i - n + 1));

export const inMonth = (list, key) => list.filter((r) => monthKey(when(r)) === key);
export const since = (list, days, now = Date.now()) => list.filter((r) => { const w = when(r); return w && now - new Date(w).getTime() <= days * 86400000; });

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Nøgletal for en gruppe anmeldelser */
export function summary(list) {
  const scores = list.map(to10).filter((x) => x != null);
  const needReply = list.filter((r) => r.reply_status !== 'not_needed');
  const answered = needReply.filter((r) => r.reply_status === 'posted');
  const critical = scores.filter((s) => s < 8).length;
  return {
    count: list.length,
    avg10: avg(scores),
    replyRate: needReply.length ? answered.length / needReply.length : null,
    criticalShare: scores.length ? critical / scores.length : null,
  };
}

/** Optælling af emner: [[emne, antal], ...] sorteret efter antal */
export function topicCounts(list, sentiment, limit = 5) {
  const m = new Map();
  for (const r of list) for (const t of r.topics ?? []) if (t.sentiment === sentiment) m.set(t.topic, (m.get(t.topic) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da')).slice(0, limit);
}

/** Pr. sted: nøgletal + største ros og kritik */
export function byProperty(list, properties) {
  return properties.map((p) => {
    const mine = list.filter((r) => r.property_id === p.id);
    return { property: p, ...summary(mine), praise: topicCounts(mine, 'positive', 1)[0] ?? null, critique: topicCounts(mine, 'negative', 1)[0] ?? null };
  }).filter((x) => x.count > 0);
}

/** Pr. platform på platformens egen skala */
export function byPlatform(list) {
  const m = new Map();
  for (const r of list) (m.get(r.platform) ?? m.set(r.platform, []).get(r.platform)).push(r);
  return [...m].map(([platform, rs]) => {
    const rated = rs.filter((r) => r.rating != null && r.scale);
    return { platform, count: rs.length, scale: rated[0]?.scale ?? null, avg: avg(rated.map((r) => Number(r.rating))) };
  }).sort((a, b) => b.count - a.count);
}

/** Antal anmeldelser, der roser og kritiserer et emne, måned for måned */
export function topicByMonth(list, topic, months) {
  return months.map((key) => {
    const rs = inMonth(list, key);
    let pos = 0, neg = 0;
    for (const r of rs) for (const t of r.topics ?? []) if (t.topic === topic) t.sentiment === 'positive' ? pos++ : neg++;
    return { month: key, pos, neg };
  });
}

/** Gennemsnit pr. måned (10-skala) */
export const avgByMonth = (list, months) => months.map((key) => ({ month: key, ...summary(inMonth(list, key)) }));

/** Bedste og mest kritiske anmeldelser med tekst */
export function quotes(list, n = 3) {
  const withText = list.filter((r) => (r.body || r.title) && to10(r) != null);
  const best = [...withText].sort((a, b) => to10(b) - to10(a) || (b.body?.length ?? 0) - (a.body?.length ?? 0)).slice(0, n);
  const worst = [...withText].filter((r) => to10(r) < 8).sort((a, b) => to10(a) - to10(b)).slice(0, n);
  return { best, worst };
}
