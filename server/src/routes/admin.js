const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAdmin } = require('../middleware/auth');

// All admin routes require admin JWT
router.use(checkAdmin);

// GET /api/v1/admin/submissions — pending queue sorted by score DESC
router.get('/submissions', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, description, category, start_datetime, end_datetime,
      venue_name, address, city, neighborhood, is_free, price_min, price_max,
      official_url, image_url, verification_score, verification_details,
      submission_notes, contact_email, created_at,
      submitter:users!submitted_by_user_id(id, display_name, email, submission_count, approved_count)
    `)
    .eq('submission_status', 'pending')
    .eq('is_user_submitted', true)
    .order('verification_score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/v1/admin/submissions/all — full audit view with filters
router.get('/submissions/all', async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('events')
    .select(`
      id, title, category, start_datetime, submission_status,
      verification_score, created_at, updated_at,
      submitter:users!submitted_by_user_id(id, display_name, email)
    `)
    .eq('is_user_submitted', true)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('submission_status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/v1/admin/submissions/:id/approve
router.put('/submissions/:id/approve', async (req, res) => {
  const { note } = req.body;

  const { error } = await supabase
    .from('events')
    .update({
      submission_status: 'approved',
      submission_notes: note || 'Approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('event_submission_log').insert({
    event_id: req.params.id,
    action: 'admin_approved',
    actor_user_id: req.adminUser.id,
    note: note || null,
  });

  // Increment submitter's approved_count
  const { data: event } = await supabase
    .from('events')
    .select('submitted_by_user_id')
    .eq('id', req.params.id)
    .single();

  if (event?.submitted_by_user_id) {
    await supabase.rpc('increment_approved_count', { user_id: event.submitted_by_user_id });
  }

  res.json({ ok: true });
});

// PUT /api/v1/admin/submissions/:id/reject
router.put('/submissions/:id/reject', async (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Rejection reason is required' });

  const { error } = await supabase
    .from('events')
    .update({
      submission_status: 'rejected',
      submission_notes: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('event_submission_log').insert({
    event_id: req.params.id,
    action: 'admin_rejected',
    actor_user_id: req.adminUser.id,
    note: reason.trim(),
  });

  res.json({ ok: true });
});

// PUT /api/v1/admin/submissions/:id/flag
router.put('/submissions/:id/flag', async (req, res) => {
  const { error } = await supabase
    .from('events')
    .update({
      submission_status: 'flagged',
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('event_submission_log').insert({
    event_id: req.params.id,
    action: 'flagged',
    actor_user_id: req.adminUser.id,
  });

  res.json({ ok: true });
});

// GET /api/v1/admin/reported-comments
router.get('/reported-comments', async (req, res) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, body, type, reported_count, created_at,
      user:users(id, display_name),
      event:events(id, title)
    `)
    .gt('reported_count', 0)
    .eq('is_deleted', false)
    .order('reported_count', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/v1/admin/flagged — flagged community events
router.get('/flagged', async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, category, start_datetime, submission_status,
      verification_score, submission_notes, updated_at,
      submitter:users!submitted_by_user_id(id, display_name)
    `)
    .eq('submission_status', 'flagged')
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/v1/admin/comments/:id — soft delete
router.delete('/comments/:id', async (req, res) => {
  const { error } = await supabase
    .from('comments')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/v1/admin/users/:id/ban
router.post('/users/:id/ban', async (req, res) => {
  const { error } = await supabase
    .from('users')
    .update({ is_banned: true })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// GET /api/v1/admin/user-reports — unreviewed user reports
router.get('/user-reports', async (req, res) => {
  const { data, error } = await supabase
    .from('user_reports')
    .select(`
      id, reason, created_at,
      reporter:users!reporter_id(id, display_name),
      reported:users!reported_id(id, display_name, is_banned)
    `)
    .eq('reviewed', false)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/v1/admin/user-reports/:id/review
router.post('/user-reports/:id/review', async (req, res) => {
  const { error } = await supabase
    .from('user_reports')
    .update({ reviewed: true })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
