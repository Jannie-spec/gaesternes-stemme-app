import { groups, isLeader, reloadQueue, state } from '../state.js';
import { platformName, replyUrl, PLATFORMS } from '../platforms.js';
import { busy, copy, date, html, mount, score, toast, tone, when } from '../ui.js';
import { renderNewReview } from './newreview.js';
import { GOOGLE_DIRECT } from '../../config.js';

const RULE = {
  wrong_place: 'Handler om et andet sted', not_a_guest: 'Anmelderen har ikke været gæst', personal_info: 'Personoplysninger',
  hate_or_threats: 'Hadefuld tale eller trusler', profanity_or_sexual: 'Groft sprog', spam_or_ads: 'Reklame eller spam',
  conflict_of_interest: 'Interessekonflikt eller afpresning', off_topic: 'Handler ikke om oplevelsen', too_old: 'Oplevelsen er over 12 måneder gammel',
  hearsay: 'Andres oplevelse, ikke egen', retaliatory: 'Hævn', extortion: 'Afpresning', not_about_stay: 'Handler ikke om opholdet', fake_engagement: 'Falsk anmeldelse',
};

function topicChips(r) {
  if (!r.topics?.length) return '';
  return html`<ul class="topics" aria-label="Emner">${r.topics.map((t) => html`<li class="topic topic-${t.sentiment === 'positive' ? 'pos' : 'neg'}">${t.sentiment === 'positive' ? 'Ros' : 'Kritik'}: ${t.topic}</li>`)}</ul>`;
}

function removalBox(r, leader, url) {
  const c = r.removal_check;
  if (!leader || !c || r.reply_status === 'posted') return '';
  if (!c.possible) {
    return html`<p class="removal-none"><strong>Regeltjek:</strong> ingen regelbrud fundet. ${c.explanation || ''} <button type="button" class="link quiet" id="recheck">Tjek igen</button></p>`;
  }
  return html`<section class="removal"><h2>Den kan muligvis fjernes</h2>
    <p>${c.explanation || ''}</p>
    <ul class="removal-rules">${c.rules.map((k) => html`<li>${RULE[k] ?? k}</li>`)}</ul>
    ${c.report_draft ? html`<label class="field"><span>Udkast til indberetning (på engelsk)</span><textarea id="reportDraft" rows="5" readonly>${c.report_draft}</textarea></label>` : ''}
    <div class="actions">
      ${c.report_draft ? html`<button type="button" class="secondary" id="copyReport">Kopiér og åbn ${platformName(r.platform)}</button>` : ''}
      <button type="button" class="link quiet" id="recheck">Tjek igen</button>
    </div>
    <p class="hint">Det er platformen, der afgør, om anmeldelsen fjernes.${r.removal_hold ? '' : ' Markér den som "svar ikke" nedenfor, mens I venter, så ingen svarer imens.'}</p>
  </section>`;
}

// ---- Ekkoly-knappen (Chrome-udvidelsen) ----
export const extensionReady = () => Boolean(document.documentElement.dataset.ekkolyExtension);

function sendToExtension(payload) {
  state.extPending = { ...(state.extPending ?? {}), [payload.id]: payload.text };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { window.removeEventListener('message', onAck); reject(new Error('Ekkoly-knappen svarede ikke. Genindlæs siden og prøv igen.')); }, 5000);
    function onAck(e) {
      if (e.source !== window || e.data?.source !== 'ekkoly-ext' || e.data.type !== 'reply-ack' || e.data.id !== payload.id) return;
      clearTimeout(timer); window.removeEventListener('message', onAck);
      e.data.ok ? resolve() : reject(new Error(e.data.error || 'Ekkoly-knappen kunne ikke åbne platformen.'));
    }
    window.addEventListener('message', onAck);
    window.postMessage({ source: 'ekkoly-app', type: 'reply', ...payload }, location.origin);
  });
}

const LANG = { da: 'dansk', en: 'engelsk', de: 'tysk', sv: 'svensk', no: 'norsk', nl: 'hollandsk', fr: 'fransk', es: 'spansk', it: 'italiensk', pl: 'polsk' };

function scoreMark(r) {
  const s = score(r);
  if (!s) return '';
  const t = tone(r);
  const cls = t >= 0.8 ? 'good' : t >= 0.6 ? 'mixed' : 'poor';
  return html`<span class="score score-${cls}">${s}</span>`;
}

