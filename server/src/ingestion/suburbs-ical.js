/**
 * Suburban iCal Ingestion
 * Parses iCal feeds from Evanston, Oak Park, Naperville, Schaumburg.
 * Each event is tagged with the correct city field.
 *
 * Schedule: daily at 3am (via scheduler.js)
 * No API key required — all public iCal URLs.
 */

const { upsertEvent } = require('./upsert');
const crypto = require('crypto');

// iCal feeds — these are the official city event calendar feeds
const FEEDS = [
  {
    city: 'Evanston',
    url: 'https://cityofevanston.org/events?format=ical',
    lat: 42.0451,
    lng: -87.6877,
  },
  {
    city: 'Oak Park',
    url: 'https://www.oak-park.us/events?format=ical',
    lat: 41.8850,
    lng: -87.7845,
  },
  {
    city: 'Naperville',
    url: 'https://www.naperville.il.us/events/?format=ical',
    lat: 41.7858,
    lng: -88.1472,
  },
  {
    city: 'Schaumburg',
    url: 'https://www.schaumburg.com/events?format=ical',
    lat: 42.0334,
    lng: -88.0834,
  },
];

// Minimal iCal parser — handles VEVENT blocks
function parseIcal(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT');
  blocks.shift(); // remove header

  for (const block of blocks) {
    const get = (key) => {
      const re = new RegExp(`${key}[^:]*:([^\\r\\n]+)`, 'i');
      const m = block.match(re);
      return m ? m[1].replace(/\\n/g, '\n').replace(/\\,/g, ',').trim() : null;
    };

    const dtstart = get('DTSTART');
    if (!dtstart) continue;

    // Parse YYYYMMDD or YYYYMMDDTHHMMSSZ
    function parseDate(s) {
      if (!s) return null;
      const cleaned = s.replace(/[TZ]/g, '');
      const y = cleaned.slice(0, 4), mo = cleaned.slice(4, 6), d = cleaned.slice(6, 8);
      const h = cleaned.slice(8, 10) || '00', mi = cleaned.slice(10, 12) || '00';
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`);
    }

    const startDate = parseDate(dtstart);
    if (!startDate || isNaN(startDate)) continue;
    if (startDate < new Date()) continue; // skip past events

    events.push({
      title: get('SUMMARY'),
      description: get('DESCRIPTION'),
      start_datetime: startDate.toISOString(),
      end_datetime: parseDate(get('DTEND'))?.toISOString() || null,
      official_url: get('URL'),
      address: get('LOCATION'),
      external_id: get('UID') || null,
    });
  }

  return events;
}

async function ingestFeed(feed) {
  let text;
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'ChicagolandEventsBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (err) {
    console.warn(`[suburbs-ical] ${feed.city} fetch failed: ${err.message}`);
    return { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  }

  const parsed = parseIcal(text);
  const totals = { inserted: 0, updated: 0, skipped: 0, failed: 0 };

  for (const evt of parsed) {
    if (!evt.title || !evt.start_datetime) { totals.skipped++; continue; }

    const content_hash = crypto
      .createHash('md5')
      .update(`${evt.title}|${evt.start_datetime}|${feed.city}`)
      .digest('hex');

    const record = {
      source: `suburb-ical-${feed.city.toLowerCase().replace(' ', '-')}`,
      external_id: evt.external_id || content_hash,
      is_user_submitted: false,
      submission_status: 'ingested',
      title: evt.title,
      description: evt.description,
      start_datetime: evt.start_datetime,
      end_datetime: evt.end_datetime,
      official_url: evt.official_url,
      address: evt.address,
      city: feed.city,
      coordinates: `POINT(${feed.lng} ${feed.lat})`,
      content_hash,
      is_active: true,
    };

    try {
      const result = await upsertEvent(record);
      if (result.action === 'inserted') totals.inserted++;
      else if (result.action === 'updated') totals.updated++;
      else totals.skipped++;
    } catch {
      totals.failed++;
    }
  }

  console.log(`[suburbs-ical] ${feed.city}: inserted=${totals.inserted} updated=${totals.updated} skipped=${totals.skipped}`);
  return totals;
}

async function ingestAllSuburbs() {
  let total = { inserted: 0, updated: 0, skipped: 0, failed: 0 };
  for (const feed of FEEDS) {
    const result = await ingestFeed(feed);
    total.inserted += result.inserted;
    total.updated += result.updated;
    total.skipped += result.skipped;
    total.failed += result.failed;
  }
  console.log(`[suburbs-ical] Total: inserted=${total.inserted} updated=${total.updated}`);
  return total;
}

module.exports = ingestAllSuburbs;
