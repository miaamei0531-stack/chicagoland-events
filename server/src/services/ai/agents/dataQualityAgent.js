/**
 * Data Quality Agent
 * Runs nightly at 2am via cron.
 * For events ingested in the last 24 hours:
 *   1. Flags administrative/permit strings as inactive
 *   2. Infers is_outdoor from venue_name keywords
 *   3. Infers is_free from description keywords
 *
 * Uses rule-based logic (no Claude call) for cost efficiency.
 * Claude is only invoked for ambiguous titles that can't be classified by keywords.
 */

const supabase = require('../../supabase');

// Patterns that indicate a permit/admin record, not a real event
const ADMIN_PATTERNS = [
  /\bpermit\b/i,
  /\bcommemorativ/i,
  /\bcluster\s*\d/i,
  /\bblock\s+party\s+permit/i,
  /\bspecial event permit/i,
  /\bpublic way use/i,
  /\bfilm permit/i,
  /^[A-Z0-9\s\-]+$/, // all caps/numbers with no real words (permit codes)
];

function isAdminTitle(title) {
  if (!title) return false;
  const t = title.trim();
  if (t.length < 5) return true;
  return ADMIN_PATTERNS.some((re) => re.test(t));
}

// Outdoor venue keyword heuristics
const OUTDOOR_KEYWORDS = ['park', 'beach', 'street', 'plaza', 'field', 'lakefront', 'outdoor', 'garden', 'trail', 'forest', 'preserve', 'riverfront', 'promenade'];
const INDOOR_KEYWORDS = ['gallery', 'theater', 'theatre', 'museum', 'studio', 'hall', 'center', 'centre', 'bar', 'restaurant', 'cafe', 'lounge', 'club', 'arena', 'stadium', 'library', 'church', 'school', 'university', 'hotel'];

function inferIsOutdoor(venueName, address) {
  const text = `${venueName || ''} ${address || ''}`.toLowerCase();
  const hasOutdoor = OUTDOOR_KEYWORDS.some((kw) => text.includes(kw));
  const hasIndoor = INDOOR_KEYWORDS.some((kw) => text.includes(kw));
  if (hasOutdoor && !hasIndoor) return true;
  if (hasIndoor && !hasOutdoor) return false;
  return null; // ambiguous — leave as null
}

// Free/paid heuristics
const FREE_KEYWORDS = ['free', 'no charge', 'complimentary', 'no cost', 'free admission', 'free entry'];
const PAID_KEYWORDS = ['$', 'ticket', 'admission', 'register', 'rsvp required', 'purchase', 'fee'];

function inferIsFree(description) {
  if (!description) return null;
  const text = description.toLowerCase();
  const hasFree = FREE_KEYWORDS.some((kw) => text.includes(kw));
  const hasPaid = PAID_KEYWORDS.some((kw) => text.includes(kw));
  if (hasFree && !hasPaid) return true;
  if (hasPaid && !hasFree) return false;
  return null;
}

async function run() {
  console.log('[DataQuality] Starting nightly data quality pass…');

  // Fetch events ingested in the last 24 hours with unknown quality fields
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, venue_name, address, is_outdoor, is_free, is_active')
    .gte('created_at', since)
    .limit(500);

  if (error) {
    console.error('[DataQuality] Failed to fetch events:', error.message);
    return;
  }

  let flagged = 0, outdoorInferred = 0, freeInferred = 0;

  for (const event of events || []) {
    const updates = {};

    // 1. Flag admin/permit titles
    if (event.is_active !== false && isAdminTitle(event.title)) {
      updates.is_active = false;
      flagged++;
    }

    // 2. Infer is_outdoor if not already set
    if (event.is_outdoor === null || event.is_outdoor === undefined) {
      const inferred = inferIsOutdoor(event.venue_name, event.address);
      if (inferred !== null) {
        updates.is_outdoor = inferred;
        outdoorInferred++;
      }
    }

    // 3. Infer is_free if not already set
    if ((event.is_free === null || event.is_free === undefined) && event.description) {
      const inferred = inferIsFree(event.description);
      if (inferred !== null) {
        updates.is_free = inferred;
        freeInferred++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('events').update(updates).eq('id', event.id);
    }
  }

  console.log(`[DataQuality] Done. Flagged: ${flagged}, is_outdoor inferred: ${outdoorInferred}, is_free inferred: ${freeInferred}`);
}

module.exports = { run };
