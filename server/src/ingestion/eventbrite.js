/**
 * Eventbrite Ingestion Worker
 * API docs: https://www.eventbrite.com/platform/api
 *
 * Fetches events in the Chicago metro area and upserts them into the DB.
 * Runs every 6 hours via node-cron.
 */

const { upsertEvents } = require('./upsert');

const BASE_URL = 'https://www.eventbriteapi.com/v3';
const API_KEY = process.env.EVENTBRITE_API_KEY;

// Map Eventbrite subcategory names to our categories
const CATEGORY_MAP = {
  'Music': 'Music',
  'Food & Drink': 'Food',
  'Arts': 'Arts',
  'Film & Media': 'Arts',
  'Performing & Visual Arts': 'Arts',
  'Community': 'Sightseeing',
  'Family & Education': 'Family-Friendly',
  'Festivals & Fairs': 'Festivals',
  'Nightlife': 'Nightlife',
  'Classes': 'Classes',
  'Science & Tech': 'Classes',
  'Business': 'Classes',
};

function mapCategories(ebCategories = []) {
  const mapped = ebCategories
    .map((c) => CATEGORY_MAP[c.name] || CATEGORY_MAP[c.short_name])
    .filter(Boolean);
  return [...new Set(mapped)]; // deduplicate
}

function normalizeEvent(eb) {
  const venue = eb.venue || {};
  const address = venue.address || {};

  const lat = parseFloat(address.latitude);
  const lng = parseFloat(address.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  if (!hasCoords) return null; // skip events with no location

  const fullAddress = [
    address.address_1,
    address.city,
    address.region,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    external_id: eb.id,
    source: 'eventbrite',
    title: eb.name?.text || 'Untitled Event',
    description: eb.description?.text?.slice(0, 2000) || null,
    category: mapCategories(eb.category ? [eb.category] : []),
    image_url: eb.logo?.url || null,
    start_datetime: eb.start?.utc || null,
    end_datetime: eb.end?.utc || null,
    is_recurring: false,
    venue_name: venue.name || null,
    address: fullAddress || null,
    city: address.city || null,
    neighborhood: null,
    coordinates: `POINT(${lng} ${lat})`,
    is_free: eb.is_free ?? false,
    price_min: null, // ticket pricing requires separate API call — skip for now
    price_max: null,
    official_url: eb.url || null,
    ticket_url: eb.url || null,
  };
}

async function fetchPage(page = 1) {
  const params = new URLSearchParams({
    'location.address': 'Chicago, IL',
    'location.within': '50mi',
    'start_date.range_start': new Date().toISOString().split('.')[0] + 'Z',
    'expand': 'venue,category',
    'page': page,
    'page_size': 50,
  });

  const res = await fetch(`${BASE_URL}/events/search/?${params}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Eventbrite API ${res.status}: ${body}`);
  }

  return res.json();
}

async function ingest() {
  if (!API_KEY) {
    console.log('[eventbrite] EVENTBRITE_API_KEY not set — skipping');
    return;
  }

  console.log('[eventbrite] Starting ingestion...');
  const allEvents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) { // cap at 500 events per run
    const data = await fetchPage(page);
    const normalized = (data.events || [])
      .map(normalizeEvent)
      .filter(Boolean);

    allEvents.push(...normalized);
    hasMore = data.pagination?.has_more_items ?? false;
    page++;
  }

  console.log(`[eventbrite] Fetched ${allEvents.length} events. Upserting...`);
  const summary = await upsertEvents(allEvents);
  console.log(`[eventbrite] Done. inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`);
  return summary;
}

module.exports = ingest;
