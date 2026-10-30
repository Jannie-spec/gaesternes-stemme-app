// Prøveversion med opdigtede data. Samme funktioner som api.js, men alt ligger i browseren
// og forsvinder, når siden lukkes. Bruges til at vise produktet frem og til at teste.

const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const id = () => crypto.randomUUID();

const ORG = {
  id: 'demo-org', name: 'Hotel Havblik', signoff: 'Mange hilsner fra Havblik',
  inbound_token: '7c1e9a40b2d35f68', auto_reply_positive: false, approval_threshold: 0.8,
  subscription_status: 'trialing', trial_ends_at: day(-12),
};
const PROPS = [
  { id: 'p1', org_id: ORG.id, name: 'Havblik Hotel', kind: 'hotel', address: 'Strandvejen 4', signoff: null, aliases: ['Hotel Havblik'] },
  { id: 'p2', org_id: ORG.id, name: 'Havblik Hytter', kind: 'vacation_rental', address: 'Klitvej 12', signoff: 'Mange hilsner fra Havblik Hytter', aliases: [] },
  { id: 'p3', org_id: ORG.id, name: 'Café Bølgen', kind: 'restaurant', address: 'Havnen 1', signoff: 'Kærlig hilsen fra Bølgen', aliases: [] },
];

const demoCompetitors = [
  { id: id(), org_id: ORG.id, property_id: 'p1', name: 'Strandhotellet', address: 'Strandvejen 30', google_place_id: 'x1',
    snapshots: [{ rating: 4.5, review_count: 1180, observed_at: day(60) }, { rating: 4.5, review_count: 1204, observed_at: day(30) }, { rating: 4.4, review_count: 1231, observed_at: day(1) }] },
  { id: id(), org_id: ORG.id, property_id: 'p1', name: 'Hotel Klitten', address: 'Klitvej 2', google_place_id: 'x2',
    snapshots: [{ rating: 4.0, review_count: 402, observed_at: day(60) }, { rating: 4.1, review_count: 415, observed_at: day(30) }, { rating: 4.2, review_count: 431, observed_at: day(1) }] },
  { id: id(), org_id: ORG.id, property_id: 'p1', name: 'Havnens Pension', address: 'Havnen 7', google_place_id: 'x3',
    snapshots: [{ rating: 4.7, review_count: 96, observed_at: day(60) }, { rating: 4.7, review_count: 101, observed_at: day(1) }] },
];

const R = (o) => ({
  id: id(), org_id: ORG.id, external_id: null, title: null, language: 'da', source: 'email', source_url: null,
  owner_reply: null, owner_reply_at: null, removal_hold: false, removal_note: null, note_count: 0,
  draft_id: null, draft_body: null, draft_status: null, draft_origin: null, profile_id: null,
  first_seen_at: o.published_at, ...o,
  property_name: PROPS.find((p) => p.id === o.property_id)?.name ?? null,
});

