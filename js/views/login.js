import { state } from '../state.js';
import { busy, html, mount } from '../ui.js';

export function renderLogin(root, { inviteToken }) {
  mount(root, html`<div class="entry">
    <section class="entry-card">
      <p class="mark">Gæsternes stemme</p>
      <h1>${inviteToken ? 'Du er inviteret' : 'Alle jeres anmeldelser ét sted'}</h1>
      <p class="lead">${inviteToken
        ? 'Skriv den mailadresse, invitationen er sendt til. Du får et link til at logge ind.'
        : 'Log ind med din mail. Du får et link, så du ikke skal huske en adgangskode.'}</p>
      <form id="loginForm" class="stack">
        <label class="field"><span>Din mail</span><input type="email" name="email" required autocomplete="email" inputmode="email"></label>
        <button class="primary" type="submit">Send login-link</button>
      </form>
      <p id="sent" class="sent" hidden>Tjek din mail. Linket virker i en time.</p>
      ${inviteToken ? '' : html`<p class="aside">Vil du se, hvordan det virker? <a href="?demo#/">Åbn prøveversionen</a></p>`}
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
