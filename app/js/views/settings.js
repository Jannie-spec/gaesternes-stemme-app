import { GOOGLE_DIRECT, INBOUND_MAIL_DOMAIN } from '../../config.js';
import { isLeader, loadOrgData, state } from '../state.js';
import { FORWARD_GUIDE } from '../platforms.js';
import { busy, copy, date, html, mount, toast, when } from '../ui.js';

const ROLE = { owner: 'Ejer', manager: 'Leder', staff: 'Medarbejder' };
const KIND = { hotel: 'Hotel', hostel: 'Hostel', vacation_rental: 'Ferieudlejning', restaurant: 'Restaurant eller bar', other: 'Andet' };
// Hvor lav karakteren skal være, før en leder skal godkende svaret (karakter / skala < grænse)
const THRESHOLDS = [
  ['1', 'Alt under topkarakter', 'Kun 5 af 5 og 10 af 10 kan besvares uden en leder'],
  ['0.8', 'Under 4 af 5 eller 8 af 10 (anbefalet)', '4 af 5 og 8 af 10 og derover kan besvares uden en leder'],
  ['0.6', 'Under 3 af 5 eller 6 af 10', 'Kun de dårligste anmeldelser venter på en leder'],
];
const STATUS = { parsed: 'Anmeldelse gemt', ignored: 'Ikke en anmeldelse', failed: 'Fejl', received: 'Modtaget' };

