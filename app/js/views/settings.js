import { INBOUND_MAIL_DOMAIN } from '../../config.js';
import { isLeader, loadOrgData, state } from '../state.js';
import { FORWARD_GUIDE } from '../platforms.js';
import { busy, copy, date, html, mount, toast, when } from '../ui.js';

const ROLE = { owner: 'Ejer', manager: 'Leder', staff: 'Medarbejder' };
const KIND = { hotel: 'Hotel', hostel: 'Hostel', vacation_rental: 'Ferieudlejning', restaurant: 'Restaurant eller bar', other: 'Andet' };
const STATUS = { parsed: 'Anmeldelse gemt', ignored: 'Ikke en anmeldelse', failed: 'Fejl', received: 'Modtaget' };

export async function renderSettings(view, rerender) {
  const leader = isLeader();
  const owner = state.role === 'owner';
  const [members, invitations, tone, connections, inbound] = await Promise.all([
    state.api.members(state.org.id),
    leader ? state.api.invitations(state.org.id) : [],
    state.api.tone(state.org.id),
    state.api.connections(state.org.id),
    leader ? state.api.inbound(state.org.id) : [],
  ]);
  const google = connections.find((c) => c.provider === 'google');
  const address = INBOUND_MAIL_DOMAIN ? `${state.org.inbound_token}@${INBOUND_MAIL_DOMAIN}` : (state.demo ? `${state.org.inbound_token}@ind.gaesternesstemme.dk` : '');
  const googleProfiles = state.profiles.filter((p) => p.platform === 'google' && p.connection === 'api');

  mount(view, html`<h1 class="page-title">Indstillinger</h1>
  <div class="settings">

  <section class="panel" id="mail">
    <h2>Jeres adresse til anmeldelses-mails</h2>
    <p>Platformene sender en mail, hver gang en gæst skriver en anmeldelse. Send de mails videre hertil, så kommer anmeldelserne ind af sig selv.</p>
    ${address ? html`<div class="address"><code>${address}</code><button type="button" class="secondary" id="copyAddress">Kopiér adressen</button></div>`
      : html`<p class="hint">Jeres adresse bliver klar, når maildomænet er sat op. Indtil da kan I bruge Google og tilføje anmeldelser i hånden.</p>`}
    <dl class="guide">${FORWARD_GUIDE.map(([title, text]) => html`<dt>${title}</dt><dd>${text}</dd>`)}</dl>
    ${leader ? html`<h3>Seneste mails</h3>${inbound.length
      ? html`<ul class="log">${inbound.map((m) => html`<li><span>${m.subject || '(intet emne)'}</span><span class="muted">${when(m.received_at)}, ${STATUS[m.status] ?? m.status}${m.error ? `: ${m.error}` : ''}</span></li>`)}</ul>`
      : html`<p class="hint">Ingen mails modtaget endnu.</p>`}` : ''}
  </section>

  ${leader ? html`<section class="panel" id="google">
    <h2>Google</h2>
    ${google ? html`
      <p>${google.status === 'connected' ? 'Forbundet.' : `Forbindelsen virker ikke: ${google.last_error ?? 'log ind igen'}.`} ${google.last_synced_at ? `Sidst hentet ${when(google.last_synced_at)}.` : 'Ikke hentet endnu.'}</p>
      <h3>Hvilket sted er hvilken lokation?</h3>
      <div class="stack-tight">${(google.available_locations ?? []).map((loc) => {
        const linked = googleProfiles.find((p) => p.external_id === loc.name);
        return html`<label class="map-row"><span><strong>${loc.title}</strong><small>${loc.address ?? ''}</small></span>
          <select data-location="${loc.name}" data-title="${loc.title}">
            <option value="">Ikke koblet</option>
            ${state.properties.map((p) => html`<option value="${p.id}" ${linked?.property_id === p.id ? 'selected' : ''}>${p.name}</option>`)}
          </select></label>`;
      })}</div>
      <div class="actions"><button type="button" class="secondary" id="syncGoogle">Hent anmeldelser nu</button>
        <button type="button" class="link" id="connectGoogle">Log ind på Google igen</button></div>`
    : html`<p>Forbind jeres Google-virksomhedsprofil. Så hentes anmeldelserne automatisk, og godkendte svar lægges direkte på Google.</p>
      <button type="button" class="primary" id="connectGoogle">Forbind Google</button>`}
  </section>` : ''}

  ${leader ? html`<section class="panel" id="replies">
    <h2>Svar</h2>
    <form id="orgForm" class="stack">
      <label class="field"><span>Hilsen under svarene</span><input name="signoff" value="${state.org.signoff ?? ''}" placeholder="Mange hilsner fra …"></label>
      <label class="check"><input type="checkbox" name="auto" ${state.org.auto_reply_positive ? 'checked' : ''} ${owner ? '' : 'disabled'}>
        <span>Svar selv på ros på Google, uden at nogen godkender først<small>Kun anmeldelser med høj karakter og uden kritik. Alt med kritik venter stadig på en leder.</small></span></label>
      <button class="secondary" type="submit">Gem</button>
    </form>
    <h3>Sådan plejer I at svare</h3>
    <p class="hint">Sæt 3 til 10 af jeres egne gode svar ind. AI'en skriver i samme tone. Svar, I godkender, kommer automatisk med.</p>
    <form id="toneForm" class="stack-tight"><textarea name="body" rows="4" required placeholder="Indsæt et svar, I har skrevet til en gæst"></textarea><button class="secondary" type="submit">Tilføj eksempel</button></form>
    <ul class="tone">${tone.slice(0, 12).map((t) => html`<li><p>${t.body}</p><span class="muted">${t.source === 'approved_reply' ? 'Godkendt svar' : 'Tilføjet'} ${date(t.created_at)}</span>
      <button type="button" class="link quiet" data-delete-tone="${t.id}">Fjern</button></li>`)}</ul>
  </section>` : ''}

  <section class="panel" id="places">
    <h2>Steder</h2>
    <ul class="places-list">${state.properties.map((p) => html`<li><strong>${p.name}</strong><span class="muted">${KIND[p.kind] ?? ''}${p.signoff ? `, hilsen: ${p.signoff}` : ''}</span></li>`)}</ul>
    ${leader ? html`<form id="placeForm" class="inline-form">
      <input name="name" required placeholder="Nyt sted" aria-label="Navn på nyt sted">
      <select name="kind" aria-label="Type">${Object.entries(KIND).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select>
      <button class="secondary" type="submit">Tilføj sted</button></form>` : ''}
  </section>

  <section class="panel" id="team">
    <h2>Team</h2>
    <ul class="members">${members.map((m) => html`<li><span>${m.display_name ?? 'Medlem'}</span>
      ${owner && m.user_id !== state.user.id
        ? html`<select data-role="${m.user_id}" aria-label="Rolle">${Object.entries(ROLE).map(([k, v]) => html`<option value="${k}" ${m.role === k ? 'selected' : ''}>${v}</option>`)}</select>`
        : html`<span class="muted">${ROLE[m.role]}</span>`}</li>`)}</ul>
    <p class="hint">Ledere godkender svar på kritik og styrer steder og indstillinger. Medarbejdere svarer på ros og skriver forslag til lederen.</p>
    ${leader ? html`<form id="inviteForm" class="inline-form">
      <input name="email" type="email" required placeholder="kollega@hotel.dk" aria-label="Kollegaens mail">
      <select name="role" aria-label="Rolle"><option value="staff">Medarbejder</option><option value="manager">Leder</option></select>
      <button class="secondary" type="submit">Invitér</button></form>
      ${invitations.length ? html`<ul class="log">${invitations.map((i) => html`<li><span>${i.email}, ${ROLE[i.role].toLowerCase()}</span>
        <button type="button" class="link" data-invite-link="${i.token}">Kopiér invitationslink</button></li>`)}</ul>` : ''}` : ''}
  </section>

  <section class="panel" id="plan">
    <h2>Abonnement</h2>
    <p>${state.access?.state === 'trial' ? `Prøveperiode med ${state.access.days_left} dage tilbage.` : state.access?.state === 'active' ? 'Aktivt.' : 'Prøveperioden er slut.'}</p>
  </section>
  </div>`);

  const $ = (s) => view.querySelector(s);
  const after = async (msg) => { await loadOrgData(); await rerender(); if (msg) toast(msg); };

  $('#copyAddress')?.addEventListener('click', async () => toast((await copy(address)) ? 'Adressen er kopieret.' : 'Markér adressen og kopiér selv.'));
  $('#connectGoogle')?.addEventListener('click', (e) => busy(e.target, async () => {
    const url = await state.api.connectGoogle(state.org.id);
    if (url) location.href = url; else await after('Google er forbundet.');
  }));
  $('#syncGoogle')?.addEventListener('click', (e) => busy(e.target, async () => { await state.api.syncGoogle(state.org.id); await after('Anmeldelserne er hentet.'); }));
  view.querySelectorAll('[data-location]').forEach((sel) => sel.addEventListener('change', () => {
    if (!sel.value) return;
    busy(null, async () => { await state.api.linkGoogle(sel.value, sel.dataset.location, sel.dataset.title); await after('Lokationen er koblet.'); });
  }));
  $('#orgForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const patch = { signoff: e.target.signoff.value.trim() || null };
    if (owner) patch.auto_reply_positive = e.target.auto.checked;
    busy(e.target.querySelector('button'), async () => { await state.api.updateOrg(state.org.id, patch); Object.assign(state.org, patch); toast('Gemt.'); });
  });
  $('#toneForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.target.querySelector('button'), async () => { await state.api.addTone(state.org.id, e.target.body.value.trim()); await after('Eksemplet er tilføjet.'); });
  });
  view.querySelectorAll('[data-delete-tone]').forEach((b) => b.addEventListener('click', () => busy(b, async () => { await state.api.deleteTone(b.dataset.deleteTone); await after(); })));
  $('#placeForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.target.querySelector('button'), async () => {
      await state.api.addProperty(state.org.id, { name: e.target.name.value.trim(), kind: e.target.kind.value });
      await after('Stedet er tilføjet.');
    });
  });
  view.querySelectorAll('[data-role]').forEach((sel) => sel.addEventListener('change', () =>
    busy(null, async () => { await state.api.setRole(state.org.id, sel.dataset.role, sel.value); toast('Rollen er ændret.'); })));
  $('#inviteForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.target.querySelector('button'), async () => {
      const inv = await state.api.invite(state.org.id, e.target.email.value.trim(), e.target.role.value);
      const link = `${location.origin}${location.pathname}#/invitation/${inv.token}`;
      const ok = await copy(link);
      await after(ok ? 'Invitationslinket er kopieret. Send det til din kollega.' : 'Invitationen er oprettet.');
    });
  });
  view.querySelectorAll('[data-invite-link]').forEach((b) => b.addEventListener('click', async () => {
    const link = `${location.origin}${location.pathname}#/invitation/${b.dataset.inviteLink}`;
    toast((await copy(link)) ? 'Linket er kopieret.' : link);
  }));
}
