const router = require('express').Router();
const supabase = require('../services/supabase');
const { attachCoords } = require('../utils/parseCoordinates');

// GET /api/v1/events
// Params: category[], start_date, end_date, q, lat, lng, radius_km, limit, offset
router.get('/', async (req, res) => {
  try {
    const { category, start_date, end_date, q, lat, lng, radius_km, limit = 100, offset = 0 } = req.query;

    // Radius search — use PostGIS ST_DWithin via RPC
    if (lat && lng && radius_km) {
      const { data, error } = await supabase.rpc('events_within_radius', {
        p_lat: parseFloat(lat),
        p_lng: parseFloat(lng),
        p_radius_km: parseFloat(radius_km),
      });
      if (error) throw error;
      return res.json(data.map(attachCoords));
    }

    let query = supabase
      .from('events')
      .select('*')
      .in('submission_status', ['ingested', 'approved'])
      .eq('is_active', true)
      .order('start_datetime', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      query = query.overlaps('category', cats);
    }
    if (start_date) query = query.gte('start_datetime', start_date);
    if (end_date) query = query.lte('start_datetime', end_date);
    if (q) query = query.ilike('title', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data.map(attachCoords));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/v1/events/within-bounds  (must be before /:id)
// Params: north, south, east, west, category[], start_date, end_date, q
router.get('/within-bounds', async (req, res) => {
  try {
    const { north, south, east, west, category, start_date, end_date, q } = req.query;
    if (!north || !south || !east || !west) {
      return res.status(400).json({ error: 'north, south, east, west are required' });
    }

    const { data, error } = await supabase.rpc('events_within_bounds', {
      p_north: parseFloat(north),
      p_south: parseFloat(south),
      p_east: parseFloat(east),
      p_west: parseFloat(west),
    });

    if (error) throw error;

    // Apply filters in JS after spatial query (simpler than a second RPC)
    let results = data;
    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      results = results.filter((e) => e.category?.some((c) => cats.includes(c)));
    }
    if (start_date) results = results.filter((e) => e.start_datetime >= start_date);
    if (end_date) results = results.filter((e) => e.start_datetime <= end_date + 'T23:59:59Z');
    if (q) {
      const lower = q.toLowerCase();
      results = results.filter(
        (e) => e.title?.toLowerCase().includes(lower) || e.description?.toLowerCase().includes(lower)
      );
    }

    res.json(results.map(attachCoords));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events within bounds' });
  }
});

// GET /api/v1/events/:id  (must be after /within-bounds)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Event not found' });

    res.json(attachCoords(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

module.exports = router;
