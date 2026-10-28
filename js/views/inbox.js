import { groups, isLeader, reloadQueue, state } from '../state.js';
import { platformName, replyUrl, PLATFORMS } from '../platforms.js';
import { busy, copy, date, html, mount, score, toast, tone, when } from '../ui.js';

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
      <h1 class="page-title">I dag</h1>
      ${placeFilter()}
      ${section('Svar nu', '', g.now, selectedId)}
      ${section('Venter på en leder', leader ? 'Gæsten kritiserer noget. Læs svaret igennem og godkend det.' : 'Gæsten kritiserer noget, så en leder godkender svaret først.', g.waiting, selectedId)}
      ${g.hold.length ? section('Svar ikke endnu', 'Vi prøver at få anmeldelsen fjernet. Et svar kan gøre det sværere.', g.hold, selectedId) : ''}
      ${section('Besvaret', '', g.done, selectedId, false)}
      ${!state.queue.length ? html`<div class="empty-state"><h2>Ingen anmeldelser endnu</h2><p>Når I har sat videresendelse op eller forbundet Google, kommer anmeldelserne ind her af sig selv.</p><a class="button" href="#/indstillinger">Sæt det op</a></div>` : ''}
    </div>
    <div class="detail-pane" id="detail">${selectedId ? html`<p class="loading">Henter anmeldelsen</p>` : html`<div class="detail-empty"><p>Vælg en anmeldelse for at se den og svarforslaget.</p></div>`}</div>
  </div>`);

  view.querySelectorAll('[data-place]').forEach((b) => b.addEventListener('click', () => {
    state.place = b.dataset.place;
    renderInbox(view, selectedId);
  }));
  if (selectedId) await renderDetail(view.querySelector('#detail'), selectedId, view);
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
    ${r.title ? html`<h2 class="letter-title">${r.title}</h2>` : ''}
    <blockquote class="letter-body">${r.body ? r.body.split('\n').filter(Boolean).map((p) => html`<p>${p}</p>`) : html`<p class="muted">Gæsten gav kun en karakter.</p>`}</blockquote>
    <p class="letter-sign"><span>${r.author || 'Gæst'}</span>${scoreMark(r)}</p>
    ${r.raw?.excerpt ? html`<p class="note-line">Mailen viste kun et uddrag. Læs hele anmeldelsen på platformen, før I svarer.</p>` : ''}
  </article>`;

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
            : html`<button type="button" class="primary" id="copyOpen">Kopiér og åbn ${platformName(r.platform)}</button>
                   <button type="button" class="secondary" id="posted">Svaret er lagt ud</button>`)
          : mustWait
            ? html`<button type="button" class="primary" id="saveForLeader">Gem til lederen</button>`
            : html`<button type="button" class="primary" id="approve">${r.needs_approval ? 'Godkend svaret' : 'Godkend'}</button>`}
        ${approved ? '' : html`<button type="button" class="secondary" id="regen">${draftText ? 'Lav nyt forslag' : 'Lav forslag'}</button>`}
      </div>
      ${approved && !viaApi ? html`<p class="hint">${platformName(r.platform)} tillader ikke svar udefra. Svaret kopieres, og svarsiden åbner. Sæt det ind, og tryk så på Svaret er lagt ud.</p>` : ''}
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
