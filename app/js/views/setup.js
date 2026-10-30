// Opsætning: få anmeldelserne til at komme ind af sig selv.
// Hotellet laver én gang en regel i sin indbakke, der videresender platformenes
// anmeldelses-mails til Ekkoly. Siden viser adressen, en vejledning til den mailudbyder,
// hotellet bruger, Gmails bekræftelseskode og et flueben for hver platform, der virker.

import { INBOUND_MAIL_DOMAIN } from '../../config.js';
import { isLeader, state } from '../state.js';
import { platformName } from '../platforms.js';
import { copy, html, mount, toast, when as whenRaw } from '../ui.js';

const when = (iso) => { const t = whenRaw(iso); return t.charAt(0).toLowerCase() + t.slice(1); };

// Afsendere, reglen skal fange. Ekkoly springer selv bookinger og nyhedsbreve fra de samme
// afsendere over og sletter indholdet, så reglen må gerne fange lidt for meget.
export const SENDERS = [
  'booking.com', 'expediapartnercentral.com', 'expedia.com', 'hotels.com', 'airbnb.com', 'airbnb.dk',
  'tripadvisor.com', 'tripadvisor.dk', 'vrbo.com', 'hostelworld.com', 'agoda.com', 'trip.com',
  'holidaycheck.com', 'holidaycheck.de', 'trustpilot.com', 'thefork.com', 'businessprofile-noreply@google.com',
];

// De platforme, der får et flueben. Resten tælles under "Andre".
const CHECK = ['google', 'booking', 'expedia', 'airbnb', 'tripadvisor', 'hostelworld'];

const PROVIDERS = {
  gmail: {
    name: 'Gmail eller Google Workspace',
    steps: (addr) => [
      html`Åbn Gmail på en computer. Klik på tandhjulet øverst til højre og vælg <strong>Se alle indstillinger</strong>.`,
      html`Gå til fanen <strong>Videresendelse og POP/IMAP</strong>, og klik <strong>Tilføj en videresendelsesadresse</strong>. Sæt jeres Ekkoly-adresse ind: <code>${addr}</code>`,
      html`Gmail sender nu en bekræftelseskode til Ekkoly. Koden dukker op her på siden om et øjeblik. Sæt den ind i Gmail, og klik <strong>Bekræft</strong>. Lad "Videresend en kopi af indgående mail" være slået fra. Det klarer filteret.`,
      html`Gå til fanen <strong>Filtre og blokerede adresser</strong>, og klik <strong>Opret et nyt filter</strong>. Sæt afsenderne nedenfor ind i feltet <strong>Fra</strong>, og klik <strong>Opret filter</strong>.`,
      html`Sæt flueben i <strong>Videresend den til</strong>, vælg jeres Ekkoly-adresse, og klik <strong>Opret filter</strong>. Færdig.`,
    ],
    senders: SENDERS.join(' OR '),
    sendersLabel: 'Sæt dette ind i feltet Fra',
  },
  outlook: {
    name: 'Outlook eller Microsoft 365',
    steps: (addr) => [
      html`Åbn Outlook på nettet (outlook.com eller outlook.office.com). Klik på tandhjulet, og vælg <strong>Mail</strong> og derefter <strong>Regler</strong>.`,
      html`Klik <strong>Tilføj ny regel</strong>, og kald den "Ekkoly".`,
      html`Vælg betingelsen <strong>Afsenderadressen indeholder</strong> (står under "Personer"), og tilføj afsenderne nedenfor én ad gangen.`,
      html`Vælg handlingen <strong>Videresend til</strong>, og sæt jeres Ekkoly-adresse ind: <code>${addr}</code>. Klik <strong>Gem</strong>.`,
      html`Siger Outlook, at automatisk videresendelse er blokeret, skal den, der styrer jeres Microsoft 365, tillade videresendelse til jeres Ekkoly-adresse.`,
    ],
    senders: SENDERS.join('\n'),
    sendersLabel: 'Afsendere, én pr. linje',
  },
  onecom: {
    name: 'one.com',
    steps: (addr) => [
      html`Log ind på one.com webmail. Åbn <strong>Indstillinger</strong>, og find <strong>Filtre</strong>.`,
      html`Opret et nyt filter: når <strong>Fra</strong> indeholder en af afsenderne nedenfor, så <strong>videresend en kopi</strong> til <code>${addr}</code>.`,
      html`Kan filteret kun have én afsender, så lav ét filter for hver af de platforme, I bruger. Booking.com, Expedia, Airbnb og Tripadvisor er de vigtigste.`,
    ],
    senders: SENDERS.join('\n'),
    sendersLabel: 'Afsendere, én pr. linje',
  },
  other: {
    name: 'Andet mailprogram',
    steps: (addr) => [
      html`Find <strong>Regler</strong> eller <strong>Filtre</strong> i jeres mailprogram. Står en anden for jeres mail, kan I sende dem denne side.`,
      html`Reglen skal sige: mails fra afsenderne nedenfor <strong>videresendes som kopi</strong> til <code>${addr}</code>. Jeres egne mails bliver liggende som hidtil.`,
      html`Brug en regel på mailserveren, ikke i et program på en computer. Apple Mail-regler virker for eksempel kun, når computeren er tændt.`,
    ],
    senders: SENDERS.join('\n'),
    sendersLabel: 'Afsendere, én pr. linje',
  },
};

let pollTimer = null;

