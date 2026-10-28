import { state } from '../state.js';
import { busy, html, mount } from '../ui.js';

// Første gang: navnet på virksomheden, hilsenen under svarene og stederne.
export function renderOnboarding(root, done) {
  mount(root, html`<div class="entry">
    <section class="entry-card wide">
      <p class="mark">Ekkoly</p>
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
