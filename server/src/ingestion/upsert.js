const crypto = require('crypto');
const supabase = require('../services/supabase');

function contentHash(title, start_datetime, address) {
  return crypto.createHash('md5').update(`${title}${start_datetime}${address}`).digest('hex');
}

/**
 * Upsert a single normalized event into the database.
 * - If source+external_id already exists and hash is unchanged → skip
 * - If hash changed → update
 * - If new → insert
 */
async function upsertEvent(event) {
  const hash = contentHash(event.title, event.start_datetime, event.address || '');

  // Check if event already exists
  const { data: existing } = await supabase
    .from('events')
    .select('id, content_hash')
    .eq('source', event.source)
    .eq('external_id', event.external_id)
    .maybeSingle();

  if (existing && existing.content_hash === hash) {
    return { action: 'skipped' };
  }

  const row = {
    ...event,
    content_hash: hash,
    submission_status: 'ingested',
    is_user_submitted: false,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('events')
    .upsert(row, { onConflict: 'source,external_id' });

  if (error) throw error;
  return { action: existing ? 'updated' : 'inserted' };
}

/**
 * Upsert an array of normalized events. Returns a summary.
 */
async function upsertEvents(events) {
  let inserted = 0, updated = 0, skipped = 0, failed = 0;

  for (const event of events) {
    try {
      const { action } = await upsertEvent(event);
      if (action === 'inserted') inserted++;
      else if (action === 'updated') updated++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ ${event.title}:`, err.message);
      failed++;
    }
  }

  return { inserted, updated, skipped, failed };
}

module.exports = { upsertEvent, upsertEvents, contentHash };
