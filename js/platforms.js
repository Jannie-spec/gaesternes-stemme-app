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

/** Hvor medarbejderen svarer på denne anmeldelse. */
export function replyUrl(review, profile) {
  return profile?.reply_url || PLATFORMS[review.platform]?.reply || review.source_url || '';
}

// Sådan sætter man videresendelse op, vist under Indstillinger. Menuerne på platformene
// ændrer sig, så vejledningen beskriver, hvad man leder efter, frem for præcise klik.
export const FORWARD_GUIDE = [
  ['Booking.com, Expedia, Agoda', 'I platformens partnerportal: find indstillingen for, hvem der får mails om gæsteanmeldelser, og tilføj jeres adresse herfra som ekstra modtager.'],
  ['Airbnb, Vrbo, Tripadvisor, Hostelworld', 'Mails om nye anmeldelser går til den mail, kontoen er oprettet med. Lav en regel i mailprogrammet, der automatisk videresender dem til adressen herfra.'],
  ['Kan I ikke finde det?', 'Videresend én anmeldelses-mail i hånden. Den dukker op her inden for et minut, og så ved I, at adressen virker.'],
];
