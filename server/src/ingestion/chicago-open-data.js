/**
 * Chicago Open Data Portal Ingestion Worker
 * Dataset: Special Events Permits (cityofchicago.org)
 * API: Socrata — https://data.cityofchicago.org/resource/pk66-w54g.json
 *
 * Runs daily via node-cron.
 */

const { upsertEvents } = require('./upsert');

const DATASET_URL = 'https://data.cityofchicago.org/resource/pk66-w54g.json';

const CHICAGO_CENTER = { lat: 41.8781, lng: -87.6298 };

// Geocode an address using the Mapbox API (server-side secret token)
async function geocodeAddress(address) {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token || !address) return null;
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=US&proximity=-87.6298,41.8781&limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.center;
    // Only accept coords within Chicagoland bounding box
    if (lat < 41 || lat > 43 || lng < -89 || lng > -87) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function guessCategory(eventName = '') {
  const name = eventName.toLowerCase();
  if (name.includes('market') || name.includes('farmer')) return ['Farmers Market', 'Food'];
  if (name.includes('festival') || name.includes('fest')) return ['Festivals'];
  if (name.includes('parade')) return ['Sightseeing', 'Family-Friendly'];
  if (name.includes('music') || name.includes('concert') || name.includes('jazz') || name.includes('blues')) return ['Music'];
  if (name.includes('art') || name.includes('gallery') || name.includes('film')) return ['Arts'];
  if (name.includes('run') || name.includes('race') || name.includes('walk')) return ['Sightseeing', 'Family-Friendly'];
  if (name.includes('food') || name.includes('taste') || name.includes('dining')) return ['Food'];
  return ['Sightseeing'];
}

async function normalizeEvent(row) {
  // Actual columns: requestor_, organization, park_number, park_facility_name,
  // reservation_start_date, reservation_end_date, event_type, event_description, permit_status
  const title = row.organization || row.event_type || row.requestor_;
  if (!title || !row.reservation_start_date) return null;

  // Geocode the park address; fall back to Chicago center
  const addressStr = row.park_facility_name
    ? `${row.park_facility_name}, Chicago, IL`
    : 'Chicago, IL';
  const geo = await geocodeAddress(addressStr);
  const lat = geo?.lat ?? CHICAGO_CENTER.lat;
  const lng = geo?.lng ?? CHICAGO_CENTER.lng;

  const parseDate = (d) => {
    if (!d) return null;
    if (d.includes('T')) return d;
    // Format: "YYYY-MM-DD" or "MM/DD/YYYY"
    if (d.includes('-')) return `${d}T00:00:00Z`;
    const [m, day, y] = d.split('/');
    if (!m || !day || !y) return null;
    return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
  };

  const start_datetime = parseDate(row.reservation_start_date);
  const end_datetime = parseDate(row.reservation_end_date) || start_datetime;
  if (!start_datetime) return null;

  const eventName = `${row.event_type || 'Event'} at ${row.park_facility_name || 'Chicago Park'}`;

  return {
    external_id: row.park_number
      ? `cod-${row.park_number}-${row.reservation_start_date}`
      : `cod-${title}-${row.reservation_start_date}`,
    source: 'choosechicago',
    title: eventName,
    description: row.event_description || `${title} event at ${row.park_facility_name || 'a Chicago park'}.`,
    category: guessCategory(eventName),
    image_url: null,
    start_datetime,
    end_datetime,
    is_recurring: false,
    venue_name: row.park_facility_name || null,
    address: row.park_facility_name ? `${row.park_facility_name}, Chicago, IL` : 'Chicago, IL',
    city: 'Chicago',
    neighborhood: null,
    coordinates: `POINT(${lng} ${lat})`,
    is_free: true,
    price_min: null,
    price_max: null,
    official_url: null,
  };
}

async function fetchEvents() {
  const today = new Date().toISOString().split('T')[0];
  const params = new URLSearchParams({
    '$where': `reservation_start_date >= '${today}'`,
    '$limit': '1000',
    '$order': 'reservation_start_date ASC',
  });

  const url = `${DATASET_URL}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chicago Open Data API ${res.status}: ${body}`);
  }

  return res.json();
}

async function ingest() {
  console.log('[chicago-open-data] Starting ingestion...');

  const rows = await fetchEvents();
  console.log(`[chicago-open-data] Fetched ${rows.length} records`);

  const normalized = (await Promise.all(rows.map(normalizeEvent))).filter(Boolean);
  console.log(`[chicago-open-data] ${normalized.length} valid events. Upserting...`);

  const summary = await upsertEvents(normalized);
  console.log(`[chicago-open-data] Done. inserted=${summary.inserted} updated=${summary.updated} skipped=${summary.skipped} failed=${summary.failed}`);
  return summary;
}

module.exports = ingest;