function item(r, selected) {
  const first = (r.title || r.body || 'Kun karakter, ingen tekst').split('\n')[0];
  return html`<li><a class="item ${selected ? 'is-selected' : ''}" href="#/anmeldelse/${r.id}" ${selected ? 'aria-current=true' : ''}>
    <span class="item-who"><strong>${r.author || 'Gæst'}</strong>${scoreMark(r)}</span>
    <span class="item-where">${r.property_name || 'Sted ikke valgt'}, ${platformName(r.platform)}, ${when(r.published_at || r.first_seen_at)}</span>
    <span class="item-text">${first}</span>
  </a></li>`;
}

function section(title, hint, list, selectedId, open = true) {
  if (!list.length && !open) return '';
  const body = list.length
    ? html`<ul class="items">${list.map((r) => item(r, r.id === selectedId))}</ul>`
    : html`<p class="empty">Ingen lige nu.</p>`;
  return open
    ? html`<section class="group"><h2>${title} <span class="count">${list.length}</span></h2>${hint ? html`<p class="hint">${hint}</p>` : ''}${body}</section>`
    : html`<details class="group"><summary><h2>${title} <span class="count">${list.length}</span></h2></summary>${body}</details>`;
}

function placeFilter() {
  if (state.properties.length < 2) return '';
  const chip = (id, name) => html`<button type="button" class="chip" data-place="${id}" aria-pressed="${state.place === id}">${name}</button>`;
  return html`<div class="chips" role="group" aria-label="Vælg sted">${chip('all', 'Alle steder')}${state.properties.map((p) => chip(p.id, p.name))}</div>`;
}

export async function renderInbox(view, selectedId) {
  const g = groups();
  const leader = isLeader();
  mount(view, html`<div class="inbox ${selectedId ? 'has-selection' : ''}">
    <div class="list-pane">
      <div class="list-head"><h1 class="page-title">I dag</h1><a class="add-review" href="#/ny">+ Sæt en anmeldelse ind</a></div>
      <div id="gettingStarted"></div>
      ${placeFilter()}
      ${section('Svar nu', '', g.now, selectedId)}
      ${section('Venter på en leder', leader ? 'Gæsten kritiserer noget. Læs svaret igennem og godkend det.' : 'Gæsten kritiserer noget, så en leder godkender svaret først.', g.waiting, selectedId)}
      ${g.hold.length ? section('Svar ikke endnu', 'Vi prøver at få anmeldelsen fjernet. Et svar kan gøre det sværere.', g.hold, selectedId) : ''}
      ${section('Besvaret', '', g.done, selectedId, false)}
      ${!state.queue.length ? html`<div class="empty-state"><h2>Ingen anmeldelser endnu</h2><p>Kopiér en af jeres seneste anmeldelser fra Booking.com, Google eller en anden platform, og se svarforslaget med det samme. Når videresendelsen er sat op, kommer de nye ind af sig selv.</p><div class="actions"><a class="button" href="#/ny">Sæt en anmeldelse ind</a><a class="secondary" href="#/opsaetning">Sæt videresendelse op</a></div></div>` : ''}
    </div>
    <div class="detail-pane" id="detail">${selectedId ? html`<p class="loading">Henter anmeldelsen</p>` : html`<div class="detail-empty"><p>Vælg en anmeldelse for at se den og svarforslaget.</p></div>`}</div>
  </div>`);

  if (leader) gettingStarted(view.querySelector('#gettingStarted')).catch(() => {});
  view.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => {
    state.place = b.dataset.place;
    renderInbox(view, selectedId);
  }));
  if (selectedId === 'ny') renderNewReview(view.querySelector('#detail'));
  else if (selectedId) await renderDetail(view.querySelector('#detail'), selectedId, view);
}

