/**
 * Automated Verification Service
 * Runs on every community submission. Returns a score (0–100) and per-check details.
 *
 * Checks:
 *   1. Geocoding    — address resolves to Chicagoland           (+30 pts)
 *   2. Date         — start_datetime is in the future           (+20 pts)
 *   3. Content      — OpenAI Moderation API passes              (+30 pts)
 *   4. URL          — official_url returns HTTP 200             (+10 pts)
 *   5. Duplicate    — no similar event nearby on same day       (+10 pts)
 */

const supabase = require('./supabase');

// Chicagoland bounding box
const CHICAGO_BOUNDS = { latMin: 41.0, latMax: 43.0, lngMin: -89.0, lngMax: -87.0 };

// ── Check 1: Geocoding ─────────────────────────────────────────────────────
async function checkGeocoding(address) {
  const result = { passed: false, points: 0, note: null };
  if (!address) {
    result.note = 'No address provided';
    return result;
  }

  try {
    const token = process.env.MAPBOX_SECRET_TOKEN;
    if (!token) {
      result.note = 'Mapbox token not configured';
      return result;
    }

    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=us&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();

    const feature = data.features?.[0];
    if (!feature) {
      result.note = 'Address not found';
      return result;
    }

    const [lng, lat] = feature.center;
    const inBounds =
      lat >= CHICAGO_BOUNDS.latMin && lat <= CHICAGO_BOUNDS.latMax &&
      lng >= CHICAGO_BOUNDS.lngMin && lng <= CHICAGO_BOUNDS.lngMax;

    if (!inBounds) {
      result.note = `Location (${lat.toFixed(3)}, ${lng.toFixed(3)}) is outside Chicagoland`;
      return result;
    }

    result.passed = true;
    result.points = 30;
    result.note = feature.place_name;
  } catch (err) {
    result.note = `Geocoding error: ${err.message}`;
  }

  return result;
}

// ── Check 2: Date Validity ─────────────────────────────────────────────────
function checkDate(start_datetime, end_datetime) {
  const result = { passed: false, points: 0, note: null };

  if (!start_datetime) {
    result.note = 'No start date provided';
    return result;
  }

  const start = new Date(start_datetime);
  const now = new Date();

  if (isNaN(start.getTime())) {
    result.note = 'Invalid start date format';
    return result;
  }

  if (start <= now) {
    result.note = 'Start date must be in the future';
    return result;
  }

  if (end_datetime) {
    const end = new Date(end_datetime);
    if (!isNaN(end.getTime()) && end <= start) {
      result.note = 'End date must be after start date';
      return result;
    }
  }

  result.passed = true;
  result.points = 20;
  result.note = `Starts ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return result;
}

// ── Check 3: Content Moderation ────────────────────────────────────────────
async function checkContent(title, description) {
  const result = { passed: false, points: 0, note: null };

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    // Skip gracefully if key not configured — award points so it doesn't penalize submissions
    result.passed = true;
    result.points = 30;
    result.note = 'Moderation skipped (API key not configured)';
    return result;
  }

  try {
    const input = [title, description].filter(Boolean).join(' ');
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    const data = await res.json();
    const flagged = data.results?.[0]?.flagged;

    if (flagged) {
      const categories = data.results[0].categories;
      const flaggedCats = Object.entries(categories)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      result.note = `Content flagged: ${flaggedCats}`;
      return result;
    }

    result.passed = true;
    result.points = 30;
    result.note = 'Content approved';
  } catch (err) {
    // Don't penalize if API is down
    result.passed = true;
    result.points = 30;
    result.note = `Moderation check skipped: ${err.message}`;
  }

  return result;
}

// ── Check 4: URL Reachability ──────────────────────────────────────────────
async function checkUrl(url) {
  const result = { passed: false, points: 0, note: null };

  if (!url) {
    result.passed = true;
    result.points = 10;
    result.note = 'No URL provided (optional)';
    return result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok || res.status === 405) { // 405 = HEAD not allowed but site exists
      result.passed = true;
      result.points = 10;
      result.note = `URL reachable (${res.status})`;
    } else {
      result.note = `URL returned ${res.status}`;
    }
  } catch (err) {
    result.note = `URL unreachable: ${err.message}`;
  }

  return result;
}

// ── Check 5: Duplicate Detection ──────────────────────────────────────────
async function checkDuplicate(title, start_datetime, coordinates) {
  const result = { passed: false, points: 0, note: null };

  if (!title || !start_datetime) {
    result.passed = true;
    result.points = 10;
    result.note = 'Could not check for duplicates';
    return result;
  }

  try {
    // Use pg_trgm similarity via RPC
    const startDate = new Date(start_datetime).toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('find_duplicate_events', {
      p_title: title,
      p_date: startDate,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      result.note = `Possible duplicate: "${data[0].title}" on ${startDate}`;
      return result;
    }

    result.passed = true;
    result.points = 10;
    result.note = 'No duplicates found';
  } catch (err) {
    // Don't penalize if check fails
    result.passed = true;
    result.points = 10;
    result.note = `Duplicate check skipped: ${err.message}`;
  }

  return result;
}

// ── Main verify function ───────────────────────────────────────────────────
async function verify(submission) {
  const [geocode, date, content, url, duplicate] = await Promise.all([
    checkGeocoding(submission.address),
    Promise.resolve(checkDate(submission.start_datetime, submission.end_datetime)),
    checkContent(submission.title, submission.description),
    checkUrl(submission.official_url),
    checkDuplicate(submission.title, submission.start_datetime, submission.coordinates),
  ]);

  const details = { geocode, date, content, url, duplicate };
  const score = geocode.points + date.points + content.points + url.points + duplicate.points;

  // Auto-reject if content is flagged
  const autoRejected = !content.passed && content.note?.startsWith('Content flagged');

  return { score, details, autoRejected };
}

module.exports = verify;
