const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');
const { attachCoords } = require('../utils/parseCoordinates');

// ── GET /api/v1/trips/:id — public trip view (no auth if is_public) ────────
router.get('/:id', async (req, res) => {
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      id, name, date, is_public, user_id, created_at,
      owner:users!user_id(id, display_name, avatar_url),
      trip_events(
        id, position, note,
        event:events(id, title, category, start_datetime, end_datetime, venue_name, address, is_free, coordinates)
      )
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !trip) return res.status(404).json({ error: 'Trip not found' });

  // Check auth for private trips
  if (!trip.is_public) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ error: 'This trip is private' });
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || user.id !== trip.user_id) {
      return res.status(403).json({ error: 'This trip is private' });
    }
  }

  // Sort events by position, attach coordinates
  const events = (trip.trip_events || [])
    .sort((a, b) => a.position - b.position)
    .map((te) => ({ ...te, event: te.event ? attachCoords(te.event) : null }));

  res.json({ ...trip, trip_events: events });
});

// All routes below require auth
router.use(checkAuth);

// ── GET /api/v1/me/trips ───────────────────────────────────────────────────
router.get('/me/list', async (req, res) => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id, name, date, is_public, created_at,
      trip_events(count)
    `)
    .eq('user_id', req.user.id)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST /api/v1/trips — create a new trip ─────────────────────────────────
router.post('/', async (req, res) => {
  const { name = 'My Day Trip', date, is_public = false } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const { data, error } = await supabase
    .from('trips')
    .insert({ user_id: req.user.id, name, date, is_public })
    .select('id, name, date, is_public')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── PUT /api/v1/trips/:id — update trip metadata ───────────────────────────
router.put('/:id', async (req, res) => {
  const { name, is_public } = req.body;

  const { error } = await supabase
    .from('trips')
    .update({ name, is_public, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── DELETE /api/v1/trips/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST /api/v1/trips/:id/events — add event to trip ─────────────────────
router.post('/:id/events', async (req, res) => {
  const { event_id, note } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });

  // Verify ownership
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (!trip) return res.status(403).json({ error: 'Not your trip' });

  // Get current max position
  const { data: existing } = await supabase
    .from('trip_events')
    .select('position')
    .eq('trip_id', req.params.id)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing?.length ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('trip_events')
    .insert({ trip_id: req.params.id, event_id, position, note: note || null })
    .select('id, position')
    .single();

  if (error?.code === '23505') return res.status(409).json({ error: 'Event already in this trip' });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── DELETE /api/v1/trips/:id/events/:event_id ─────────────────────────────
router.delete('/:id/events/:event_id', async (req, res) => {
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (!trip) return res.status(403).json({ error: 'Not your trip' });

  const { error } = await supabase
    .from('trip_events')
    .delete()
    .eq('trip_id', req.params.id)
    .eq('event_id', req.params.event_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── PUT /api/v1/trips/:id/events/reorder ──────────────────────────────────
// Body: { order: [event_id, event_id, ...] }
router.put('/:id/events/reorder', async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of event_ids' });

  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (!trip) return res.status(403).json({ error: 'Not your trip' });

  // Update each position
  await Promise.all(
    order.map((event_id, position) =>
      supabase
        .from('trip_events')
        .update({ position })
        .eq('trip_id', req.params.id)
        .eq('event_id', event_id)
    )
  );

  res.json({ ok: true });
});

module.exports = router;