async function renderDetail(el, id, view) {
  let data;
  try {
    data = await state.api.review(id);
  } catch (e) {
    mount(el, html`<div class="detail-empty"><p>${e.message}</p><a href="#/">Tilbage til listen</a></div>`);
    return;
  }
  const { review: r, notes, drafts } = data;
  const leader = isLeader();
  const profile = state.profiles.find((p) => p.id === r.profile_id);
  const url = replyUrl(r, profile);
  const open = ['unanswered', 'awaiting_approval', 'approved'].includes(r.reply_status);
  const viaApi = r.platform === 'google' && r.source === 'api';
  const mustWait = r.needs_approval && r.reply_status !== 'approved' && !leader;
  const draftText = r.draft_body ?? '';
  const lang = r.language && r.language !== 'da' ? LANG[r.language] ?? r.language : null;

  const letter = html`<article class="letter">
    <p class="letter-meta">${r.property_name || 'Sted ikke valgt'}, ${platformName(r.platform)}${r.published_at ? html`, ${date(r.published_at)}` : ''}${lang ? html`, skrevet på ${lang}` : ''}</p>
    ${!r.property_id && state.properties.length > 1 ? html`<form class="place-pick" id="placePick">
      <label class="field"><span>Hvilket sted er anmeldelsen til?${r.property_hint ? html` <small>${platformName(r.platform)} skriver "${r.property_hint}".</small>` : ''}</span>
        <select name="place" required><option value="">Vælg sted</option>${state.properties.map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select></label>
      ${leader && r.property_hint ? html`<label class="check"><input type="checkbox" name="remember" checked><span>Husk det til næste gang<small>Ekkoly lægger fremover anmeldelser til "${r.property_hint}" på det valgte sted.</small></span></label>` : ''}
      <button type="submit" class="secondary">Gem sted</button>
    </form>` : ''}
    ${r.title ? html`<h2 class="letter-title">${r.title}</h2>` : ''}
    <blockquote class="letter-body">${r.body ? r.body.split('\n').filter(Boolean).map((p) => html`<p>${p}</p>`) : html`<p class="muted">Gæsten gav kun en karakter.</p>`}</blockquote>
    <p class="letter-sign"><span>${r.author || 'Gæst'}</span>${scoreMark(r)}</p>
    ${r.raw?.excerpt ? html`<p class="note-line">Mailen viste kun et uddrag. Læs hele anmeldelsen på platformen, før I svarer.</p>` : ''}
    ${topicChips(r)}
  </article>${removalBox(r, leader, url)}`;

  let reply;
  if (r.removal_hold) {
    reply = html`<section class="reply hold"><h2>Svar ikke endnu</h2>
      <p>${r.removal_note || 'En leder prøver at få anmeldelsen fjernet.'}</p>
      ${leader ? html`<button type="button" id="unhold" class="secondary">Fjern markeringen</button>` : ''}</section>`;
  } else if (r.reply_status === 'posted') {
    reply = html`<section class="reply posted"><h2>Jeres svar</h2><div class="reply-text">${(r.owner_reply || '').split('\n').filter(Boolean).map((p) => html`<p>${p}</p>`)}</div>
      ${r.owner_reply_at ? html`<p class="hint">Lagt ud ${date(r.owner_reply_at)}</p>` : ''}</section>`;
  } else if (r.reply_status === 'not_needed') {
    reply = html`<section class="reply"><p class="hint">${PLATFORMS[r.platform]?.name} tillader ikke svar på en karakter uden tekst.</p></section>`;
  } else {
    const approved = r.reply_status === 'approved';
    reply = html`<section class="reply"><h2>${approved ? 'Godkendt svar' : 'Svarforslag'}</h2>
      ${mustWait ? html`<p class="hint">Gæsten kritiserer noget, så en leder godkender svaret først. Du kan rette forslaget og gemme det til lederen.</p>` : ''}
      <label class="sr-only" for="replyText">Svar til gæsten</label>
      <textarea id="replyText" rows="9" ${approved ? 'readonly' : ''} placeholder="Skriv et svar, eller tryk på Lav forslag">${draftText}</textarea>
      <div class="actions">
        ${approved
          ? (viaApi
            ? html`<button type="button" class="primary" id="post">Læg svaret på Google</button>`
            : extensionReady() && /^https:\/\//.test(url)
              ? html`<button type="button" class="primary" id="viaExt">Svar på ${platformName(r.platform)}</button>
                   <button type="button" class="secondary" id="posted">Svaret er lagt ud</button>`
              : html`<button type="button" class="primary" id="copyOpen">Kopiér og åbn ${platformName(r.platform)}</button>
                   <button type="button" class="secondary" id="posted">Svaret er lagt ud</button>`)
          : mustWait
            ? html`<button type="button" class="primary" id="saveForLeader">Gem til lederen</button>`
            : html`<button type="button" class="primary" id="approve">${r.needs_approval ? 'Godkend svaret' : 'Godkend'}</button>`}
        ${approved ? '' : html`<button type="button" class="secondary" id="regen">${draftText ? 'Lav nyt forslag' : 'Lav forslag'}</button>`}
      </div>
      ${approved && !viaApi ? (extensionReady()
        ? html`<p class="hint">${platformName(r.platform)} åbner i en ny fane, og Ekkoly-knappen sætter svaret ind. Tryk på ${platformName(r.platform)}s egen Send-knap og derefter "Svaret er sendt" i Ekkoly-panelet.</p>`
        : html`<p class="hint">Svaret kopieres, og svarsiden åbner. Sæt det ind, og tryk så på Svaret er lagt ud. Med <a href="../knappen.html" target="_blank" rel="noopener">Ekkoly-knappen til Chrome</a> bliver svaret sat ind for jer.</p>`) : ''}
    </section>`;
  }

  const holdControl = leader && open && !r.removal_hold ? html`<details class="quiet-box"><summary>Anmeldelsen bryder platformens regler</summary>
      <p class="hint">Markér den, så ingen svarer, mens I prøver at få den fjernet. Skriv kort hvorfor.</p>
      <form id="holdForm" class="inline-form"><input name="note" required placeholder="Fx: anmelderen har aldrig boet her"><button class="secondary" type="submit">Markér: svar ikke</button></form></details>` : '';

  const noteList = html`<section class="notes"><h2>Noter til teamet</h2>
    ${notes.length ? html`<ul>${notes.map((n) => html`<li><p>${n.body}</p><span class="hint">${date(n.created_at)}</span></li>`)}</ul>` : html`<p class="hint">Fortæl fx hvad der er gjort ved problemet. AI'en bruger noterne, næste gang den skriver et forslag.</p>`}
    <form id="noteForm" class="inline-form"><input name="body" required placeholder="Skriv en note"><button class="secondary" type="submit">Tilføj note</button></form>
  </section>`;

  mount(el, html`<a class="back" href="#/">Tilbage til listen</a>${letter}${reply}${holdControl}${noteList}
    ${drafts.length > 1 ? html`<p class="hint">${drafts.length} forslag i alt til denne anmeldelse.</p>` : ''}`);

  const textarea = el.querySelector('#replyText');
  const refresh = async (msg) => { await reloadQueue(); await renderInbox(view, r.id); if (msg) toast(msg); };
  const currentDraft = async () => {
    const text = textarea.value.trim();
    if (!text) throw new Error('Skriv et svar først, eller tryk på Lav forslag.');
    if (r.draft_id && text === (r.draft_body ?? '').trim()) return r.draft_id;
    return (await state.api.ownDraft(state.org.id, r.id, text)).id;
  };

  el.querySelector('#placePick')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    busy(f.querySelector('button'), async () => {
      await state.api.setReviewProperty(r.id, f.place.value, Boolean(f.remember?.checked));
      await refresh(f.remember?.checked ? 'Stedet er gemt, og Ekkoly husker det til næste gang.' : 'Stedet er gemt.');
    });
  });

  el.querySelector('#regen')?.addEventListener('click', (e) => {
    e.target.textContent = 'Skriver forslag';
    busy(e.target, async () => { await state.api.newDraft(r.id); await refresh(); });
  });
  el.querySelector('#approve')?.addEventListener('click', (e) => busy(e.target, async () => {
    const draftId = await currentDraft();
    await state.api.approve(draftId, textarea.value.trim());
    await refresh('Svaret er godkendt.');
  }));
  el.querySelector('#saveForLeader')?.addEventListener('click', (e) => busy(e.target, async () => {
    await currentDraft();
    await refresh('Gemt. En leder kan nu godkende svaret.');
  }));
  el.querySelector('#copyOpen')?.addEventListener('click', async () => {
    const ok = await copy(textarea.value);
    toast(ok ? 'Svaret er kopieret. Sæt det ind på platformen.' : 'Kunne ikke kopiere. Markér teksten og kopiér selv.', ok ? 'ok' : 'error');
    if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
  });
  el.querySelector('#viaExt')?.addEventListener('click', (e) => busy(e.target, async () => {
    await sendToExtension({ id: r.id, platform: r.platform, url, text: textarea.value.trim(), author: r.author, snippet: (r.body || r.title || '').slice(0, 120) });
    toast(`${platformName(r.platform)} åbner i en ny fane med svaret klar.`);
  }));
  el.querySelector('#copyReport')?.addEventListener('click', async () => {
    const ok = await copy(el.querySelector('#reportDraft').value);
    toast(ok ? 'Indberetningen er kopieret. Brug platformens "Rapportér" ved anmeldelsen.' : 'Kunne ikke kopiere. Markér teksten og kopiér selv.', ok ? 'ok' : 'error');
    if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener');
  });
  el.querySelector('#recheck')?.addEventListener('click', (e) => busy(e.target, async () => {
    await state.api.recheckReview(r.id);
    await refresh('Anmeldelsen er tjekket igen.');
  }));
  el.querySelector('#posted')?.addEventListener('click', (e) => busy(e.target, async () => {
    await state.api.markPosted(r.id, textarea.value.trim());
    await refresh('Markeret som besvaret.');
  }));
  el.querySelector('#post')?.addEventListener('click', (e) => busy(e.target, async () => {
    await state.api.postToPlatform(r.id);
    await refresh('Svaret ligger nu på Google.');
  }));
  el.querySelector('#unhold')?.addEventListener('click', (e) => busy(e.target, async () => {
    await state.api.setHold(r.id, false, null);
    await refresh('Markeringen er fjernet.');
  }));
  el.querySelector('#holdForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.target.querySelector('button'), async () => {
      await state.api.setHold(r.id, true, e.target.note.value.trim());
      await refresh('Markeret. Ingen svarer, før I fjerner markeringen.');
    });
  });
  el.querySelector('#noteForm').addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.target.querySelector('button'), async () => {
      await state.api.addNote(state.org.id, r.id, e.target.body.value.trim());
      await refresh('Noten er gemt.');
    });
  });
}

// Kom i gang: de fire ting, der gør Ekkoly nyttigt. Vises for ledere, til alt er gjort eller listen er lukket.
const doneKey = () => `ekkoly-kom-i-gang-${state.org.id}`;
async function gettingStarted(el) {
  try { if (localStorage.getItem(doneKey())) return; } catch { /* privat vindue: vis listen */ }
  const [tone, connections, members] = await Promise.all([
    state.api.tone(state.org.id), state.api.connections(state.org.id), state.api.members(state.org.id),
  ]);
  const steps = [
    { done: state.queue.length > 0, text: 'Sæt jeres seneste anmeldelse ind, og se svarforslaget', href: '#/ny' },
    { done: tone.length >= 3, text: 'Sæt 3 af jeres egne svar ind, så forslagene lyder som jer', href: '#/indstillinger#replies' },
    ...(GOOGLE_DIRECT ? [{ done: connections.some((c) => c.provider === 'google'), text: 'Forbind Google', href: '#/indstillinger#google' }] : []),
    { done: state.queue.some((r) => r.source === 'email'), text: 'Få anmeldelserne til at komme ind af sig selv', href: '#/opsaetning' },
    { done: members.length > 1, text: 'Invitér en kollega', href: '#/indstillinger#team' },
  ];
  const left = steps.filter((s) => !s.done).length;
  if (!left) { try { localStorage.setItem(doneKey(), '1'); } catch { /* ignorer */ } return; }
  mount(el, html`<section class="getting-started" aria-label="Kom i gang">
    <h2>Kom i gang <span class="count">${steps.length - left} af ${steps.length}</span></h2>
    <ol>${steps.map((s) => html`<li class="${s.done ? 'is-done' : ''}">${s.done ? html`<span>${s.text}</span>` : html`<a href="${s.href}">${s.text}</a>`}</li>`)}</ol>
    <button type="button" class="link quiet" id="hideStart">Skjul listen</button>
  </section>`);
  el.querySelector('#hideStart').addEventListener('click', () => { try { localStorage.setItem(doneKey(), '1'); } catch { /* ignorer */ } el.innerHTML = ''; });
}