const reviews = [
  R({ property_id: 'p1', platform: 'booking', author: 'Lene', topics: [{ topic: 'udsigt', sentiment: 'positive' }, { topic: 'personale og service', sentiment: 'positive' }, { topic: 'støj', sentiment: 'negative' }, { topic: 'morgenmad', sentiment: 'negative' }], removal_check: { possible: false, rules: [], explanation: 'Kritikken handler om gæstens egen oplevelse og bryder ingen regler.', report_draft: null },  rating: 6, scale: 10, published_at: day(1), reply_status: 'awaiting_approval', needs_approval: true,
      title: 'Flot beliggenhed, men larm om natten', body: 'Positivt: Udsigten fra værelset var helt fantastisk, og personalet i receptionen var søde.\nNegativt: Der var larm fra køkkenet til langt ud på natten, og morgenmaden var lidt sparsom efter kl. 9.' }),
  R({ property_id: 'p1', platform: 'google', author: 'Martin K.', topics: [{ topic: 'udsigt', sentiment: 'positive' }, { topic: 'seng og søvn', sentiment: 'positive' }, { topic: 'morgenmad', sentiment: 'positive' }],  rating: 5, scale: 5, published_at: day(1), reply_status: 'unanswered', needs_approval: false, source: 'api',
      body: 'Skønt sted! Vi fik et værelse med havudsigt, sengene var gode, og morgenmaden med hjemmebagt brød var en fornøjelse. Kommer gerne igen.' }),
  R({ property_id: 'p2', platform: 'airbnb', author: 'Sophie', topics: [{ topic: 'rengøring', sentiment: 'positive' }, { topic: 'beliggenhed', sentiment: 'positive' }, { topic: 'personale og service', sentiment: 'positive' }],  rating: 5, scale: 5, published_at: day(2), reply_status: 'unanswered', needs_approval: false, language: 'de',
      body: 'Wunderschönes Häuschen direkt in den Dünen. Alles war sauber und gut ausgestattet, und der Gastgeber hat schnell geantwortet. Sehr empfehlenswert!' }),
  R({ property_id: 'p3', platform: 'tripadvisor', author: 'NordicFoodie', topics: [{ topic: 'restaurant og mad', sentiment: 'negative' }, { topic: 'personale og service', sentiment: 'negative' }, { topic: 'udsigt', sentiment: 'positive' }], removal_check: { possible: false, rules: [], explanation: 'En ærlig klage over ventetid og mad. Den bryder ingen regler, så den bør besvares.', report_draft: null },  rating: 2, scale: 5, published_at: day(3), reply_status: 'awaiting_approval', needs_approval: true, language: 'en',
      title: 'Disappointing dinner', body: 'We waited almost an hour for our main course, and the fish was cold when it arrived. The view is lovely but the service needs work.' }),
  R({ property_id: 'p1', platform: 'tripadvisor', author: 'Rejsende_Jens', topics: [{ topic: 'beliggenhed', sentiment: 'negative' }, { topic: 'faciliteter', sentiment: 'negative' }], removal_check: { possible: true, rules: ['wrong_place'], explanation: 'Anmelderen beskriver et hotel i Skagen ved en hovedgade. Havblik ligger ved stranden og har elevator.', report_draft: 'We kindly ask you to review this review. The reviewer describes a hotel in Skagen located on a main street without an elevator. Our property is located on the beach and has an elevator, so the review appears to concern a different property.' },  rating: 1, scale: 5, published_at: day(4), reply_status: 'awaiting_approval', needs_approval: true,
      removal_hold: true, removal_note: 'Anmelderen beskriver et hotel i Skagen. Indberettet til Tripadvisor 26. okt.',
      title: 'Elendigt', body: 'Værelset lå ud mod hovedgaden i Skagen og der var ingen elevator. Aldrig igen.' }),
  R({ property_id: 'p1', platform: 'expedia', author: 'Anna', topics: [{ topic: 'udsigt', sentiment: 'positive' }, { topic: 'rengøring', sentiment: 'positive' }, { topic: 'morgenmad', sentiment: 'positive' }],  rating: 9, scale: 10, published_at: day(5), reply_status: 'unanswered', needs_approval: false, language: 'sv',
      body: 'Mycket trevligt hotell med fin utsikt. Rent och lugnt rum, och frukosten var god.' }),
  R({ property_id: 'p1', platform: 'booking', author: 'Peter', rating: 8, scale: 10, published_at: day(6), reply_status: 'unanswered', needs_approval: true,
      body: 'Positivt: Dejlig seng og god kaffe.\nNegativt: Brusenichen var lidt slidt, og vandet blev hurtigt koldt.' }),
  R({ property_id: 'p3', platform: 'google', author: 'Camilla', rating: 5, scale: 5, published_at: day(8), reply_status: 'posted', needs_approval: false, source: 'api',
      body: 'Bedste fiskefrikadeller på kysten!', owner_reply: 'Tusind tak, Camilla. Opskriften er kokkens mormors, så det skal hun nok høre. Kærlig hilsen fra Bølgen', owner_reply_at: day(7) }),
  R({ property_id: 'p1', platform: 'booking', author: 'Gæst', rating: 7, scale: 10, published_at: day(9), reply_status: 'not_needed', needs_approval: true, body: null }),
  R({ property_id: 'p2', platform: 'vrbo', author: 'Thomas & Ida', rating: 4, scale: 5, published_at: day(12), reply_status: 'posted', needs_approval: false,
      body: 'Hyggelig hytte og fin beliggenhed. Wifi var lidt ustabilt.', owner_reply: 'Tak for jeres ophold og for tippet om wifi. Vi har sat en ny router op i hytterne. Mange hilsner fra Havblik Hytter', owner_reply_at: day(11) }),
  R({ property_id: null, property_hint: 'Havblik Strandhotel', platform: 'expedia', author: 'Jonas', rating: 8, scale: 10, published_at: day(1), reply_status: 'unanswered', needs_approval: false,
      title: 'Dejligt', body: null }),
];

