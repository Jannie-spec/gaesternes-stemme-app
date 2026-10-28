// Al kontakt med Supabase samlet ét sted. demo.js har præcis de samme funktioner
// med eksempeldata, så appen kan prøves, før Supabase er sat op.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

let sb = null;
async function client() {
  if (sb) return sb;
  const { createClient } = await import('../vendor/supabase-js-2.117.3.mjs');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  return sb;
}

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function fn(name, body) {
  const c = await client();
  const { data, error } = await c.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    try { message = (await error.context.json()).error || message; } catch { /* behold standardbeskeden */ }
    throw new Error(message);
  }
  return data;
}

export const configured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const api = {
  async session() { const c = await client(); return (await c.auth.getSession()).data.session; },
  async onAuth(cb) { const c = await client(); c.auth.onAuthStateChange((_e, s) => cb(s)); },
  async signIn(email) {
    const c = await client();
    must(await c.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }));
  },
  async signOut() { const c = await client(); await c.auth.signOut(); },

  async memberships() {
    const c = await client();
    const { data: { user } } = await c.auth.getUser();
    const rows = must(await c.from('memberships').select('role, organizations(*)').eq('user_id', user.id));
    return { user: { id: user.id, email: user.email }, list: rows.map((r) => ({ role: r.role, org: r.organizations })) };
  },
  async createOrg(name, signoff) { const c = await client(); return must(await c.rpc('create_organization', { p_name: name, p_signoff: signoff })); },
  async updateOrg(id, patch) { const c = await client(); must(await c.from('organizations').update(patch).eq('id', id)); },
  async access(orgId) { const c = await client(); return must(await c.rpc('org_access', { p_org: orgId }))?.[0] ?? null; },

  async properties(orgId) { const c = await client(); return must(await c.from('properties').select('*').eq('org_id', orgId).is('archived_at', null).order('created_at')); },
  async addProperty(orgId, p) { const c = await client(); return must(await c.from('properties').insert({ org_id: orgId, ...p }).select().single()); },
  async updateProperty(id, patch) { const c = await client(); must(await c.from('properties').update(patch).eq('id', id)); },
  async profiles(orgId) { const c = await client(); return must(await c.from('platform_profiles').select('*').eq('org_id', orgId)); },

  async queue(orgId) {
    const c = await client();
    return must(await c.from('review_queue').select('*').eq('org_id', orgId)
      .order('published_at', { ascending: false, nullsFirst: false }).order('first_seen_at', { ascending: false }).limit(500));
  },
  async review(id) {
    const c = await client();
    const [review, notes, drafts] = await Promise.all([
      c.from('review_queue').select('*').eq('id', id).single().then(must),
      c.from('review_notes').select('id, body, created_at, author_id').eq('review_id', id).order('created_at').then(must),
      c.from('reply_drafts').select('*').eq('review_id', id).order('created_at', { ascending: false }).then(must),
    ]);
    return { review, notes, drafts };
  },
  async addReview(orgId, r) {
    const c = await client();
    const { data, error } = await c.from('reviews').insert({ org_id: orgId, source: 'manual', ...r }).select('id').single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Den anmeldelse er allerede sat ind.' : error.message);
    return data;
  },
  newDraft: (reviewId) => fn('draft-reply', { review_id: reviewId }),
  async ownDraft(orgId, reviewId, body) {
    const c = await client();
    const { data: { user } } = await c.auth.getUser();
    return must(await c.from('reply_drafts').insert({ org_id: orgId, review_id: reviewId, body, origin: 'staff', created_by: user.id }).select().single());
  },
  async approve(draftId, body) { const c = await client(); return must(await c.rpc('approve_reply', { p_draft: draftId, p_body: body })); },
  async markPosted(reviewId, body) { const c = await client(); return must(await c.rpc('mark_reply_posted', { p_review: reviewId, p_body: body })); },
  postToPlatform: (reviewId) => fn('post-reply', { review_id: reviewId }),
  recheckReview: (reviewId) => fn('analyze', { action: 'one', review_id: reviewId }),
  async setHold(reviewId, hold, note) { const c = await client(); return must(await c.rpc('set_removal_hold', { p_review: reviewId, p_hold: hold, p_note: note })); },
  async addNote(orgId, reviewId, body) {
    const c = await client();
    const { data: { user } } = await c.auth.getUser();
    return must(await c.from('review_notes').insert({ org_id: orgId, review_id: reviewId, body, author_id: user.id }).select().single());
  },

  async members(orgId) { const c = await client(); return must(await c.from('memberships').select('user_id, role, display_name').eq('org_id', orgId)); },
  async invitations(orgId) { const c = await client(); return must(await c.from('invitations').select('*').eq('org_id', orgId).is('accepted_at', null).order('created_at', { ascending: false })); },
  async invite(orgId, email, role) { const c = await client(); return must(await c.from('invitations').insert({ org_id: orgId, email, role }).select().single()); },
  async acceptInvite(token) { const c = await client(); return must(await c.rpc('accept_invitation', { p_token: token })); },
  async setRole(orgId, userId, role) { const c = await client(); must(await c.from('memberships').update({ role }).eq('org_id', orgId).eq('user_id', userId)); },
  async removeMember(orgId, userId) { const c = await client(); must(await c.from('memberships').delete().eq('org_id', orgId).eq('user_id', userId)); },

  async tone(orgId) { const c = await client(); return must(await c.from('tone_examples').select('*').eq('org_id', orgId).order('created_at', { ascending: false })); },
  async addTone(orgId, body) { const c = await client(); return must(await c.from('tone_examples').insert({ org_id: orgId, body, source: 'manual' }).select().single()); },
  async deleteTone(id) { const c = await client(); must(await c.from('tone_examples').delete().eq('id', id)); },

  async connections(orgId) { const c = await client(); return must(await c.from('connections').select('*').eq('org_id', orgId)); },
  async connectGoogle(orgId) { return (await fn('google-oauth', { action: 'start', org_id: orgId })).url; },
  finishGoogle: (code, oauthState) => fn('google-oauth', { action: 'finish', code, state: oauthState }),
  async linkGoogle(propertyId, location, title) { const c = await client(); return must(await c.rpc('link_google_location', { p_property: propertyId, p_location: location, p_title: title })); },
  syncGoogle: (orgId) => fn('google-sync', { org_id: orgId }),

  async competitors(orgId) {
    const c = await client();
    const [list, snaps] = await Promise.all([
      c.from('competitors').select('*').eq('org_id', orgId).order('created_at').then(must),
      c.from('competitor_snapshots').select('competitor_id, rating, review_count, observed_at').eq('org_id', orgId).order('observed_at').then(must),
    ]);
    return list.map((x) => ({ ...x, snapshots: snaps.filter((s) => s.competitor_id === x.id) }));
  },
  async searchCompetitors(orgId, query) { return (await fn('competitors', { action: 'search', org_id: orgId, query })).results; },
  addCompetitor: (orgId, propertyId, placeId) => fn('competitors', { action: 'add', org_id: orgId, property_id: propertyId, place_id: placeId }),
  async removeCompetitor(id) { const c = await client(); must(await c.from('competitors').delete().eq('id', id)); },
  async billing(orgId) { const c = await client(); return must(await c.rpc('org_billing', { p_org: orgId }))?.[0] ?? null; },
  async startCheckout(orgId) { return (await fn('billing', { org_id: orgId, action: 'checkout' })).url; },
  async openPortal(orgId) { return (await fn('billing', { org_id: orgId, action: 'portal' })).url; },
  syncPlaces: (orgId) => fn('billing', { org_id: orgId, action: 'sync' }),

  async isAdmin() { const c = await client(); return Boolean(must(await c.rpc('is_platform_admin'))); },
  async adminOrgs() { const c = await client(); return must(await c.rpc('admin_orgs')); },
  async adminExtendTrial(orgId, days) { const c = await client(); return must(await c.rpc('admin_extend_trial', { p_org: orgId, p_days: days })); },
  async adminSetPilot(orgId, on) { const c = await client(); return must(await c.rpc('admin_set_pilot', { p_org: orgId, p_on: on })); },

  async snapshots(orgId) { const c = await client(); return must(await c.from('score_snapshots').select('*').eq('org_id', orgId).order('observed_at')); },
  async inbound(orgId) { const c = await client(); return must(await c.from('inbound_emails').select('id, from_address, subject, received_at, status, platform, error').eq('org_id', orgId).order('received_at', { ascending: false }).limit(10)); },
};
