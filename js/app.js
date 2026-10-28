import { api, configured } from './api.js';
import { demo } from './demo.js';
import { state, loadOrgData } from './state.js';
import { html, mount, toast } from './ui.js';
import { renderLogin } from './views/login.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderInbox } from './views/inbox.js';
import { renderOverview } from './views/overview.js';
import { renderSettings } from './views/settings.js';
import { renderInvite } from './views/invite.js';

const root = document.querySelector('#app');

function route() {
  const [, page = '', arg = ''] = location.hash.replace(/\?.*$/, '').split('/');
  return { page, arg };
}

function shell(active) {
  const a = state.access;
  const trial = a?.state === 'trial'
    ? html`<p class="trial">Prøveperiode: ${a.days_left} ${a.days_left === 1 ? 'dag' : 'dage'} tilbage.</p>`
    : a?.state === 'expired' ? html`<p class="trial trial-over">Prøveperioden er slut. Anmeldelserne er gemt, men der kommer ikke nye svarforslag.</p>` : '';
  const demoBar = state.demo ? html`<div class="demo-bar"><span>Prøveversion med opdigtede data</span>
      <label>Se appen som <select id="demoRole">
        <option value="owner" ${state.role === 'owner' ? 'selected' : ''}>ejer</option>
        <option value="manager" ${state.role === 'manager' ? 'selected' : ''}>leder</option>
        <option value="staff" ${state.role === 'staff' ? 'selected' : ''}>medarbejder</option>
      </select></label></div>` : '';
  const link = (href, label, key) => html`<a href="${href}" ${active === key ? 'aria-current=page' : ''}>${label}</a>`;
  return html`${demoBar}<header class="top">
      <a class="mark" href="#/">Gæsternes stemme</a>
      <span class="org">${state.org?.name}</span>
      <nav aria-label="Hovedmenu">${link('#/', 'I dag', 'inbox')}${link('#/overblik', 'Overblik', 'overview')}${link('#/indstillinger', 'Indstillinger', 'settings')}</nav>
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

  const active = page === 'overblik' ? 'overview' : page === 'indstillinger' ? 'settings' : 'inbox';
  mount(root, shell(active));
  root.querySelector('#signOut').addEventListener('click', async () => {
    if (state.demo) { location.href = location.pathname; return; }
    await state.api.signOut(); location.hash = '#/'; location.reload();
  });
  root.querySelector('#demoRole')?.addEventListener('change', (e) => { demo.switchRole(e.target.value); state.role = e.target.value; render(); });
  const view = root.querySelector('#view');
  if (active === 'overview') return renderOverview(view);
  if (active === 'settings') return renderSettings(view, render);
  return renderInbox(view, page === 'anmeldelse' ? arg : null);
}

/** Henter bruger, organisation og data, og tegner siden. */
export async function start() {
  try {
    const session = await state.api.session();
    state.user = session?.user ?? null;
    if (state.user) {
      const { user, list } = await state.api.memberships();
      state.user = user;
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
