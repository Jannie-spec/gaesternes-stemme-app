// Fælles tilstand for appen.
export const state = {
  api: null,          // api.js eller demo.js
  demo: false,
  user: null,
  org: null,
  role: null,         // owner | manager | staff
  access: null,       // { state, days_left }
  properties: [],
  profiles: [],
  queue: [],
  place: 'all',       // valgt sted i indbakken
};

export const isLeader = () => state.role === 'owner' || state.role === 'manager';

export async function loadOrgData() {
  const [properties, profiles, queue, access] = await Promise.all([
    state.api.properties(state.org.id),
    state.api.profiles(state.org.id),
    state.api.queue(state.org.id),
    state.api.access(state.org.id),
  ]);
  Object.assign(state, { properties, profiles, queue, access });
}

export async function reloadQueue() {
  state.queue = await state.api.queue(state.org.id);
}

/** Inddeler anmeldelserne i det, medarbejderen skal gøre. */
export function groups(queue = state.queue) {
  const inPlace = queue.filter((r) => state.place === 'all' || r.property_id === state.place);
  const open = inPlace.filter((r) => ['unanswered', 'awaiting_approval', 'approved'].includes(r.reply_status));
  const hold = open.filter((r) => r.removal_hold);
  const rest = open.filter((r) => !r.removal_hold);
  const waiting = rest.filter((r) => r.needs_approval && r.reply_status !== 'approved');
  const now = rest.filter((r) => !waiting.includes(r));
  const done = inPlace.filter((r) => ['posted', 'not_needed'].includes(r.reply_status));
  return { now, waiting, hold, done };
}
