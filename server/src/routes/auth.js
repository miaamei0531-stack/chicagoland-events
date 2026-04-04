const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');

// POST /api/v1/auth/sync
// Called by the client on every login to upsert the user record
router.post('/sync', async (req, res) => {
  const { id, email, display_name, avatar_url } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: 'id and email are required' });
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(
      { id, email, display_name, avatar_url, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.error('User sync error:', error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }

  res.json(data);
});

// GET /api/v1/auth/me
// Returns the current user's profile from our users table
router.get('/me', checkAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// POST /api/v1/auth/geocode
// Proxy to Mapbox Geocoding API — keeps MAPBOX_SECRET_TOKEN server-side
router.post('/geocode', checkAuth, async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address is required' });

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) return res.status(500).json({ error: 'Mapbox token not configured' });

  const encoded = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=us&bbox=-88.5,41.5,-87.5,42.2&access_token=${token}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const feature = data.features?.[0];
    if (!feature) return res.status(404).json({ error: 'Address not found' });

    const [lng, lat] = feature.center;
    res.json({
      lat,
      lng,
      formatted_address: feature.place_name,
    });
  } catch (err) {
    console.error('Geocoding error:', err);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

module.exports = router;
