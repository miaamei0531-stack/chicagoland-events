const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');
const { attachCoords } = require('../utils/parseCoordinates');

// POST /api/v1/events/:id/save — toggle save (saves if not saved, removes if already saved)
router.post('/events/:id/save', checkAuth, async (req, res) => {
  const { id: event_id } = req.params;
  const user_id = req.user.id;

  // Check if already saved
  const { data: existing } = await supabase
    .from('saved_events')
    .select('id')
    .eq('user_id', user_id)
    .eq('event_id', event_id)
    .single();

  if (existing) {
    // Unsave
    const { error } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', user_id)
      .eq('event_id', event_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ saved: false });
  } else {
    // Save
    const { error } = await supabase
      .from('saved_events')
      .insert({ user_id, event_id });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ saved: true });
  }
});

// GET /api/v1/events/:id/saved — check if current user has saved this event
router.get('/events/:id/saved', checkAuth, async (req, res) => {
  const { data } = await supabase
    .from('saved_events')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('event_id', req.params.id)
    .single();
  res.json({ saved: !!data });
});

// GET /api/v1/me/collections — saved events + events the user has commented on
router.get('/me/collections', checkAuth, async (req, res) => {
  const user_id = req.user.id;

  const [savedResult, commentedResult] = await Promise.all([
    // Saved events
    supabase
      .from('saved_events')
      .select('event_id, created_at, event:events(id, title, category, start_datetime, end_datetime, venue_name, is_free, is_user_submitted, submission_status, coordinates)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false }),

    // Events the user has commented on (distinct)
    supabase
      .from('comments')
      .select('event_id, created_at, event:events(id, title, category, start_datetime, end_datetime, venue_name, is_free, is_user_submitted, submission_status, coordinates)')
      .eq('user_id', user_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
  ]);

  if (savedResult.error) return res.status(500).json({ error: savedResult.error.message });
  if (commentedResult.error) return res.status(500).json({ error: commentedResult.error.message });

  // Dedupe commented events by event_id
  const seen = new Set();
  const commented = commentedResult.data
    .filter((r) => {
      if (!r.event || seen.has(r.event_id)) return false;
      seen.add(r.event_id);
      return true;
    })
    .map((r) => attachCoords(r.event));

  const saved = savedResult.data
    .filter((r) => r.event)
    .map((r) => attachCoords(r.event));

  res.json({ saved, commented });
});

// GET /api/v1/events/:id/groups — public group chats linked to this event
router.get('/events/:id/groups', async (req, res) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, name, is_public, created_at,
      member_count:conversation_members(count),
      creator:users!created_by(id, display_name)
    `)
    .eq('event_id', req.params.id)
    .eq('is_group', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
