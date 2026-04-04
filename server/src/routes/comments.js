const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth, checkAdmin } = require('../middleware/auth');

const VALID_TYPES = ['general', 'looking_to_join', 'carpool_offer', 'carpool_request', 'question'];

// GET /api/v1/events/:id/comments
router.get('/events/:id/comments', async (req, res) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('comments')
      .select(`
        id, body, type, reported_count, is_deleted, created_at, updated_at,
        user:users(id, display_name, avatar_url)
      `)
      .eq('event_id', req.params.id)
      .order('created_at', { ascending: true });

    if (type && VALID_TYPES.includes(type)) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Replace deleted comment bodies with [removed]
    const cleaned = data.map((c) =>
      c.is_deleted ? { ...c, body: '[removed]', user: null } : c
    );

    res.json(cleaned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/v1/events/:id/comments
router.post('/events/:id/comments', checkAuth, async (req, res) => {
  try {
    const { body, type = 'general' } = req.body;

    if (!body?.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    // Check user is not banned
    const { data: userRecord } = await supabase
      .from('users')
      .select('is_banned')
      .eq('id', req.user.id)
      .single();

    if (userRecord?.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        event_id: req.params.id,
        user_id: req.user.id,
        body: body.trim(),
        type,
      })
      .select(`
        id, body, type, reported_count, is_deleted, created_at, updated_at,
        user:users(id, display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// POST /api/v1/comments/:id/report
router.post('/:id/report', checkAuth, async (req, res) => {
  try {
    const { error } = await supabase.rpc('increment_reported_count', {
      comment_id: req.params.id,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to report comment' });
  }
});

// DELETE /api/v1/comments/:id  (soft delete — admin only)
router.delete('/:id', checkAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('comments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