export async function renderSetup(view) {
  clearTimeout(pollTimer);
  if (!isLeader()) {
    mount(view, html`<h1 class="page-title">Opsætning</h1><section class="panel"><p>Det er en leder eller ejeren, der sætter videresendelsen op. Spørg dem, eller sæt anmeldelser ind i hånden under <a href="#/ny">I dag</a>.</p></section>`);
    return;
  }
  const address = INBOUND_MAIL_DOMAIN ? `${state.org.inbound_token}@${INBOUND_MAIL_DOMAIN}` : (state.demo ? `${state.org.inbound_token}@ekkoly.com` : '');
  if (!address) {
    mount(view, html`<h1 class="page-title">Opsætning</h1><section class="panel"><p>Jeres adresse bliver klar, når maildomænet er sat op. Indtil da kan I sætte anmeldelser ind i hånden.</p></section>`);
    return;
  }
  const chosen = (() => { try { return localStorage.getItem('ekkoly-mailudbyder'); } catch { return null; } })();
  const provider = PROVIDERS[chosen] ? chosen : 'gmail';

  const [confirmations, seen] = await Promise.all([
    state.api.forwardingConfirmations(state.org.id).catch(() => []),
    state.api.platformStatus(state.org.id).catch(() => []),
  ]);
  const last = new Map();
  for (const row of seen) if (!last.has(row.platform)) last.set(row.platform, row.received_at);
  const others = [...last.keys()].filter((p) => !CHECK.includes(p));
  const fresh = confirmations.filter((c) => Date.now() - new Date(c.received_at).getTime() < 48 * 3600e3);
  const p = PROVIDERS[provider];

  mount(view, html`<h1 class="page-title">Opsætning</h1>
  <p class="summary">Lav én regel i jeres indbakke, så kommer nye anmeldelser ind af sig selv. Det tager omkring fem minutter.</p>
  <div class="setup">

  <section class="panel">
    <h2>1. Jeres adresse hos Ekkoly</h2>
    <div class="address"><code>${address}</code><button type="button" class="secondary" id="copyAddress">Kopiér adressen</button></div>
    <p class="hint">Mails til adressen bliver kun læst af Ekkoly. Mails, der ikke er anmeldelser, springes over, og indholdet slettes.</p>
  </section>

  <section class="panel">
    <h2>2. Lav reglen i jeres indbakke</h2>
    <p>Hvor modtager I mails fra Booking.com, Airbnb og de andre?</p>
    <div class="chips" role="group" aria-label="Mailudbyder">${Object.entries(PROVIDERS).map(([key, v]) =>
      html`<button type="button" class="chip" data-provider="${key}" aria-pressed="${key === provider}">${v.name}</button>`)}</div>
    <ol class="setup-steps">${p.steps(address).map((s) => html`<li>${s}</li>`)}</ol>
    ${provider === 'gmail' ? (fresh.length
      ? html`<div class="code-box" role="status"><p class="code-label">Gmails bekræftelseskode${fresh[0].account ? html` for ${fresh[0].account}` : ''}</p>
          <p class="code">${fresh[0].code ?? 'Koden stod ikke i mailen'}</p>
          <div class="actions">${fresh[0].code ? html`<button type="button" class="secondary" id="copyCode">Kopiér koden</button>` : ''}
          ${fresh[0].confirm_url ? html`<a class="secondary button-plain" href="${fresh[0].confirm_url}" target="_blank" rel="noopener">Eller bekræft direkte hos Google</a>` : ''}</div>
          <p class="hint">Modtaget ${when(fresh[0].received_at)}.</p></div>`
      : html`<div class="code-box waiting" role="status"><p class="code-label">Gmails bekræftelseskode</p><p class="hint">Venter på koden fra Gmail. Siden opdaterer sig selv.</p></div>`) : ''}
    <label class="field senders"><span>${p.sendersLabel}</span>
      <textarea readonly rows="${provider === 'gmail' ? 4 : 7}" id="senders">${p.senders}</textarea></label>
    <button type="button" class="secondary" id="copySenders">Kopiér afsenderne</button>
  </section>

  <section class="panel">
    <h2>3. Virker det?</h2>
    <p>Når den første anmeldelse fra en platform er kommet ind, får platformen et flueben her. Det sker, næste gang en gæst skriver en anmeldelse. Vil I teste med det samme, så videresend én gammel anmeldelses-mail i hånden.</p>
    <ul class="checklist">${CHECK.map((pl) => {
      const t = last.get(pl);
      return html`<li class="${t ? 'ok' : ''}"><span class="tick" aria-hidden="true">${t ? '✓' : ''}</span><span class="pl">${platformName(pl)}</span>
        <span class="muted">${t ? `Virker. Seneste anmeldelse kom ${when(t)}` : 'Venter på første anmeldelse'}</span></li>`;
    })}${others.length ? html`<li class="ok"><span class="tick" aria-hidden="true">✓</span><span class="pl">${others.map(platformName).join(', ')}</span><span class="muted">Virker</span></li>` : ''}</ul>
    <button type="button" class="link" id="recheck">Tjek igen</button>
  </section>
  </div>`);

  view.querySelectorAll('[data-provider]').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('ekkoly-mailudbyder', b.dataset.provider); } catch { /* privat vindue */ }
    renderSetup(view);
  }));
  const copyBtn = (sel, text, msg) => view.querySelector(sel)?.addEventListener('click', async () =>
    toast((await copy(text)) ? msg : 'Markér teksten og kopiér selv.'));
  copyBtn('#copyAddress', address, 'Adressen er kopieret.');
  copyBtn('#copySenders', p.senders, 'Afsenderne er kopieret.');
  copyBtn('#copyCode', fresh[0]?.code ?? '', 'Koden er kopieret.');
  view.querySelector('#recheck').addEventListener('click', () => renderSetup(view));

  // Mens siden er åben, kigger vi efter Gmails kode og nye flueben hvert 15. sekund
  pollTimer = setTimeout(() => {
    if (location.hash.startsWith('#/opsaetning') && document.body.contains(view)) renderSetup(view);
  }, 15000);
}