export async function renderSettings(view, rerender) {
  const leader = isLeader();
  const owner = state.role === 'owner';
  const [members, invitations, tone, connections, inbound, billing] = await Promise.all([
    state.api.members(state.org.id),
    leader ? state.api.invitations(state.org.id) : [],
    state.api.tone(state.org.id),
    state.api.connections(state.org.id),
    leader ? state.api.inbound(state.org.id) : [],
    state.api.billing(state.org.id).catch(() => null),
  ]);
  const google = connections.find((c) => c.provider === 'google');
  const address = INBOUND_MAIL_DOMAIN ? `${state.org.inbound_token}@${INBOUND_MAIL_DOMAIN}` : (state.demo ? `${state.org.inbound_token}@ind.ekkoly.com` : '');
  const googleProfiles = state.profiles.filter((p) => p.platform === 'google' && p.connection === 'api');

  mount(view, html`<h1 class="page-title">Indstillinger</h1>
  <div class="settings">

  <section class="panel" id="mail">
    <h2>Jeres adresse til anmeldelses-mails</h2>
    <p>Platformene sender en mail, hver gang en gæst skriver en anmeldelse. Send de mails videre hertil, så kommer anmeldelserne ind af sig selv.</p>
    ${address ? html`<div class="address"><code>${address}</code><button type="button" class="secondary" id="copyAddress">Kopiér adressen</button></div>`
      : html`<p class="hint">Jeres adresse bliver klar, når maildomænet er sat op. Indtil da kan I sætte anmeldelser ind i hånden under I dag.</p>`}
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
    : GOOGLE_DIRECT ? html`<p>Forbind jeres Google-virksomhedsprofil. Så hentes anmeldelserne automatisk, og godkendte svar lægges direkte på Google.</p>
      <button type="button" class="primary" id="connectGoogle">Forbind Google</button>`
    : html`<p>Direkte forbindelse til Google venter på Googles godkendelse. Indtil da kommer Google-anmeldelser ind som de andre: videresend Googles mails om nye anmeldelser til adressen ovenfor, og svar med Ekkoly-knappen eller Kopiér og åbn.</p>
      <p class="hint">Når Google har godkendt os, kan I forbinde jeres profil her med ét login.</p>`}
  </section>` : ''}

  ${leader ? html`<section class="panel" id="replies">
    <h2>Svar</h2>
    <form id="orgForm" class="stack">
      <label class="field"><span>Hilsen under svarene</span><input name="signoff" value="${state.org.signoff ?? ''}" placeholder="Mange hilsner fra …"></label>
      <label class="field"><span>Hvornår skal en leder godkende svaret? ${owner ? '' : html`<small>Kun ejeren kan ændre det</small>`}</span>
        <select name="threshold" ${owner ? '' : 'disabled'}>${(() => {
          const cur = String(Number(state.org.approval_threshold ?? 0.8));
          const list = THRESHOLDS.some(([v]) => v === cur) ? THRESHOLDS : [...THRESHOLDS, [cur, `Under ${Math.round(Number(cur) * 100)} % af topkarakteren`, '']];
          return list.map(([v, label]) => html`<option value="${v}" ${v === cur ? 'selected' : ''}>${label}</option>`);
        })()}</select>
        <small>Gælder nye anmeldelser, ikke dem der allerede er kommet ind.</small></label>
      ${google ? html`<label class="check"><input type="checkbox" name="auto" ${state.org.auto_reply_positive ? 'checked' : ''} ${owner ? '' : 'disabled'}>
        <span>Svar selv på ros på Google, uden at nogen godkender først<small>Kun anmeldelser med høj karakter og uden kritik. Alt med kritik venter stadig på en leder.</small></span></label>` : ''}
      <button class="secondary" type="submit">Gem</button>
    </form>
    <h3>Sådan plejer I at svare</h3>
    <p class="hint">Sæt 3 til 10 af jeres egne gode svar ind. AI'en skriver i samme tone. Svar, I godkender, kommer automatisk med.</p>
    <form id="toneForm" class="stack-tight"><textarea name="body" rows="4" required placeholder="Indsæt et svar, I har skrevet til en gæst"></textarea><button class="secondary" type="submit">Tilføj eksempel</button></form>
    <ul class="tone">${tone.slice(0, 12).map((t) => html`<li><p>${t.body}</p><span class="muted">${t.source === 'approved_reply' ? 'Godkendt svar' : 'Tilføjet'} ${date(t.created_at)}</span>
      <button type="button" class="link quiet" data-delete-tone="${t.id}">Fjern</button></li>`)}</ul>
  </section>` : ''}

  ${leader ? html`<section class="panel" id="notify">
    <h2>Mails til ejer og ledere</h2>
    <form id="notifyForm" class="stack-tight">
      <label class="check"><input type="checkbox" name="alerts" ${state.org.notify_alerts !== false ? 'checked' : ''}>
        <span>Mail med det samme, når en anmeldelse med kritik venter på en leder</span></label>
      <label class="check"><input type="checkbox" name="weekly" ${state.org.notify_weekly !== false ? 'checked' : ''}>
        <span>Ugerapport mandag morgen</span></label>
    </form>
  </section>` : ''}

  <section class="panel" id="places">
    <h2>Steder</h2>
    <ul class="places-list">${state.properties.map((p) => html`<li>
      <div class="place-line"><strong>${p.name}</strong><span class="muted">${KIND[p.kind] ?? ''}${p.signoff ? `, hilsen: ${p.signoff}` : ''}</span></div>
      ${leader ? html`<details class="place-edit"><summary>Ret</summary>
        <form class="stack-tight" data-place-form="${p.id}">
          <label class="field"><span>Navn</span><input name="name" required maxlength="120" value="${p.name}"></label>
          <label class="field"><span>Type</span><select name="kind">${Object.entries(KIND).map(([k, v]) => html`<option value="${k}" ${p.kind === k ? 'selected' : ''}>${v}</option>`)}</select></label>
          <label class="field"><span>Egen hilsen <small>tom = virksomhedens hilsen</small></span><input name="signoff" maxlength="200" value="${p.signoff ?? ''}" placeholder="${state.org.signoff ?? 'Mange hilsner fra …'}"></label>
          <label class="field"><span>Andre navne <small>som platformene bruger om stedet, adskilt med komma</small></span><input name="aliases" value="${(p.aliases ?? []).join(', ')}"></label>
          <div class="actions"><button class="secondary" type="submit">Gem</button>
            ${state.properties.length > 1 ? html`<button type="button" class="link quiet" data-archive="${p.id}">Arkivér stedet</button>` : ''}</div>
        </form></details>` : ''}
    </li>`)}</ul>
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
    ${planPanel(billing, owner)}
  </section>
  </div>`);

  const $ = (s) => view.querySelector(s);
  const anchor = location.hash.match(/^#\/indstillinger#([a-z]+)/)?.[1];
  if (anchor) view.querySelector(`#${anchor}`)?.scrollIntoView({ block: 'start' });
  if (location.hash.includes('betaling=ok')) {
    toast('Tak. Det kan tage et minut, før abonnementet står som aktivt.');
    history.replaceState(null, '', '#/indstillinger');
  }
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
    if (owner && e.target.auto) patch.auto_reply_positive = e.target.auto.checked;
    if (owner) patch.approval_threshold = Number(e.target.threshold.value);
    busy(e.target.querySelector('button'), async () => { await state.api.updateOrg(state.org.id, patch); Object.assign(state.org, patch); toast('Gemt.'); });
  });
  $('#notifyForm')?.addEventListener('change', (e) => {
    const f = e.currentTarget;
    const patch = { notify_alerts: f.alerts.checked, notify_weekly: f.weekly.checked };
    busy(null, async () => { await state.api.updateOrg(state.org.id, patch); Object.assign(state.org, patch); toast('Gemt.'); });
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
      // Har de et abonnement, skal det ekstra sted med på næste regning
      if (owner && billing?.status === 'active') await state.api.syncPlaces(state.org.id).catch(() => {});
      await after('Stedet er tilføjet.');
    });
  });
  $('#checkout')?.addEventListener('click', (e) => busy(e.target, async () => { location.href = await state.api.startCheckout(state.org.id); }));
  $('#portal')?.addEventListener('click', (e) => busy(e.target, async () => { location.href = await state.api.openPortal(state.org.id); }));
  view.querySelectorAll('[data-place-form]').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const patch = {
      name: f.name.value.trim(), kind: f.kind.value, signoff: f.signoff.value.trim() || null,
      aliases: f.aliases.value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20),
    };
    busy(form.querySelector('button[type=submit]'), async () => { await state.api.updateProperty(form.dataset.placeForm, patch); await after('Stedet er gemt.'); });
  }));
  view.querySelectorAll('[data-archive]').forEach((b) => b.addEventListener('click', () => {
    // To tryk: første tryk spørger, andet arkiverer
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tryk igen for at arkivere. Anmeldelserne bliver gemt.'; return; }
    busy(b, async () => {
      await state.api.updateProperty(b.dataset.archive, { archived_at: new Date().toISOString() });
      if (state.place === b.dataset.archive) state.place = 'all';
      if (owner && billing?.status === 'active') await state.api.syncPlaces(state.org.id).catch(() => {});
      await after('Stedet er arkiveret og tæller ikke længere med i prisen.');
    });
  }));
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

