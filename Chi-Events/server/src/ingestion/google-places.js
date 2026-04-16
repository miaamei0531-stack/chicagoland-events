/**
 * Google Places Ingestion Worker
 * Uses Google Places API (Nearby Search) to fetch popular places in Chicagoland.
 *
 * Categories fetched:
 *   restaurant (min 4.0), cafe (min 4.2), bar, park, museum,
 *   movie_theater, spa, shopping_mall
 *
 * Deduplicates on (source, external_id) = ('google', place_id).
 */

const crypto = require('crypto');
const supabase = require('../services/supabase');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const CHICAGO_LAT = 41.8827;
const CHICAGO_LNG = -87.6233;
const RADIUS_METERS = 20000; // 20km

// Google type → our category mapping
const TYPE_CONFIG = [
  { type: 'restaurant', category: 'Restaurant', minRating: 4.0 },
  { type: 'cafe', category: 'Coffee', minRating: 4.2 },
  { type: 'bar', category: 'Bar', minRating: 0 },
  { type: 'park', category: 'Park', minRating: 0 },
  { type: 'museum', category: 'Museum', minRating: 0 },
  { type: 'movie_theater', category: 'Movie Theater', minRating: 0 },
  { type: 'spa', category: 'Spa', minRating: 0 },
  { type: 'shopping_mall', category: 'Shopping', minRating: 0 },
];

function contentHash(name, address) {
  return crypto.createHash('md5').update(`${name}${address}`).digest('hex');
}

/**
 * Fetch places for a single type using Nearby Search.
 * Follows up to 2 next_page_token pages (max ~60 results).
 */
async function fetchPlacesForType(googleType, minRating) {
  if (!API_KEY) {
    console.warn('  ⚠ GOOGLE_PLACES_API_KEY not set — skipping');
    return [];
  }

  const allResults = [];
  let pageToken = null;
  let pages = 0;

  while (pages < 3) {
    const params = new URLSearchParams({
      location: `${CHICAGO_LAT},${CHICAGO_LNG}`,
      radius: String(RADIUS_METERS),
      type: googleType,
      key: API_KEY,
    });
    if (pageToken) params.set('pagetoken', pageToken);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`  ✗ Google Places API error for ${googleType}: ${data.status}`, data.error_message || '');
      break;
    }

    const results = (data.results || []).filter((p) => {
      if (minRating > 0 && (p.rating || 0) < minRating) return false;
      if (p.business_status && p.business_status !== 'OPERATIONAL') return false;
      return true;
    });

    allResults.push(...results);
    pageToken = data.next_page_token || null;
    pages++;

    if (!pageToken) break;
    // Google requires a short delay before using next_page_token
    await new Promise((r) => setTimeout(r, 2000));
  }

  return allResults;
}

/**
 * Parse opening hours from Google format to our JSONB format.
 */
function parseHours(openingHours) {
  if (!openingHours?.weekday_text) return null;
  const dayMap = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const hours = {};
  openingHours.weekday_text.forEach((text, i) => {
    // Format: "Monday: 11:00 AM – 10:00 PM" or "Monday: Closed"
    const parts = text.split(': ');
    if (parts.length >= 2) {
      hours[dayMap[i]] = parts.slice(1).join(': ');
    }
  });
  return Object.keys(hours).length > 0 ? hours : null;
}

/**
 * Normalize a Google Places result to our places table schema.
 */
function normalize(place, category) {
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;

  return {
    external_id: place.place_id,
    source: 'google',
    name: place.name,
    category: [category],
    subcategory: null,
    description: place.vicinity || null,
    address: place.vicinity || null,
    neighborhood: null,
    city: 'Chicago',
    coordinates: lat && lng ? `POINT(${lng} ${lat})` : null,
    hours: parseHours(place.opening_hours),
    price_level: place.price_level || null,
    rating: place.rating || null,
    review_count: place.user_ratings_total || null,
    image_url: place.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${API_KEY}`
      : null,
    website_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
    reservation_url: null,
    typical_duration_minutes: null,
    best_time_to_visit: null,
    insider_tip: null,
    is_outdoor: ['Park'].includes(category),
    requires_reservation: false,
    is_active: true,
    content_hash: contentHash(place.name, place.vicinity || ''),
  };
}

/**
 * Upsert a single place. Same pattern as event upsert.
 */
async function upsertPlace(place) {
  const { data: existing } = await supabase
    .from('places')
    .select('id, content_hash')
    .eq('source', place.source)
    .eq('external_id', place.external_id)
    .maybeSingle();

  if (existing && existing.content_hash === place.content_hash) {
    return 'skipped';
  }

  const row = {
    ...place,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('places')
    .upsert(row, { onConflict: 'source,external_id' });

  if (error) throw error;
  return existing ? 'updated' : 'inserted';
}

/**
 * Main ingestion entry point.
 */
async function ingestGooglePlaces() {
  if (!API_KEY) {
    console.log('⚠ GOOGLE_PLACES_API_KEY not set — skipping Google Places ingestion');
    return { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  }

  console.log('🏪 Starting Google Places ingestion...');
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const config of TYPE_CONFIG) {
    console.log(`  Fetching ${config.type} (min rating: ${config.minRating || 'none'})...`);
    const results = await fetchPlacesForType(config.type, config.minRating);
    console.log(`  → ${results.length} results`);

    for (const place of results) {
      try {
        const normalized = normalize(place, config.category);
        if (!normalized.coordinates) {
          skipped++;
          continue;
        }
        const action = await upsertPlace(normalized);
        if (action === 'inserted') inserted++;
        else if (action === 'updated') updated++;
        else skipped++;
      } catch (err) {
        console.error(`  ✗ ${place.name}:`, err.message);
        failed++;
      }
    }
  }

  console.log(`🏪 Google Places done: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${failed} failed`);
  return { inserted, updated, skipped, failed };
}

module.exports = { ingestGooglePlaces };
