// Ekkoly-administration: kun for Ekkolys egne administratorer. Viser kunderne med nøgletal
// (aldrig anmeldelser eller svar) og lader os forlænge prøveperioder og give pilotpris.
// Databasen tjekker selv, at den indloggede er administrator.
import { state } from '../state.js';
import { busy, date, html, mount, toast, when } from '../ui.js';

const STATUS = {
  trialing: 'Prøveperiode', active: 'Betaler', past_due: 'Betaling fejlet', canceled: 'Stoppet', pilot: 'Pilot',
};

function statusOf(o) {
  if (o.status === 'trialing') {
    const days = Math.ceil((new Date(o.trial_ends_at) - Date.now()) / 86400000);
    return days > 0 ? { key: 'trial', text: `Prøve, ${days} ${days === 1 ? 'dag' : 'dage'} tilbage` } : { key: 'expired', text: 'Prøve udløbet' };
  }
  if (o.status === 'active' && o.cancel_at_period_end) return { key: 'ending', text: `Betaler, stopper ${date(o.current_period_end)}` };
  return { key: o.status, text: STATUS[o.status] ?? o.status };
}

export async function renderAdmin(view) {
  if (!state.isAdmin) { mount(view, html`<p>Siden findes ikke.</p>`); return; }
  mount(view, html`<p class="loading">Henter kunderne</p>`);
  let orgs;
  try { orgs = await state.api.adminOrgs(); } catch (e) { mount(view, html`<p>${e.message}</p>`); return; }

  const rows = orgs.map((o) => ({ ...o, s: statusOf(o) }));
  const count = (k) => rows.filter((o) => o.s.key === k).length;
  const pilots = rows.filter((o) => o.pilot_pricing).length;
  const paying = rows.filter((o) => ['active', 'ending'].includes(o.s.key));
  const mrrPlaces = paying.reduce((sum, o) => sum + Math.max(1, o.places), 0);

  mount(view, html`<h1 class="page-title">Ekkoly-administration</h1>
  <p class="hint admin-note">Kun du kan se denne side. Den viser nøgletal, aldrig kundernes anmeldelser eller svar. Betalinger og fakturaer styres i Stripe.</p>
  <dl class="admin-stats">
    <div><dt>Kunder i alt</dt><dd>${rows.length}</dd></div>
    <div><dt>I prøveperiode</dt><dd>${count('trial')}</dd></div>
    <div><dt>Betaler</dt><dd>${paying.length}<small>${mrrPlaces} ${mrrPlaces === 1 ? "sted" : "steder"}</small></dd></div>
    <div><dt>Pilothoteller</dt><dd>${pilots} <small>af 10</small></dd></div>
    <div><dt>Prøve udløbet</dt><dd>${count('expired')}</dd></div>
    <div><dt>Stoppet</dt><dd>${count('canceled')}</dd></div>
  </dl>
  ${rows.length ? html`<ul class="admin-list">${rows.map((o) => html`<li class="admin-org">
    <div class="admin-head">
      <h2>${o.name}</h2>
      <span class="admin-status admin-${o.s.key}">${o.s.text}</span>
      ${o.pilot_pricing ? html`<span class="admin-status admin-pilotmark">Pilotpris</span>` : ''}
    </div>
    <p class="muted">${o.owner_email ? html`<a href="mailto:${o.owner_email}">${o.owner_email}</a>, ` : ''}oprettet ${date(o.created_at)}</p>
    <dl class="admin-facts">
      <div><dt>Steder</dt><dd>${o.places}</dd></div>
      <div><dt>Brugere</dt><dd>${o.members}</dd></div>
      <div><dt>Anmeldelser</dt><dd>${o.reviews}</dd></div>
      <div><dt>Seneste 30 dage</dt><dd>${o.reviews_30d}</dd></div>
      <div><dt>Seneste anmeldelse</dt><dd>${o.last_review_at ? when(o.last_review_at) : 'Ingen endnu'}</dd></div>
    </dl>
    <div class="actions">
      ${o.status === 'trialing' && !o.has_subscription ? html`<button type="button" class="secondary" data-extend="${o.id}">Forlæng prøven 14 dage</button>` : ''}
      <button type="button" class="secondary" data-pilot="${o.id}" data-on="${o.pilot_pricing ? '' : '1'}">${o.pilot_pricing ? 'Fjern pilotpris' : 'Giv pilotpris'}</button>
    </div>
    ${o.pilot_pricing && o.has_subscription ? html`<p class="hint">Kunden betaler allerede. Pilotprisen gælder kun ved nye abonnementer, så ret prisen i Stripe, hvis den skal ændres.</p>` : ''}
  </li>`)}</ul>` : html`<p class="empty-state">Ingen kunder endnu.</p>`}`);

  view.querySelectorAll('[data-extend]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    await state.api.adminExtendTrial(b.dataset.extend, 14);
    toast('Prøveperioden er forlænget med 14 dage.');
    await renderAdmin(view);
  })));
  view.querySelectorAll('[data-pilot]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    const on = Boolean(b.dataset.on);
    await state.api.adminSetPilot(b.dataset.pilot, on);
    toast(on ? 'Kunden får pilotpris (300 kr. i tre måneder), når de starter abonnementet.' : 'Pilotprisen er fjernet.');
    await renderAdmin(view);
  })));
}
