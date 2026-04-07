/**
 * PredictHQ Ingestion Worker
 * API docs: https://docs.predicthq.com/api/events
 *
 * PredictHQ aggregates 19+ sources including Eventbrite, Facebook Events,
 * local calendars, community boards — covers the grassroots/community events
 * gap left by Eventbrite's deprecated API.
 *
 * Free tier: 100 requests/day, up to 500 events per request.
 * Runs every 12 hours via node-cron.
 */

const { upsertEvents } = require('./upsert');

const BASE_URL = 'https://api.predicthq.com/v1';
const API_KEY = process.env.PREDICTHQ_API_KEY;

// PredictHQ categories → our categories
const CATEGORY_MAP = {
  'community':       'Sightseeing',
  'concerts':        'Music',
  'conferences':     'Classes',
  'expos':           'Classes',
  'festivals':       'Festivals',
  'performing-arts': 'Arts',
  'sports':          'Sightseeing',
  'family':          'Family-Friendly',
  'food-drink':      'Food',
  'nightlife':       'Nightlife',
};

function mapCategory(phqCategory) {
  return CATEGORY_MAP[phqCategory] || 'Sightseeing';
}

function normalizeEvent(ev) {
  if (!ev.location || ev.location.length < 2) return null;

  const [lng, lat] = ev.location; // PredictHQ returns [lng, lat]
  if (isNaN(lat) || isNaN(lng)) return null;
  // Constrain to Chicagoland
  if (lat < 41 || lat > 43 || lng < -89 || lng > -87) return null;

  const category = mapCategory(ev.category);

  return {
    external_id: ev.id,
    source: 'predicthq',
    title: ev.title,
    description: ev.description || null,
    category: [category],
    image_url: null,
    start_datetime: ev.start || null,
    end_datetime: ev.end || null,
    is_recurring: false,
    venue_name: ev.entities?.find((e) => e.type === 'venue')?.name || null,
    address: ev.geo?.address?.formatted_address || null,
    city: ev.geo?.address?.city || 'Chicago',
    neighborhood: null,
    coordinates: `POINT(${lng} ${lat})`,
    is_free: null, // PredictHQ doesn't provide pricing
    price_min: null,
    price_max: null,
    official_url: null,
  };
}

async function fetchPage(offset = 0) {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = new URLSearchParams({
    'within': '50mi@41.8827,-87.6233',
    'start.gte': today,
    'start.lte': future,
    'category': 'community,concerts,festivals,performing-arts,expos,conferences,family,food-drink,nightlife',
    'country': 'US',
    'limit': 500,
    'offset': offset,
    'sort': 'start',
  });

  const res = await fetch(`${BASE_URL}/events/?${params}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PredictHQ API ${res.status}: ${body}`);
  }

  return res.json();
}

async function ingest() {
  if (!API_KEY) {
    console.log('[predicthq] PREDICTHQ_API_KEY not set — skipping');
    return { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  }

  console.log('[predicthq] Starting ingestion...');
  const allEvents = [];

  // Fetch up to 2 pages (1000 events) to stay within free tier limits
  for (let offset = 0; offset < 1000; offset += 500) {
    const data = await fetchPage(offset);
    const events = data.results || [];
    if (events.length === 0) break;

    const normalized = events.map(normalizeEvent).filter(Boolean);
    allEvents.push(...normalized);

    if (!data.next) break; // no more pages
  }

  console.log(`[predicthq] Fetched ${allEvents.length} events. Upserting...`);
  const summary = await upsertEvents(allEvents);
  console.log(`[predicthq] Done. inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`);
  return summary;
}

module.exports = ingest;
