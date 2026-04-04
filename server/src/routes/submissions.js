const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');
const verify = require('../services/verification');

// POST /api/v1/submissions
router.post('/', checkAuth, async (req, res) => {
  const {
    title, category, description, start_datetime, end_datetime,
    is_recurring, recurrence_rule, venue_name, address, city,
    coordinates, is_free, price_min, price_max, price_notes,
    official_url, contact_email,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!start_datetime) return res.status(400).json({ error: 'Start date/time is required' });
  if (!coordinates) return res.status(400).json({ error: 'Location is required' });
  if (!category?.length) return res.status(400).json({ error: 'At least one category is required' });

  // Run automated verification
  const { score, details, autoRejected } = await verify({
    title, description, start_datetime, end_datetime, address, official_url, coordinates,
  });

  const submission_status = autoRejected ? 'rejected' : 'pending';
  const submission_notes = autoRejected
    ? `Auto-rejected: ${details.content.note}`
    : null;

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      category,
      description: description?.trim() || null,
      start_datetime,
      end_datetime: end_datetime || null,
      is_recurring: is_recurring || false,
      recurrence_rule: recurrence_rule || null,
      venue_name: venue_name?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      coordinates,
      is_free: is_free ?? true,
      price_min: is_free ? null : (price_min || null),
      price_max: is_free ? null : (price_max || null),
      price_notes: price_notes?.trim() || null,
      official_url: official_url?.trim() || null,
      contact_email: contact_email?.trim() || null,
      source: 'community',
      is_user_submitted: true,
      submitted_by_user_id: req.user.id,
      submission_status,
      submission_notes,
      verification_score: score,
      verification_details: details,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Failed to submit event' });
  }

  // Log the submission
  await supabase.from('event_submission_log').insert({
    event_id: data.id,
    action: autoRejected ? 'auto_rejected' : 'submitted',
    actor_user_id: req.user.id,
    note: submission_notes,
    verification_snapshot: details,
  });

  // Increment user submission count
  await supabase.rpc('increment_submission_count', { user_id: req.user.id });

  res.status(201).json({
    submission_id: data.id,
    score,
    status: submission_status,
    auto_rejected: autoRejected,
  });
});

// GET /api/v1/submissions/mine
router.get('/mine', checkAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, start_datetime, submission_status, verification_score, submission_notes, created_at')
    .eq('submitted_by_user_id', req.user.id)
    .eq('is_user_submitted', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch submissions' });
  res.json(data);
});

// PUT /api/v1/submissions/:id — edit a rejected submission and resubmit
router.put('/:id', checkAuth, async (req, res) => {
  const { data: existing, error: fetchError } = await supabase
    .from('events')
    .select('id, submission_status, submitted_by_user_id')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !existing) return res.status(404).json({ error: 'Submission not found' });
  if (existing.submitted_by_user_id !== req.user.id) return res.status(403).json({ error: 'Not your submission' });
  if (existing.submission_status !== 'rejected') return res.status(400).json({ error: 'Only rejected submissions can be resubmitted' });

  const {
    title, category, description, start_datetime, end_datetime,
    is_recurring, recurrence_rule, venue_name, address, city,
    coordinates, is_free, price_min, price_max, price_notes,
    official_url, contact_email,
  } = req.body;

  // Re-run verification
  const { score, details, autoRejected } = await verify({
    title, description, start_datetime, end_datetime, address, official_url, coordinates,
  });

  const { error } = await supabase
    .from('events')
    .update({
      title, category, description, start_datetime, end_datetime,
      is_recurring, recurrence_rule, venue_name, address, city,
      coordinates, is_free, price_min, price_max, price_notes,
      official_url, contact_email,
      submission_status: autoRejected ? 'rejected' : 'pending',
      submission_notes: autoRejected ? `Auto-rejected: ${details.content.note}` : null,
      verification_score: score,
      verification_details: details,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to resubmit' });

  await supabase.from('event_submission_log').insert({
    event_id: req.params.id,
    action: 'edited',
    actor_user_id: req.user.id,
    verification_snapshot: details,
  });

  res.json({ ok: true, score, status: autoRejected ? 'rejected' : 'pending' });
});

module.exports = router;
