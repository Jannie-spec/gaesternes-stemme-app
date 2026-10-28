import { state } from '../state.js';
import { busy, html, mount } from '../ui.js';

export function renderInvite(root, token, done) {
  mount(root, html`<div class="entry"><section class="entry-card">
    <p class="mark">Ekkoly</p>
    <h1>Bliv en del af teamet</h1>
    <p class="lead">Du er logget ind som ${state.user.email}. Tryk for at tage imod invitationen.</p>
    <button class="primary" id="accept" type="button">Tag imod invitationen</button>
  </section></div>`);
  const button = root.querySelector('#accept');
  button.addEventListener('click', () => busy(button, async () => {
    await state.api.acceptInvite(token);
    location.hash = '#/';
    await done();
  }, 'Velkommen. Du kan nu se jeres anmeldelser.'));
}
