const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');

// ── GET /api/v1/users/:id — public profile ────────────────────────────────
router.get('/:id', async (req, res) => {
  const viewerId = req.headers.authorization
    ? (await supabase.auth.getUser(req.headers.authorization.split(' ')[1]))?.data?.user?.id
    : null;

  // Check block in either direction if viewer is logged in
  if (viewerId) {
    const { data: block } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${viewerId},blocked_id.eq.${req.params.id}),and(blocker_id.eq.${req.params.id},blocked_id.eq.${viewerId})`)
      .limit(1);
    if (block?.length) return res.status(404).json({ error: 'Profile not available' });
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, bio, gender, interests, created_at')
    .eq('id', req.params.id)
    .eq('is_banned', false)
    .single();

  if (error || !data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// All routes below require auth
router.use(checkAuth);

// ── PUT /api/v1/users/me — update own profile ─────────────────────────────
router.put('/me', async (req, res) => {
  const { display_name, bio, age, gender, interests } = req.body;

  if (display_name !== undefined && (!display_name?.trim() || display_name.trim().length > 50)) {
    return res.status(400).json({ error: 'display_name must be 1–50 characters' });
  }
  if (bio !== undefined && bio?.length > 500) {
    return res.status(400).json({ error: 'bio must be 500 characters or fewer' });
  }
  if (interests !== undefined && !Array.isArray(interests)) {
    return res.status(400).json({ error: 'interests must be an array' });
  }

  const updates = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (bio !== undefined) updates.bio = bio || null;
  if (age !== undefined) updates.age = age || null;
  if (gender !== undefined) updates.gender = gender || null;
  if (interests !== undefined) updates.interests = interests;

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select('id, display_name, avatar_url, bio, age, gender, interests')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST /api/v1/users/:id/block ──────────────────────────────────────────
router.post('/:id/block', async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

  const { error } = await supabase
    .from('user_blocks')
    .upsert({ blocker_id: req.user.id, blocked_id: req.params.id }, { onConflict: 'blocker_id,blocked_id' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE /api/v1/users/:id/block ───────────────────────────────────────
router.delete('/:id/block', async (req, res) => {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', req.user.id)
    .eq('blocked_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── GET /api/v1/users/me/blocks — list blocked users ─────────────────────
router.get('/me/blocks', async (req, res) => {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocked:users!blocked_id(id, display_name, avatar_url), created_at')
    .eq('blocker_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map((r) => ({ ...r.blocked, blocked_at: r.created_at })));
});

// ── POST /api/v1/users/:id/report ─────────────────────────────────────────
router.post('/:id/report', async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot report yourself' });
  const { reason } = req.body;

  // Don't duplicate unreviewed reports from same reporter
  const { data: existing } = await supabase
    .from('user_reports')
    .select('id')
    .eq('reporter_id', req.user.id)
    .eq('reported_id', req.params.id)
    .eq('reviewed', false)
    .limit(1);

  if (existing?.length) return res.json({ ok: true, duplicate: true });

  const { error } = await supabase
    .from('user_reports')
    .insert({ reporter_id: req.user.id, reported_id: req.params.id, reason: reason || null });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
});

module.exports = router;
