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

const R = (o) => ({
  id: id(), org_id: ORG.id, external_id: null, title: null, language: 'da', source: 'email', source_url: null,
  owner_reply: null, owner_reply_at: null, removal_hold: false, removal_note: null, note_count: 0,
  draft_id: null, draft_body: null, draft_status: null, draft_origin: null, profile_id: null,
  first_seen_at: o.published_at, ...o,
  property_name: PROPS.find((p) => p.id === o.property_id)?.name ?? null,
});

const reviews = [
  R({ property_id: 'p1', platform: 'booking', author: 'Lene', rating: 6, scale: 10, published_at: day(1), reply_status: 'awaiting_approval', needs_approval: true,
      title: 'Flot beliggenhed, men larm om natten', body: 'Positivt: Udsigten fra værelset var helt fantastisk, og personalet i receptionen var søde.\nNegativt: Der var larm fra køkkenet til langt ud på natten, og morgenmaden var lidt sparsom efter kl. 9.' }),
  R({ property_id: 'p1', platform: 'google', author: 'Martin K.', rating: 5, scale: 5, published_at: day(1), reply_status: 'unanswered', needs_approval: false, source: 'api',
      body: 'Skønt sted! Vi fik et værelse med havudsigt, sengene var gode, og morgenmaden med hjemmebagt brød var en fornøjelse. Kommer gerne igen.' }),
  R({ property_id: 'p2', platform: 'airbnb', author: 'Sophie', rating: 5, scale: 5, published_at: day(2), reply_status: 'unanswered', needs_approval: false, language: 'de',
      body: 'Wunderschönes Häuschen direkt in den Dünen. Alles war sauber und gut ausgestattet, und der Gastgeber hat schnell geantwortet. Sehr empfehlenswert!' }),
  R({ property_id: 'p3', platform: 'tripadvisor', author: 'NordicFoodie', rating: 2, scale: 5, published_at: day(3), reply_status: 'awaiting_approval', needs_approval: true, language: 'en',
      title: 'Disappointing dinner', body: 'We waited almost an hour for our main course, and the fish was cold when it arrived. The view is lovely but the service needs work.' }),
  R({ property_id: 'p1', platform: 'tripadvisor', author: 'Rejsende_Jens', rating: 1, scale: 5, published_at: day(4), reply_status: 'awaiting_approval', needs_approval: true,
      removal_hold: true, removal_note: 'Anmelderen beskriver et hotel i Skagen. Indberettet til Tripadvisor 26. okt.',
      title: 'Elendigt', body: 'Værelset lå ud mod hovedgaden i Skagen og der var ingen elevator. Aldrig igen.' }),
  R({ property_id: 'p1', platform: 'expedia', author: 'Anna', rating: 9, scale: 10, published_at: day(5), reply_status: 'unanswered', needs_approval: false, language: 'sv',
      body: 'Mycket trevligt hotell med fin utsikt. Rent och lugnt rum, och frukosten var god.' }),
  R({ property_id: 'p1', platform: 'booking', author: 'Peter', rating: 8, scale: 10, published_at: day(6), reply_status: 'unanswered', needs_approval: true,
      body: 'Positivt: Dejlig seng og god kaffe.\nNegativt: Brusenichen var lidt slidt, og vandet blev hurtigt koldt.' }),
  R({ property_id: 'p3', platform: 'google', author: 'Camilla', rating: 5, scale: 5, published_at: day(8), reply_status: 'posted', needs_approval: false, source: 'api',
      body: 'Bedste fiskefrikadeller på kysten!', owner_reply: 'Tusind tak, Camilla. Opskriften er kokkens mormors, så det skal hun nok høre. Kærlig hilsen fra Bølgen', owner_reply_at: day(7) }),
  R({ property_id: 'p1', platform: 'booking', author: 'Gæst', rating: 7, scale: 10, published_at: day(9), reply_status: 'not_needed', needs_approval: true, body: null }),
  R({ property_id: 'p2', platform: 'vrbo', author: 'Thomas & Ida', rating: 4, scale: 5, published_at: day(12), reply_status: 'posted', needs_approval: false,
      body: 'Hyggelig hytte og fin beliggenhed. Wifi var lidt ustabilt.', owner_reply: 'Tak for jeres ophold og for tippet om wifi. Vi har sat en ny router op i hytterne. Mange hilsner fra Havblik Hytter', owner_reply_at: day(11) }),
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
  async properties() { return wait(PROPS); },
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
  async snapshots() { return wait(snapshots); },
  async inbound() {
    return wait([
      { id: id(), from_address: 'Booking.com <noreply@booking.com>', subject: 'Du har modtaget en ny gæsteanmeldelse', received_at: day(1), status: 'parsed', platform: 'booking' },
      { id: id(), from_address: 'Booking.com <noreply@booking.com>', subject: 'Bekræftelse på reservation 4433', received_at: day(1), status: 'ignored', platform: 'booking' },
    ]);
  },
};
