// Sæt en anmeldelse ind i hånden: kopiér den fra platformen, og få et svarforslag med det samme.
// Den hurtigste vej til første svar, før videresendelse og Google er sat op.
import { reloadQueue, state } from '../state.js';
import { PLATFORMS, platformName } from '../platforms.js';
import { busy, html, mount, toast } from '../ui.js';

const CHOICES = ['google', 'booking', 'expedia', 'airbnb', 'tripadvisor', 'vrbo', 'hostelworld', 'agoda', 'holidaycheck', 'tripcom', 'thefork', 'trustpilot', 'facebook', 'other'];

/** Samme anmeldelse sat ind to gange giver samme nøgle, så den ikke gemmes dobbelt. */
async function manualKey(platform, author, body) {
  const text = `${platform}|${(author ?? '').trim().toLowerCase()}|${body.replace(/\s+/g, ' ').trim().toLowerCase()}`;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return `manual:${[...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return `manual:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function renderNewReview(el) {
  const places = state.properties;
  const first = state.place !== 'all' ? state.place : places[0]?.id;
  mount(el, html`<section class="new-review" aria-labelledby="nyTitel">
    <h2 id="nyTitel">Sæt en anmeldelse ind</h2>
    <p class="hint">Kopiér anmeldelsen fra platformen og sæt den ind her. Så får I et svarforslag med det samme.</p>
    <form id="newReview" class="stack">
      ${places.length > 1 ? html`<label class="field"><span>Sted</span><select name="property">
        ${places.map((p) => html`<option value="${p.id}" ${p.id === first ? 'selected' : ''}>${p.name}</option>`)}</select></label>` : ''}
      <div class="field-row">
        <label class="field"><span>Platform</span><select name="platform">
          ${CHOICES.map((k) => html`<option value="${k}" ${k === 'booking' ? 'selected' : ''}>${platformName(k)}</option>`)}</select></label>
        <label class="field"><span>Karakter <small id="scaleHint">af ${PLATFORMS.booking.scale}</small></span>
          <input name="rating" type="number" inputmode="decimal" min="0" max="10" step="0.1" placeholder="Fx 8"></label>
      </div>
      <label class="field"><span>Gæstens navn <small>hvis det står der</small></span><input name="author" autocomplete="off" maxlength="120"></label>
      <label class="field"><span>Anmeldelsen</span><textarea name="body" rows="7" required maxlength="8000" placeholder="Sæt gæstens tekst ind her"></textarea></label>
      <label class="field"><span>Link til anmeldelsen <small>valgfrit, så svarsiden åbner det rigtige sted</small></span>
        <input name="url" type="url" inputmode="url" placeholder="https://" pattern="https://.*"></label>
      <div class="actions">
        <button class="primary" type="submit">Gem og lav svarforslag</button>
        <a class="button-link" href="#/">Annullér</a>
      </div>
    </form>
  </section>`);

  const form = el.querySelector('#newReview');
  const scaleHint = el.querySelector('#scaleHint');
  const rating = form.elements.rating;
  const syncScale = () => {
    const scale = PLATFORMS[form.elements.platform.value]?.scale ?? 5;
    scaleHint.textContent = `af ${scale}`;
    rating.max = String(scale);
  };
  form.elements.platform.addEventListener('change', syncScale);
  syncScale();
  form.elements.body.focus();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const button = form.querySelector('button[type=submit]');
    busy(button, async () => {
      const f = form.elements;
      const platform = f.platform.value;
      const scale = PLATFORMS[platform]?.scale ?? 5;
      const body = f.body.value.trim();
      const author = f.author.value.trim() || null;
      const value = f.rating.value === '' ? null : Number(String(f.rating.value).replace(',', '.'));
      if (value != null && (!Number.isFinite(value) || value < 0 || value > scale)) throw new Error(`Karakteren skal være mellem 0 og ${scale}.`);
      const url = f.url.value.trim();
      if (url && !/^https:\/\//.test(url)) throw new Error('Linket skal starte med https://');
      const review = await state.api.addReview(state.org.id, {
        property_id: f.property?.value ?? first ?? null, platform, author, body,
        rating: value, scale, source_url: url || null,
        dedupe_key: await manualKey(platform, author, body),
      });
      await state.api.newDraft(review.id).catch((err) => toast(`Anmeldelsen er gemt, men svarforslaget kom ikke: ${err.message}`, 'error'));
      await reloadQueue();
      location.hash = `#/anmeldelse/${review.id}`;
    });
  });
}
