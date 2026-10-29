import { state } from '../state.js';
import { busy, html, mount } from '../ui.js';

// Første gang: navnet på virksomheden, hilsenen under svarene og stederne.
export function renderOnboarding(root, done) {
  mount(root, html`<div class="entry">
    <section class="entry-card wide">
      <p class="mark" aria-label="Ekkoly"><svg class="logo-mark" viewBox="0 0 72 72" aria-hidden="true"><rect width="72" height="72" rx="18" fill="var(--logo-bg)"/><g fill="none" stroke="var(--logo-echo)" stroke-linecap="round" stroke-width="2.4"><path d="M56 10.5a8 8 0 0 1 5 6.5" opacity=".9"/><path d="M58.5 5a14 14 0 0 1 8.5 11.5" opacity=".5"/></g><g transform="translate(0 2)"><path d="M27 34C20 27 10 26 3 31c2.6 2.4 3.6 5.6 3 9 3-1.4 6.2-1.2 8.6.8-.5 2.6.2 5 2 6.8 1.8-1.7 4.4-2.3 7-1.6L27 42z" fill="#5e4f5c"/><path d="M45 34c7-7 17-8 24-3-2.6 2.4-3.6 5.6-3 9-3-1.4-6.2-1.2-8.6.8.5 2.6-.2 5-2 6.8-1.8-1.7-4.4-2.3-7-1.6L45 42z" fill="#5e4f5c"/><path d="M23.5 29.5 21 13.5q.4-2.2 2.3-1l9 11.5zM48.5 29.5 51 13.5q-.4-2.2-2.3-1l-9 11.5z" fill="#7d6c78" stroke="#7d6c78" stroke-width="3" stroke-linejoin="round"/><path d="M24.8 25.5 23.6 17.2l4.6 6zM47.2 25.5l1.2-8.3-4.6 6z" fill="#e9b9b0" stroke="#e9b9b0" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="36" cy="40.5" rx="17" ry="17.5" fill="#7d6c78"/><ellipse cx="36" cy="47.5" rx="9.5" ry="8.5" fill="#f3e8dc"/><ellipse cx="26.5" cy="49" rx="3.6" ry="2.6" transform="rotate(-30 26.5 49)" fill="#5e4f5c"/><ellipse cx="45.5" cy="49" rx="3.6" ry="2.6" transform="rotate(30 45.5 49)" fill="#5e4f5c"/><ellipse cx="30.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><ellipse cx="41.5" cy="36" rx="2" ry="2.5" fill="#2a2230"/><circle cx="26.6" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><circle cx="45.4" cy="40.2" r="2.4" fill="#e7958c" opacity=".75"/><path d="M33.8 39.8q2.2 2 4.4 0" fill="none" stroke="#2a2230" stroke-width="1.4" stroke-linecap="round"/><path d="M34.6 40.6l.5 1.4.6-1.1M37.4 40.6l-.5 1.4-.6-1.1" fill="#f3e8dc"/></g></svg><span class="logo">e<span>k</span><span class="echo">k</span>oly</span></p>
      <h1>Kom i gang</h1>
      <p class="lead">Tre ting, så er I klar. Alt kan ændres senere under Indstillinger.</p>
      <form id="setup" class="stack">
        <label class="field"><span>Virksomhedens navn</span>
          <input name="name" required minlength="2" placeholder="Hotel Havblik" autocomplete="organization"></label>
        <label class="field"><span>Hilsen under jeres svar</span>
          <input name="signoff" placeholder="Mange hilsner fra Havblik">
          <small>Står nederst i hvert svarforslag. Den oversættes, når gæsten skriver på et andet sprog.</small></label>
        <fieldset class="field"><legend>Jeres steder</legend>
          <small>Et hotel, et hostel, et sommerhus eller en restaurant. Hvert sted får sine egne anmeldelser.</small>
          <div id="places" class="stack-tight"></div>
          <button type="button" class="link" id="addPlace">Tilføj et sted mere</button>
        </fieldset>
        <button class="primary" type="submit">Opret og fortsæt</button>
      </form>
    </section>
  </div>`);

  const places = root.querySelector('#places');
  const addRow = () => {
    const row = document.createElement('div');
    row.className = 'place-row';
    row.innerHTML = String(html`<input name="place" placeholder="Stedets navn" aria-label="Stedets navn">
      <select name="kind" aria-label="Type sted">
        <option value="hotel">Hotel</option><option value="hostel">Hostel</option>
        <option value="vacation_rental">Ferieudlejning</option><option value="restaurant">Restaurant eller bar</option>
        <option value="other">Andet</option></select>`);
    places.append(row);
    row.querySelector('input').focus();
  };
  addRow();
  root.querySelector('#addPlace').addEventListener('click', addRow);

  const form = root.querySelector('#setup');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rows = [...places.querySelectorAll('.place-row')]
      .map((r) => ({ name: r.querySelector('input').value.trim(), kind: r.querySelector('select').value }))
      .filter((p) => p.name);
    busy(form.querySelector('button[type=submit]'), async () => {
      const org = await state.api.createOrg(form.name.value.trim(), form.signoff.value.trim());
      for (const p of rows.length ? rows : [{ name: form.name.value.trim(), kind: 'hotel' }]) {
        await state.api.addProperty(org.id, p);
      }
      location.hash = '#/indstillinger';
      await done();
    });
  });
}
