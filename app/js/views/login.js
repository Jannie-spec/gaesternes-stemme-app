import { state } from '../state.js';
import { busy, html, mount } from '../ui.js';

export function renderLogin(root, { inviteToken }) {
  // Kommer man fra websitets "Start gratis prøve", er det en ny kunde
  const start = !inviteToken && new URLSearchParams(location.search).has('start');
  const title = inviteToken ? 'Du er inviteret' : start ? 'Start 14 dages gratis prøve' : 'Log ind';
  const lead = inviteToken
    ? 'Skriv den mailadresse, invitationen er sendt til. Du får et link til at logge ind.'
    : start
      ? 'Skriv din mail. Du får et link, og så opretter du jeres hotel på et par minutter. Uden kort og uden binding.'
      : 'Skriv din mail. Du får et link, så du ikke skal huske en adgangskode. Er du ny, opretter du jer bagefter.';
  mount(root, html`<div class="entry">
    <section class="entry-card">
      <p class="mark"><a href="../" aria-label="Ekkoly, forsiden"><svg class="logo-mark" viewBox="0 0 72 72" aria-hidden="true"><rect width="72" height="72" rx="18" fill="var(--logo-bg)"/><g fill="none" stroke="var(--logo-echo)" stroke-linecap="round" stroke-width="2.4"><path d="M56 10.5a8 8 0 0 1 5 6.5" opacity=".9"/><path d="M58.5 5a14 14 0 0 1 8.5 11.5" opacity=".5"/></g><g transform="translate(0 2)"><path d="M27 34C20 27 10 26 3 31c2.6 2.4 3.6 5.6 3 9 3-1.4 6.2-1.2 8.6.8-.5 2.6.2 5 2 6.8 1.8-1.7 4.4-2.3 7-1.6L27 42z" fill="#5e4f5c"/><path d="M45 34c7-7 17-8 24-3-2.6 2.4-3.6 5.6-3 9-3-1.4-6.2-1.2-8.6.8.5 2.6-.2 5-2 6.8-1.8-1.7-4.4-2.3-7-1.6L45 42z" fill="#5e4f5c"/><path d="M23.5 29.5 21 13.5q.4-2.2 2.3-1l9 11.5zM48.5 29.5 51 13.5q-.4-2.2-2.3-1l-9 11.5z" fill="#7d6c78" stroke="#7d6c78" stroke-width="3" stroke-linejoin="round"/><path d="M24.8 25.5 23.6 17.2l4.6 6zM47.2 25.5l1.2-8.3-4.6 6z" fill="#e9b9b0" stroke="#e9b9b0" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="36" cy="40.5" rx="17" ry="17.5" fill="#7d6c78"/><ellipse cx="36" cy="47.5" rx="9.5" ry="8.5" fill="#f3e8dc"/><ellipse cx="26.5" cy="49" rx="3.6" ry="2.6" transform="rotate(-30 26.5 49)" fill="#5e4f5c"/><ellipse cx="45.5" cy="49" rx="3.6" ry="2.6" transform="rotate(30 45.5 49)" fill="#5e4f5c"/><ellipse cx="30.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><ellipse cx="41.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><circle cx="26.6" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><circle cx="45.4" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><path d="M33.8 39.8q2.2 2 4.4 0" fill="none" stroke="#2a2230" stroke-width="1.4" stroke-linecap="round"/><path d="M34.6 40.6l.5 1.4.6-1.1M37.4 40.6l-.5 1.4-.6-1.1" fill="#f3e8dc"/></g></svg><span class="logo">e<span>k</span><span class="echo">k</span>oly</span></a></p>
      <h1>${title}</h1>
      <p class="lead">${lead}</p>
      <form id="loginForm" class="stack">
        <label class="field"><span>Din mail</span><input type="email" name="email" required autocomplete="email" inputmode="email"></label>
        <button class="primary" type="submit">${start ? 'Send link og kom i gang' : 'Send login-link'}</button>
      </form>
      <p id="sent" class="sent" hidden>Tjek din mail. Linket virker i en time.</p>
      ${inviteToken ? '' : html`<p class="aside">Vil du se, hvordan det virker? <a href="?demo#/">Prøv demoen</a></p>`}
      ${start ? html`<p class="aside">Ved at oprette en konto accepterer I <a href="../betingelser.html">handelsbetingelserne</a> og <a href="../privatliv.html">privatlivspolitikken</a>.</p>` : ''}
    </section>
  </div>`);
  const form = root.querySelector('#loginForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    busy(form.querySelector('button'), async () => {
      await state.api.signIn(email);
      form.hidden = true;
      root.querySelector('#sent').hidden = false;
    });
  });
}