const DRAFTS = {
  0: 'Kære Lene\n\nTak for de pæne ord om udsigten og om vores reception. Vi er kede af, at larmen fra køkkenet holdt dig vågen, og at morgenmaden var tyndet ud efter kl. 9. Begge dele har vi taget op med køkkenet, så næste gæst får en roligere nat og en fuld buffet.\n\nMange hilsner fra Havblik',
  1: 'Hej Martin\n\nTak for de gode ord. Det glæder os, at havudsigten og det hjemmebagte brød gjorde indtryk, og vi glæder os til at se jer igen.\n\nMange hilsner fra Havblik',
  2: 'Liebe Sophie,\n\nvielen Dank für die schöne Bewertung. Es freut uns sehr, dass Ihnen das Häuschen in den Dünen gefallen hat. Wir würden uns freuen, Sie wieder bei uns begrüßen zu dürfen.\n\nViele Grüße von Havblik Hytter',
  3: 'Dear NordicFoodie,\n\nThank you for taking the time to write. An hour\'s wait and a cold main course is not the evening we want to give anyone, and we have shared your experience with the kitchen team. We are glad the view made up for a little of it.\n\nWarm regards from Bølgen',
  5: 'Hej Anna,\n\nTack för fina ord om utsikten, rummet och frukosten. Välkommen tillbaka till Havblik.\n\nMånga hälsningar från Havblik',
  6: 'Kære Peter\n\nTak for anmeldelsen og for at fremhæve sengen og kaffen. Du har ret i, at brusenichen trænger, og den er på listen til vinterens istandsættelse sammen med varmtvandet.\n\nMange hilsner fra Havblik',
};

const drafts = [];
reviews.forEach((r, i) => {
  if (DRAFTS[i]) {
    const d = { id: id(), org_id: ORG.id, review_id: r.id, body: DRAFTS[i], origin: 'ai', status: 'suggested', created_at: day(0) };
    drafts.push(d);
  }
});
const notes = [{ id: id(), org_id: ORG.id, review_id: reviews[0].id, body: 'Køkkenet lukker nu kl. 22. Aftalt med kokken 27/10.', created_at: day(0), author_id: 'u-leder' }];
const tone = [
  { id: id(), org_id: ORG.id, body: 'Tak for de pæne ord om udsigten, Karen. Vi lover at hilse kokken fra jer.\n\nMange hilsner fra Havblik', source: 'imported', created_at: day(30) },
  { id: id(), org_id: ORG.id, body: 'Hej Ole. Tak for din ærlige anmeldelse. Du har ret i, at parkeringen er trang i højsæsonen, og vi har nu aftalt ekstra pladser med naboen.\n\nMange hilsner fra Havblik', source: 'imported', created_at: day(40) },
];
const A = (o) => ({ id: id(), cancel_at_period_end: false, current_period_end: null, pilot_pricing: false, has_subscription: false, reviews_30d: 0, last_review_at: null, ...o });
const demoAdminOrgs = [
  A({ name: 'Hotel Havblik', owner_email: 'dig@hotelhavblik.dk', created_at: day(2), status: 'trialing', trial_ends_at: day(-12), places: 3, members: 3, reviews: 10, reviews_30d: 10, last_review_at: day(1) }),
  A({ name: 'Klitgården', owner_email: 'ejer@klitgaarden.dk', created_at: day(40), status: 'active', trial_ends_at: day(26), current_period_end: day(-20), has_subscription: true, pilot_pricing: true, places: 1, members: 4, reviews: 212, reviews_30d: 31, last_review_at: day(0) }),
  A({ name: 'Fjordhostel', owner_email: 'mail@fjordhostel.dk', created_at: day(16), status: 'trialing', trial_ends_at: day(2), places: 2, members: 1, reviews: 0 }),
];
const snapshots = [];
[['p1', 'google', [4.3, 4.3, 4.4, 4.4, 4.5], 5, 212], ['p1', 'booking', [8.1, 8.2, 8.2, 8.0, 8.3], 10, 640], ['p1', 'tripadvisor', [4.0, 4.0, 4.1, 4.1, 4.1], 5, 188],
 ['p2', 'airbnb', [4.82, 4.85, 4.86, 4.88, 4.9], 5, 74], ['p3', 'google', [4.6, 4.6, 4.5, 4.6, 4.7], 5, 96]].forEach(([p, pl, vals, scale, count]) => {
  vals.forEach((v, i) => snapshots.push({ id: id(), org_id: ORG.id, property_id: p, platform: pl, rating: v, scale, review_count: count - (4 - i) * 3, observed_at: day((4 - i) * 30) }));
});

