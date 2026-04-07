/**
 * Ticketmaster Ingestion Worker
 * API docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 *
 * Fetches events in the Chicago metro area and upserts them into the DB.
 * Runs every 6 hours via node-cron.
 */

const { upsertEvents } = require('./upsert');

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const API_KEY = process.env.TICKETMASTER_API_KEY;

const SEGMENT_MAP = {
  'Music': 'Music',
  'Sports': 'Sightseeing',
  'Arts & Theatre': 'Arts',
  'Film': 'Arts',
  'Miscellaneous': 'Sightseeing',
  'Family': 'Family-Friendly',
  'Comedy': 'Nightlife',
};

const GENRE_MAP = {
  'Classical': 'Music',
  'Jazz': 'Music',
  'Blues': 'Music',
  'Pop': 'Music',
  'Rock': 'Music',
  'Hip-Hop/Rap': 'Music',
  'Electronic': 'Nightlife',
  'Dance/Electronic': 'Nightlife',
  'Comedy': 'Nightlife',
  'Theatre': 'Arts',
  'Musical': 'Arts',
  'Opera': 'Arts',
  'Dance': 'Arts',
  'Family': 'Family-Friendly',
  'Food & Drink': 'Food',
};

function mapCategories(event) {
  const segment = event.classifications?.[0]?.segment?.name;
  const genre = event.classifications?.[0]?.genre?.name;
  const subGenre = event.classifications?.[0]?.subGenre?.name;

  const cats = new Set();
  if (GENRE_MAP[genre]) cats.add(GENRE_MAP[genre]);
  if (GENRE_MAP[subGenre]) cats.add(GENRE_MAP[subGenre]);
  if (cats.size === 0 && SEGMENT_MAP[segment]) cats.add(SEGMENT_MAP[segment]);
  if (cats.size === 0) cats.add('Sightseeing');
  return [...cats];
}

function normalizeEvent(tm) {
  const venue = tm._embedded?.venues?.[0];
  if (!venue) return null;

  const lat = parseFloat(venue.location?.latitude);
  const lng = parseFloat(venue.location?.longitude);
  if (isNaN(lat) || isNaN(lng)) return null;
  // Constrain to Chicagoland
  if (lat < 41 || lat > 43 || lng < -89 || lng > -87) return null;

  const address = [
    venue.address?.line1,
    venue.city?.name,
    venue.state?.stateCode,
    venue.postalCode,
  ].filter(Boolean).join(', ');

  const priceRange = tm.priceRanges?.[0];
  const is_free = !priceRange || (priceRange.min === 0 && priceRange.max === 0);

  return {
    external_id: tm.id,
    source: 'ticketmaster',
    title: tm.name,
    description: tm.info || tm.pleaseNote || null,
    category: mapCategories(tm),
    image_url: tm.images?.find((i) => i.ratio === '16_9' && i.width > 500)?.url || tm.images?.[0]?.url || null,
    start_datetime: tm.dates?.start?.dateTime || (tm.dates?.start?.localDate ? `${tm.dates.start.localDate}T00:00:00Z` : null),
    end_datetime: null,
    is_recurring: false,
    venue_name: venue.name || null,
    address: address || null,
    city: venue.city?.name || 'Chicago',
    neighborhood: null,
    coordinates: `POINT(${lng} ${lat})`,
    is_free,
    price_min: priceRange?.min ?? null,
    price_max: priceRange?.max ?? null,
    official_url: tm.url || null,
    ticket_url: tm.url || null,
  };
}

async function fetchPage(page = 0) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    apikey: API_KEY,
    city: 'Chicago',
    stateCode: 'IL',
    countryCode: 'US',
    radius: '50',
    unit: 'miles',
    startDateTime: `${today}T00:00:00Z`,
    endDateTime: `${future}T23:59:59Z`,
    size: 200,
    page,
    sort: 'date,asc',
  });

  const res = await fetch(`${BASE_URL}/events.json?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ticketmaster API ${res.status}: ${body}`);
  }
  return res.json();
}

async function ingest() {
  if (!API_KEY) {
    console.log('[ticketmaster] TICKETMASTER_API_KEY not set — skipping');
    return { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  }

  console.log('[ticketmaster] Starting ingestion...');
  const allEvents = [];
  let page = 0;
  let totalPages = 1;

  while (page < totalPages && page < 5) { // cap at 1000 events
    const data = await fetchPage(page);
    const events = data._embedded?.events || [];
    const normalized = events.map(normalizeEvent).filter(Boolean);
    allEvents.push(...normalized);
    totalPages = data.page?.totalPages ?? 1;
    page++;
  }

  console.log(`[ticketmaster] Fetched ${allEvents.length} events. Upserting...`);
  const summary = await upsertEvents(allEvents);
  console.log(`[ticketmaster] Done. inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`);
  return summary;
}

module.exports = ingest;
