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
      <p class="mark"><a href="../">Ekkoly</a></p>
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