const PRICE_FIRST = 595, PRICE_EXTRA = 395, PRICE_PILOT = 300;
const kr = (n) => `${n.toLocaleString('da-DK')} kr.`;

function planPanel(b, owner) {
  if (!b) return html`<p class="hint">Abonnementet kunne ikke hentes lige nu.</p>`;
  const monthly = PRICE_FIRST + PRICE_EXTRA * Math.max(0, b.places - 1);
  const price = html`<p>${b.places} ${b.places === 1 ? 'sted' : 'steder'}: ${kr(monthly)} pr. måned ekskl. moms
    <small class="muted">(${kr(PRICE_FIRST)} for første sted${b.places > 1 ? `, ${kr(PRICE_EXTRA)} for hvert ekstra` : ''})</small></p>`;
  const ownerOnly = html`<p class="hint">Kun ejeren kan ændre abonnementet.</p>`;
  if (b.status === 'pilot') return html`<p>I er pilotkunde. Der er intet at betale i appen.</p>`;
  if (b.status === 'active') return html`
    <p>Aktivt.${b.current_period_end ? ` ${b.cancel_at_period_end ? 'Stopper' : 'Fornyes'} ${date(b.current_period_end)}.` : ''}</p>${price}
    ${owner ? html`<button type="button" class="secondary" id="portal">Kort, fakturaer og opsigelse</button>` : ownerOnly}`;
  if (b.status === 'past_due') return html`
    <p class="warn">Den seneste betaling gik ikke igennem. Opdatér kortet, så I ikke mister adgangen.</p>
    ${owner ? html`<button type="button" class="primary" id="portal">Opdatér kort</button>` : ownerOnly}`;
  const trialLeft = b.status === 'trialing' ? Math.max(0, Math.ceil((new Date(b.trial_ends_at) - Date.now()) / 86400000)) : 0;
  const intro = b.status === 'trialing' && trialLeft > 0
    ? html`<p>Prøveperiode med ${trialLeft} ${trialLeft === 1 ? 'dag' : 'dage'} tilbage. Vælger I at fortsætte nu, trækkes den første betaling først, når prøveperioden slutter.</p>`
    : html`<p>${b.status === 'canceled' ? 'Abonnementet er stoppet.' : 'Prøveperioden er slut.'} Anmeldelserne er gemt. Fortsæt for at få nye anmeldelser og svarforslag igen.</p>`;
  return html`${intro}${price}
    ${b.pilot_pricing ? html`<p class="hint">Som pilothotel betaler I ${kr(PRICE_PILOT)} pr. måned de første tre måneder.</p>` : ''}
    ${owner ? html`<button type="button" class="primary plan-btn" id="checkout">Fortsæt med abonnement</button>
      <p class="hint">Betaling med kort via Stripe. Ingen binding: I kan stoppe til udgangen af en betalt måned.</p>` : ownerOnly}`;
}
