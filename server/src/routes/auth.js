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

// GET /api/v1/auth/preferences
// Returns the current user's preferences and home_location
router.get('/preferences', checkAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('preferences, home_address, home_location, onboarding_complete')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// PUT /api/v1/auth/preferences
// Saves user preferences and optional home location
router.put('/preferences', checkAuth, async (req, res) => {
  const { preferences, home_address } = req.body;

  const updates = { onboarding_complete: true };
  if (preferences !== undefined) updates.preferences = preferences;
  if (home_address !== undefined) updates.home_address = home_address;

  // Geocode home_address to home_location if provided
  if (home_address) {
    const token = process.env.MAPBOX_SECRET_TOKEN;
    if (token) {
      try {
        const encoded = encodeURIComponent(home_address);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=us&bbox=-88.5,41.5,-87.5,42.5&access_token=${token}`;
        const geoRes = await fetch(url);
        const geoData = await geoRes.json();
        const feature = geoData.features?.[0];
        if (feature) {
          const [lng, lat] = feature.center;
          updates.home_location = `POINT(${lng} ${lat})`;
          updates.home_address = feature.place_name;
        }
      } catch (err) {
        console.error('Home geocoding error:', err);
        // Continue without geocoding — non-fatal
      }
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select('preferences, home_address, home_location, onboarding_complete')
    .single();

  if (error) {
    console.error('Preferences update error:', error);
    return res.status(500).json({ error: 'Failed to save preferences' });
  }
  res.json(data);
});

// GET /api/v1/auth/users/search?q=...
// Search users by display_name for adding to conversations
router.get('/users/search', checkAuth, async (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json([]);

  // Get block lists in both directions
  const { data: blocks } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${req.user.id},blocked_id.eq.${req.user.id}`);

  const blockedIds = (blocks || []).map((b) =>
    b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
  );

  let query = supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q.trim()}%`)
    .neq('id', req.user.id)
    .eq('is_banned', false)
    .limit(10);

  if (blockedIds.length) query = query.not('id', 'in', `(${blockedIds.join(',')})`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
