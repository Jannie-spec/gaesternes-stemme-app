import { api, configured } from './api.js';
import { demo } from './demo.js';
import { state, loadOrgData, reloadQueue } from './state.js';
import { html, mount, toast } from './ui.js';
import { renderLogin } from './views/login.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderInbox } from './views/inbox.js';
import { renderOverview } from './views/overview.js';
import { renderSettings } from './views/settings.js';
import { renderInvite } from './views/invite.js';
import { renderAdmin } from './views/admin.js';
import { renderInsight } from './views/insight.js';
import { renderReport } from './views/report.js';
import { renderSetup } from './views/setup.js';

const root = document.querySelector('#app');

function route() {
  // #/indstillinger#team: sidste del er et afsnit på siden
  const [, page = '', arg = ''] = location.hash.replace(/\?.*$/, '').replace(/^(#[^#]*)#.*$/, '$1').split('/');
  return { page, arg };
}

function shell(active) {
  const a = state.access;
  const trial = a?.state === 'trial'
    ? html`<p class="trial">Prøveperiode: ${a.days_left} ${a.days_left === 1 ? 'dag' : 'dage'} tilbage.</p>`
    : a?.state === 'expired' ? html`<p class="trial trial-over">Prøveperioden er slut. Anmeldelserne er gemt, men der kommer ikke nye svarforslag. <a href="#/indstillinger">Fortsæt med abonnement</a></p>`
    : a?.state === 'past_due' ? html`<p class="trial trial-over">Den seneste betaling gik ikke igennem. <a href="#/indstillinger">Opdatér kortet</a></p>` : '';
  const demoBar = state.demo ? html`<div class="demo-bar"><span>Prøveversion med opdigtede data</span>
      <label>Se appen som <select id="demoRole">
        <option value="owner" ${state.role === 'owner' ? 'selected' : ''}>ejer</option>
        <option value="manager" ${state.role === 'manager' ? 'selected' : ''}>leder</option>
        <option value="staff" ${state.role === 'staff' ? 'selected' : ''}>medarbejder</option>
      </select></label></div>` : '';
  const link = (href, label, key) => html`<a href="${href}" ${active === key ? 'aria-current=page' : ''}>${label}</a>`;
  return html`${demoBar}<header class="top">
      <a class="mark" href="#/" aria-label="Ekkoly, I dag"><svg class="logo-mark" viewBox="0 0 72 72" aria-hidden="true"><rect width="72" height="72" rx="18" fill="var(--logo-bg)"/><g fill="none" stroke="var(--logo-echo)" stroke-linecap="round" stroke-width="2.4"><path d="M56 10.5a8 8 0 0 1 5 6.5" opacity=".9"/><path d="M58.5 5a14 14 0 0 1 8.5 11.5" opacity=".5"/></g><g transform="translate(0 2)"><path d="M27 34C20 27 10 26 3 31c2.6 2.4 3.6 5.6 3 9 3-1.4 6.2-1.2 8.6.8-.5 2.6.2 5 2 6.8 1.8-1.7 4.4-2.3 7-1.6L27 42z" fill="#5e4f5c"/><path d="M45 34c7-7 17-8 24-3-2.6 2.4-3.6 5.6-3 9-3-1.4-6.2-1.2-8.6.8.5 2.6-.2 5-2 6.8-1.8-1.7-4.4-2.3-7-1.6L45 42z" fill="#5e4f5c"/><path d="M23.5 29.5 21 13.5q.4-2.2 2.3-1l9 11.5zM48.5 29.5 51 13.5q-.4-2.2-2.3-1l-9 11.5z" fill="#7d6c78" stroke="#7d6c78" stroke-width="3" stroke-linejoin="round"/><path d="M24.8 25.5 23.6 17.2l4.6 6zM47.2 25.5l1.2-8.3-4.6 6z" fill="#e9b9b0" stroke="#e9b9b0" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="36" cy="40.5" rx="17" ry="17.5" fill="#7d6c78"/><ellipse cx="36" cy="47.5" rx="9.5" ry="8.5" fill="#f3e8dc"/><ellipse cx="26.5" cy="49" rx="3.6" ry="2.6" transform="rotate(-30 26.5 49)" fill="#5e4f5c"/><ellipse cx="45.5" cy="49" rx="3.6" ry="2.6" transform="rotate(30 45.5 49)" fill="#5e4f5c"/><ellipse cx="30.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><ellipse cx="41.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><circle cx="26.6" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><circle cx="45.4" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><path d="M33.8 39.8q2.2 2 4.4 0" fill="none" stroke="#2a2230" stroke-width="1.4" stroke-linecap="round"/><path d="M34.6 40.6l.5 1.4.6-1.1M37.4 40.6l-.5 1.4-.6-1.1" fill="#f3e8dc"/></g></svg><span class="logo">e<span>k</span><span class="echo">k</span>oly</span></a>
      <span class="org">${state.org?.name}</span>
      <nav aria-label="Hovedmenu">${link('#/', 'I dag', 'inbox')}${link('#/overblik', 'Overblik', 'overview')}${link('#/indsigt', 'Indsigt', 'insight')}${link('#/indstillinger', 'Indstillinger', 'settings')}${state.isAdmin ? link('#/admin', 'Admin', 'admin') : ''}</nav>
      <button class="link quiet" id="signOut" type="button">${state.demo ? 'Luk prøveversionen' : 'Log ud'}</button>
    </header>${trial}<main id="view"></main>`;
}

async function render() {
  const { page, arg } = route();

  if (page === 'invitation') {
    if (!state.user) return renderLogin(root, { inviteToken: arg });
    return renderInvite(root, arg, start);
  }
  if (!state.user) return renderLogin(root, {});
  if (!state.org) return renderOnboarding(root, start);

  const active = page === 'overblik' ? 'overview' : page === 'indstillinger' || page === 'opsaetning' ? 'settings' : page === 'admin' && state.isAdmin ? 'admin'
    : page === 'indsigt' || page === 'rapport' ? 'insight' : 'inbox';
  mount(root, shell(active));
  root.querySelector('#signOut').addEventListener('click', async () => {
    if (state.demo) { location.href = location.pathname; return; }
    await state.api.signOut(); location.hash = '#/'; location.reload();
  });
  root.querySelector('#demoRole')?.addEventListener('change', (e) => { demo.switchRole(e.target.value); state.role = e.target.value; render(); });
  const view = root.querySelector('#view');
  if (active === 'overview') return renderOverview(view);
  if (page === 'opsaetning') return renderSetup(view);
  if (active === 'settings') return renderSettings(view, render);
  if (active === 'admin') return renderAdmin(view);
  if (page === 'rapport') return renderReport(view, arg);
  if (active === 'insight') return renderInsight(view);
  return renderInbox(view, page === 'anmeldelse' ? arg : page === 'ny' ? 'ny' : null);
}

/** Henter bruger, organisation og data, og tegner siden. */
export async function start() {
  try {
    const session = await state.api.session();
    state.user = session?.user ?? null;
    if (state.user) {
      const { user, list } = await state.api.memberships();
      state.user = user;
      state.isAdmin = await state.api.isAdmin().catch(() => false);
      const chosen = list.find((m) => m.org.id === localStorage.getItem('gs-org')) ?? list[0];
      state.org = chosen?.org ?? null;
      state.role = chosen?.role ?? null;
      if (state.org) { try { localStorage.setItem('gs-org', state.org.id); } catch { /* privat vindue */ } await loadOrgData(); }
    }
  } catch (e) {
    toast(e.message || 'Kunne ikke hente data', 'error');
  }
  await render();
  await finishGoogleIfReturning();
}

window.addEventListener('hashchange', render);

// Medarbejderen har trykket "Svaret er sendt" i Ekkoly-knappens panel på platformen
window.addEventListener('message', async (e) => {
  if (e.source !== window || e.data?.source !== 'ekkoly-ext' || e.data.type !== 'reply-done') return;
  const text = state.extPending?.[e.data.id];
  if (!text || !state.api) return;
  delete state.extPending[e.data.id];
  try {
    await state.api.markPosted(e.data.id, text);
    await reloadQueue();
    render();
  } catch { /* anmeldelsen kan markeres i hånden */ }
});

const params = new URLSearchParams(location.search);
if (params.has('demo') || !configured()) {
  state.api = demo; state.demo = true;
} else {
  state.api = api;
  api.onAuth((s) => { if (Boolean(s?.user) !== Boolean(state.user)) start(); });
}
start();

// Tilbage fra Google: gør forbindelsen færdig som den indloggede bruger.
async function finishGoogleIfReturning() {
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const code = params.get('google_code'), oauthState = params.get('google_state');
  if (params.get('google') === 'afvist') { history.replaceState(null, '', '#/indstillinger'); toast('Google-forbindelsen blev afbrudt.', 'error'); return; }
  if (!code || !state.org) return;
  history.replaceState(null, '', '#/indstillinger');
  try {
    await state.api.finishGoogle(code, oauthState);
    await loadOrgData();
    await render();
    toast('Google er forbundet. Vælg nu, hvilke steder lokationerne hører til.');
  } catch (e) {
    toast(e.message, 'error');
  }
}
