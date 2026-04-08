const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');
const { getWeatherForDate } = require('../services/weather');
const { buildItinerary } = require('../services/ai/agents/itineraryAgent');
const { attachCoords } = require('../utils/parseCoordinates');
const crypto = require('crypto');

// POST /api/v1/itinerary/build
// Build an AI itinerary from a list of event IDs + user preferences
router.post('/build', checkAuth, async (req, res) => {
  const { event_ids, date, preferences } = req.body;

  if (!event_ids?.length) return res.status(400).json({ error: 'event_ids required' });
  if (!date) return res.status(400).json({ error: 'date required' });

  // Fetch full event objects
  const { data: rawEvents, error: evErr } = await supabase
    .from('events')
    .select('*')
    .in('id', event_ids);

  if (evErr) return res.status(500).json({ error: 'Failed to fetch events' });
  const events = (rawEvents || []).map(attachCoords);

  // Fetch user preferences + home location
  const { data: userRow } = await supabase
    .from('users')
    .select('preferences, home_location')
    .eq('id', req.user.id)
    .single();

  const prefs = preferences || userRow?.preferences || {};
  const homeCoords = userRow?.home_location
    ? (() => {
        const c = attachCoords({ coordinates: userRow.home_location });
        return c.coordinates?.coordinates
          ? { lat: c.coordinates.coordinates[1], lng: c.coordinates.coordinates[0] }
          : null;
      })()
    : null;

  // Fetch weather
  let weatherData = null;
  try {
    const lat = homeCoords?.lat ?? 41.8781;
    const lng = homeCoords?.lng ?? -87.6298;
    weatherData = await getWeatherForDate(lat, lng, date);
  } catch {
    // non-fatal
  }

  const itinerary = await buildItinerary({
    selectedEvents: events,
    homeLocation: homeCoords,
    date,
    weatherData,
    mobility: prefs.mobility || 'driving',
    groupType: prefs.group_size || 'solo',
  });

  res.json({ itinerary, weather: weatherData });
});

// GET /api/v1/itinerary/mine
// List user's saved itineraries
router.get('/mine', checkAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('saved_itineraries')
    .select('id, date, title, event_ids, is_public, share_token, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/v1/itinerary
// Save an itinerary
router.post('/', checkAuth, async (req, res) => {
  const { date, title, itinerary_data, event_ids, is_public } = req.body;

  if (!date || !itinerary_data) return res.status(400).json({ error: 'date and itinerary_data required' });

  const share_token = is_public
    ? crypto.randomBytes(4).toString('hex') // 8-char hex token
    : null;

  const { data, error } = await supabase
    .from('saved_itineraries')
    .insert({
      user_id: req.user.id,
      date,
      title: title || `My Day — ${date}`,
      itinerary_data,
      event_ids: event_ids || [],
      is_public: !!is_public,
      share_token,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/v1/itinerary/:id
// Update saved itinerary
router.put('/:id', checkAuth, async (req, res) => {
  const { title, is_public } = req.body;

  // Verify ownership
  const { data: existing } = await supabase
    .from('saved_itineraries')
    .select('user_id, share_token')
    .eq('id', req.params.id)
    .single();

  if (!existing || existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (is_public !== undefined) {
    updates.is_public = is_public;
    if (is_public && !existing.share_token) {
      updates.share_token = crypto.randomBytes(4).toString('hex');
    }
  }

  const { data, error } = await supabase
    .from('saved_itineraries')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/v1/itinerary/share/:token — public, no auth
router.get('/share/:token', async (req, res) => {
  const { data, error } = await supabase
    .from('saved_itineraries')
    .select('*')
    .eq('share_token', req.params.token)
    .eq('is_public', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Itinerary not found' });
  res.json(data);
});

module.exports = router;
