// Små hjælpere til visningerne.

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// html`...` escaper alle indsatte værdier, medmindre de selv er lavet med html`...`.
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    const piece = Array.isArray(v) ? v.map((x) => (x instanceof Safe ? x.s : esc(x))).join('') : v instanceof Safe ? v.s : v === false || v == null ? '' : esc(v);
    out += piece + strings[i + 1];
  });
  return new Safe(out);
}
export const raw = (s) => new Safe(s);

export function mount(el, content) { el.innerHTML = String(content); }

const fmtDate = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Copenhagen' });
const fmtShort = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', timeZone: 'Europe/Copenhagen' });
export function when(iso) {
  if (!iso) return 'Dato ukendt';
  const d = new Date(iso), days = Math.floor((Date.now() - d) / 86400000);
  if (days <= 0) return 'I dag';
  if (days === 1) return 'I går';
  if (days < 7) return `For ${days} dage siden`;
  return d.getFullYear() === new Date().getFullYear() ? fmtShort.format(d) : fmtDate.format(d);
}
export const date = (iso) => (iso ? fmtDate.format(new Date(iso)) : '');

export function score(r) {
  if (r.rating == null || !r.scale) return '';
  const n = Number(r.rating).toLocaleString('da-DK', { maximumFractionDigits: 1 });
  return `${n}/${r.scale}`;
}

/** Hvor godt er karakteren på en skala fra 0 til 1 (bruges til farven på karakteren). */
export const tone = (r) => (r.rating == null || !r.scale ? null : r.rating / r.scale);

let toastTimer;
export function toast(message, kind = 'ok') {
  let el = document.querySelector('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 7000 : 3500);
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text; document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { /* ignoreres */ }
    t.remove(); return ok;
  }
}

/** Kører en handling med en knap, viser "arbejder"-tilstand og fejl. */
export async function busy(button, work, doneText) {
  const label = button?.textContent;
  if (button) { button.disabled = true; button.dataset.busy = 'true'; }
  try {
    const result = await work();
    if (doneText) toast(doneText);
    return result;
  } catch (e) {
    toast(e.message || 'Noget gik galt. Prøv igen.', 'error');
    return undefined;
  } finally {
    if (button && button.isConnected) { button.disabled = false; delete button.dataset.busy; button.textContent = label; }
  }
}