let role = 'owner';
const members = [
  { user_id: 'u-demo', role: 'owner', display_name: 'dig@hotelhavblik.dk' },
  { user_id: 'u-leder', role: 'manager', display_name: 'hotelchef@hotelhavblik.dk' },
  { user_id: 'u-rec', role: 'staff', display_name: 'reception@hotelhavblik.dk' },
];
const invitations = [];
const connections = [];
const wait = (v, ms = 120) => new Promise((r) => setTimeout(() => r(structuredClone(v)), ms));

function withDraft(r) {
  const d = drafts.filter((x) => x.review_id === r.id && ['suggested', 'approved'].includes(x.status))
    .sort((a, b) => (b.status === 'approved') - (a.status === 'approved') || b.created_at.localeCompare(a.created_at))[0];
  return { ...r, note_count: notes.filter((n) => n.review_id === r.id).length, draft_id: d?.id ?? null, draft_body: d?.body ?? null, draft_status: d?.status ?? null, draft_origin: d?.origin ?? null };
}
const isLeader = () => role === 'owner' || role === 'manager';

export const demo = {
  switchRole(r) { role = r; members[0].role = r; },
  role: () => role,
  async session() { return { user: { id: 'u-demo', email: 'dig@hotelhavblik.dk' } }; },
  async onAuth() {},
  async signIn() {},
  async signOut() {},
  async memberships() { return wait({ user: { id: 'u-demo', email: 'dig@hotelhavblik.dk' }, list: [{ role, org: ORG }] }); },
  async createOrg() { return wait(ORG); },
  async updateOrg(_id, patch) { Object.assign(ORG, patch); return wait(null); },
  async access() { return wait({ state: 'trial', days_left: 12 }); },
  async properties() { return wait(PROPS.filter((p) => !p.archived_at)); },
  async addProperty(_o, p) { const n = { id: id(), org_id: ORG.id, aliases: [], ...p }; PROPS.push(n); return wait(n); },
  async updateProperty(pid, patch) { Object.assign(PROPS.find((p) => p.id === pid), patch); return wait(null); },
  async profiles() { return wait([]); },
  async queue() { return wait(reviews.map(withDraft)); },
  async review(rid) {
    const r = reviews.find((x) => x.id === rid);
    if (!r) throw new Error('Anmeldelsen findes ikke');
    return wait({ review: withDraft(r), notes: notes.filter((n) => n.review_id === rid), drafts: drafts.filter((d) => d.review_id === rid) });
  },
  async newDraft(rid) {
    const r = reviews.find((x) => x.id === rid);
    if (r.removal_hold) throw new Error('Vi prøver at få anmeldelsen fjernet. Svar ikke endnu.');
    const greet = r.language === 'de' ? `Liebe(r) ${r.author},` : r.language === 'en' ? `Dear ${r.author},` : r.language === 'sv' ? `Hej ${r.author},` : `Kære ${r.author}`;
    const d = { id: id(), org_id: ORG.id, review_id: rid, body: `${greet}\n\n(I prøveversionen skriver AI'en ikke et nyt forslag. I den rigtige version kommer et nyt svar i jeres tone her.)\n\n${PROPS.find((p) => p.id === r.property_id)?.signoff ?? ORG.signoff}`, origin: 'ai', status: 'suggested', created_at: new Date().toISOString() };
    drafts.push(d);
    return wait(d, 900);
  },
  // Administration vises kun i demoen med ?demo&admin, med opdigtede kunder
  async isAdmin() { return new URLSearchParams(location.search).has('admin'); },
  async adminOrgs() { return wait(demoAdminOrgs); },
  async adminExtendTrial(oid, days) { const o = demoAdminOrgs.find((x) => x.id === oid); o.trial_ends_at = new Date(Math.max(Date.parse(o.trial_ends_at), Date.now()) + days * 86400000).toISOString(); return wait(o.trial_ends_at); },
  async adminSetPilot(oid, on) { if (on && demoAdminOrgs.filter((x) => x.pilot_pricing && x.id !== oid).length >= 10) throw new Error('Der er allerede 10 pilothoteller'); demoAdminOrgs.find((x) => x.id === oid).pilot_pricing = on; return wait(on); },
  async reviewStats() { return wait(reviews.map((r) => ({ ...r }))); },
  async ask(_o, question) {
    const crit = reviews.filter((r) => r.topics?.some((t) => t.sentiment === 'negative'));
    return wait({
      answer: `I prøveversionen svarer Ekkoly med et eksempel. Spørgsmålet var: "${question}"\nI den rigtige version læser Ekkoly alle jeres anmeldelser og svarer konkret, fx at støj fra køkkenet og morgenmaden efter kl. 9 går igen i kritikken på Havblik Hotel.`,
      examples: crit.slice(0, 2).map((r) => ({ review_id: r.id, quote: (r.body ?? '').split(/[.!]/)[0].replace(/^Positivt: |^Negativt: /, '').slice(0, 120) })),
      enough_data: true, count: reviews.length,
    }, 1200);
  },
  async addReview(_o, r) {
    if (reviews.some((x) => x.dedupe_key === r.dedupe_key)) throw new Error('Den anmeldelse er allerede sat ind.');
    const needs = r.rating == null || r.rating / r.scale < ORG.approval_threshold;
    const n = R({ ...r, source: 'manual', language: null, published_at: new Date().toISOString(), reply_status: needs ? 'awaiting_approval' : 'unanswered', needs_approval: needs });
    reviews.unshift(n);
    return wait({ id: n.id });
  },
  async ownDraft(_o, rid, body) { const d = { id: id(), org_id: ORG.id, review_id: rid, body, origin: 'staff', status: 'suggested', created_at: new Date().toISOString() }; drafts.push(d); return wait(d); },
  async approve(did, body) {
    const d = drafts.find((x) => x.id === did); const r = reviews.find((x) => x.id === d.review_id);
    if (r.removal_hold) throw new Error('Vi prøver at få anmeldelsen fjernet. Svar ikke endnu.');
    if (r.needs_approval && !isLeader()) throw new Error('En leder skal godkende svaret, fordi anmeldelsen indeholder kritik');
    if (body) d.body = body;
    d.status = 'approved';
    drafts.filter((x) => x.review_id === r.id && x.id !== did && x.status === 'suggested').forEach((x) => { x.status = 'rejected'; });
    r.reply_status = 'approved';
    tone.unshift({ id: id(), org_id: ORG.id, body: d.body, source: 'approved_reply', created_at: new Date().toISOString() });
    return wait(d);
  },
  async markPosted(rid, body) {
    const r = reviews.find((x) => x.id === rid);
    if (r.removal_hold) throw new Error('Vi prøver at få anmeldelsen fjernet. Svar ikke endnu.');
    if (r.needs_approval && r.reply_status !== 'approved' && !isLeader()) throw new Error('En leder skal godkende svaret først');
    const d = drafts.find((x) => x.review_id === rid && x.status === 'approved');
    if (d) d.status = 'posted';
    r.reply_status = 'posted'; r.owner_reply = body || d?.body || r.owner_reply; r.owner_reply_at = new Date().toISOString();
    return wait(r);
  },
  async postToPlatform(rid) { return this.markPosted(rid); },
  async setHold(rid, hold, note) {
    if (!isLeader()) throw new Error('Kun ledere kan ændre dette');
    Object.assign(reviews.find((x) => x.id === rid), { removal_hold: hold, removal_note: note || null }); return wait(null);
  },
  async addNote(_o, rid, body) { const n = { id: id(), org_id: ORG.id, review_id: rid, body, created_at: new Date().toISOString(), author_id: 'u-demo' }; notes.push(n); return wait(n); },
  async members() { return wait(members); },
  async invitations() { return wait(invitations); },
  async invite(_o, email, r) { const inv = { id: id(), email, role: r, token: id().replace(/-/g, ''), created_at: new Date().toISOString() }; invitations.unshift(inv); return wait(inv); },
  async acceptInvite() { return wait(ORG.id); },
  async setRole(_o, uid, r) { members.find((m) => m.user_id === uid).role = r; return wait(null); },
  async removeMember(_o, uid) { members.splice(members.findIndex((m) => m.user_id === uid), 1); return wait(null); },
  async tone() { return wait(tone); },
  async addTone(_o, body) { const t = { id: id(), org_id: ORG.id, body, source: 'manual', created_at: new Date().toISOString() }; tone.unshift(t); return wait(t); },
  async deleteTone(tid) { tone.splice(tone.findIndex((t) => t.id === tid), 1); return wait(null); },
  async connections() { return wait(connections); },
  async connectGoogle() {
    connections.splice(0, connections.length, { id: id(), org_id: ORG.id, provider: 'google', status: 'connected', account_label: '2 lokationer',
      available_locations: [{ name: 'accounts/1/locations/11', title: 'Havblik Hotel', address: 'Strandvejen 4' }, { name: 'accounts/1/locations/12', title: 'Café Bølgen', address: 'Havnen 1' }], last_synced_at: null });
    return null;
  },
  async finishGoogle() { return wait({ ok: true }); },
  async linkGoogle() { return wait(null); },
  async syncGoogle() { if (connections[0]) connections[0].last_synced_at = new Date().toISOString(); return wait({ ok: true }, 800); },
  async recheckReview() { return wait({ ok: true }, 800); },
  async competitors() { return wait(demoCompetitors); },
  async searchCompetitors(_o, q) {
    return wait([
      { place_id: 'demo-a', name: `${q} Badehotel`, address: 'Strandvejen 20', rating: 4.4, review_count: 812 },
      { place_id: 'demo-b', name: `${q} Kro`, address: 'Hovedgaden 3', rating: 4.1, review_count: 233 },
    ], 500);
  },
  async addCompetitor(_o, propertyId, placeId) {
    if (demoCompetitors.filter((c) => c.property_id === propertyId).length >= 5) throw new Error('I kan højst følge 5 konkurrenter pr. sted.');
    demoCompetitors.push({ id: id(), org_id: ORG.id, property_id: propertyId, name: placeId === 'demo-a' ? 'Nyt Badehotel' : 'Ny Kro', address: 'Strandvejen 20', google_place_id: placeId,
      snapshots: [{ rating: 4.3, review_count: 500, observed_at: new Date().toISOString() }] });
    return wait({ ok: true });
  },
  async removeCompetitor(cid) { const i = demoCompetitors.findIndex((c) => c.id === cid); if (i >= 0) demoCompetitors.splice(i, 1); return wait(null); },
  async billing() { return wait({ status: 'trialing', trial_ends_at: day(-12), current_period_end: null, cancel_at_period_end: false, places: PROPS.filter((p) => !p.archived_at).length, has_customer: false, pilot_pricing: false }); },
  async startCheckout() { throw new Error('I prøveversionen kan man ikke betale. Opret jeres egen konto for at fortsætte.'); },
  async openPortal() { throw new Error('Findes ikke i prøveversionen.'); },
  async syncPlaces() { return wait({ ok: true }); },
  async snapshots() { return wait(snapshots); },
  async forwardingConfirmations() { return wait([{ code: '634197258', confirm_url: 'https://mail-settings.google.com/mail/vf-demo', account: 'reception@havblik.dk', received_at: new Date(Date.now() - 4 * 60e3).toISOString() }]); },
  async platformStatus() { return wait([{ platform: 'booking', received_at: day(1) }, { platform: 'expedia', received_at: day(1) }, { platform: 'airbnb', received_at: day(2) }, { platform: 'vrbo', received_at: day(12) }]); },
  async setReviewProperty(rid, pid, remember) {
    const r = reviews.find((x) => x.id === rid);
    const prop = PROPS.find((x) => x.id === pid);
    if (remember && r.property_hint && !prop.aliases?.includes(r.property_hint)) prop.aliases = [...(prop.aliases ?? []), r.property_hint];
    Object.assign(r, { property_id: pid, property_name: prop.name, property_hint: null });
    return wait(null);
  },
  async inbound() {
    return wait([
      { id: id(), from_address: 'Booking.com <noreply@booking.com>', subject: 'Du har modtaget en ny gæsteanmeldelse', received_at: day(1), status: 'parsed', platform: 'booking' },
      { id: id(), from_address: 'Booking.com <noreply@booking.com>', subject: 'Bekræftelse på reservation 4433', received_at: day(1), status: 'ignored', platform: 'booking' },
    ]);
  },
};
