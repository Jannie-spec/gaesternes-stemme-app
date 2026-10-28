// Platformene: navn, skala og hvor ejeren svarer.
export const PLATFORMS = {
  google:       { name: 'Google',       scale: 5,  reply: 'https://business.google.com/reviews', api: true },
  facebook:     { name: 'Facebook',     scale: 5,  reply: 'https://business.facebook.com/' },
  trustpilot:   { name: 'Trustpilot',   scale: 5,  reply: 'https://business.trustpilot.com/reviews' },
  holidaycheck: { name: 'HolidayCheck', scale: 6,  reply: 'https://www.holidaycheck.de/' },
  booking:      { name: 'Booking.com',  scale: 10, reply: 'https://admin.booking.com/' },
  expedia:      { name: 'Expedia',      scale: 10, reply: 'https://apps.expediapartnercentral.com/' },
  vrbo:         { name: 'Vrbo',         scale: 5,  reply: 'https://www.vrbo.com/supply/reviews/post-stay-reviews' },
  airbnb:       { name: 'Airbnb',       scale: 5,  reply: 'https://www.airbnb.com/users/reviews' },
  tripadvisor:  { name: 'Tripadvisor',  scale: 5,  reply: 'https://www.tripadvisor.com/Owners' },
  hostelworld:  { name: 'Hostelworld',  scale: 10, reply: 'https://inbox.hostelworld.com/' },
  agoda:        { name: 'Agoda',        scale: 10, reply: 'https://ycs.agoda.com/' },
  tripcom:      { name: 'Trip.com',     scale: 5,  reply: 'https://ebooking.trip.com/' },
  thefork:      { name: 'TheFork',      scale: 10, reply: 'https://manager.thefork.com/' },
  other:        { name: 'Anden platform', scale: 5, reply: '' },
};

export const platformName = (p) => PLATFORMS[p]?.name ?? p;

// Domæner, som et link fra en anmeldelses-mail skal høre til, før vi åbner det.
// Så kan en falsk mail ikke sende medarbejderen videre til en anden side.
const DOMAINS = {
  google: ['google.com', 'google.dk'], facebook: ['facebook.com'], trustpilot: ['trustpilot.com'], holidaycheck: ['holidaycheck.de', 'holidaycheck.com'],
  booking: ['booking.com'], expedia: ['expediapartnercentral.com', 'expedia.com'], vrbo: ['vrbo.com'], airbnb: ['airbnb.com', 'airbnb.dk'],
  tripadvisor: ['tripadvisor.com', 'tripadvisor.dk'], hostelworld: ['hostelworld.com'], agoda: ['agoda.com'], tripcom: ['trip.com'], thefork: ['thefork.com'],
};

/** Er linket et https-link til platformens egen side? */
export function trustedPlatformUrl(platform, url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return (DOMAINS[platform] ?? []).some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch { return false; }
}

/** Hvor medarbejderen svarer på denne anmeldelse. Linket fra platformens egen mail går direkte
 *  til anmeldelsen og bruges først, hvis det peger på platformen selv. */
export function replyUrl(review, profile) {
  if (review.source_url && trustedPlatformUrl(review.platform, review.source_url)) return review.source_url;
  return profile?.reply_url || PLATFORMS[review.platform]?.reply || '';
}

// Sådan sætter man videresendelse op, vist under Indstillinger. Menuerne på platformene
// ændrer sig, så vejledningen beskriver, hvad man leder efter, frem for præcise klik.
export const FORWARD_GUIDE = [
  ['Booking.com, Expedia, Agoda', 'I platformens partnerportal: find indstillingen for, hvem der får mails om gæsteanmeldelser, og tilføj jeres adresse herfra som ekstra modtager.'],
  ['Airbnb, Vrbo, Tripadvisor, Hostelworld', 'Mails om nye anmeldelser går til den mail, kontoen er oprettet med. Lav en regel i mailprogrammet, der automatisk videresender dem til adressen herfra.'],
  ['Kan I ikke finde det?', 'Videresend én anmeldelses-mail i hånden. Når den dukker op under Seneste mails, ved I, at adressen virker.'],
];
