const router = require('express').Router();
const supabase = require('../services/supabase');
const { attachCoords } = require('../utils/parseCoordinates');

// Filter out permit/admin entries that aren't real events
const ADMIN_PREFIXES = ['permit -', 'administrative reservation', 'internal hold'];
function filterJunkEvents(events) {
  return events.filter((e) => {
    const t = (e.title || '').toLowerCase();
    return !ADMIN_PREFIXES.some((prefix) => t.startsWith(prefix) || t.includes(prefix));
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/v1/events
// Params: category[], start_date, end_date, q, neighborhood, radius, lat, lng, radius_km, limit, offset
router.get('/', async (req, res) => {
  try {
    const { category, start_date, end_date, date, q, neighborhood, radius, lat, lng, radius_km, limit = 100, offset = 0 } = req.query;
    // date= shorthand: sets both start_date and end_date to the same day
    const effectiveStartDate = start_date || date || null;
    const effectiveEndDate = end_date || date || null;

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
    if (effectiveStartDate) query = query.gte('start_datetime', `${effectiveStartDate}T00:00:00.000Z`);
    if (effectiveEndDate) query = query.lte('start_datetime', `${effectiveEndDate}T23:59:59.999Z`);
    if (q) query = query.ilike('title', `%${q}%`);
    // Only apply neighborhood text filter when no radius — radius is the geo filter;
    // neighborhood text-match is unreliable since most ingested events have null neighborhood
    if (neighborhood && !radius) query = query.ilike('neighborhood', `%${neighborhood}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json(filterJunkEvents(data.map(attachCoords)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/v1/events/within-bounds  (must be before /:id)
// Params: north, south, east, west, category[], start_date, end_date, q, neighborhood, radius (km)
router.get('/within-bounds', async (req, res) => {
  try {
    const { north, south, east, west, category, start_date, end_date, q, neighborhood, radius, radius_lat, radius_lng } = req.query;
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

    // Parse coordinates first so we can do radius filtering
    let results = data.map(attachCoords);

    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      results = results.filter((e) => {
        const evCats = Array.isArray(e.category) ? e.category : [];
        return evCats.some((c) => cats.includes(c));
      });
    }
    if (start_date) {
      const startMs = new Date(`${start_date}T00:00:00.000Z`).getTime();
      results = results.filter((e) => e.start_datetime && new Date(e.start_datetime).getTime() >= startMs);
    }
    if (end_date) {
      const endMs = new Date(`${end_date}T23:59:59.999Z`).getTime();
      results = results.filter((e) => e.start_datetime && new Date(e.start_datetime).getTime() <= endMs);
    }
    if (q) {
      const lower = q.toLowerCase();
      results = results.filter(
        (e) => e.title?.toLowerCase().includes(lower) || e.description?.toLowerCase().includes(lower)
      );
    }
    // When radius is set, filter by distance from the neighborhood center (or explicit center).
    // Neighborhood text filter is ONLY applied if there's no radius — radius is the authoritative
    // geo filter; neighborhood drives the map center + radius origin.
    if (radius) {
      const radiusKm = parseFloat(radius);
      const centerLat = radius_lat ? parseFloat(radius_lat) : (parseFloat(north) + parseFloat(south)) / 2;
      const centerLng = radius_lng ? parseFloat(radius_lng) : (parseFloat(east) + parseFloat(west)) / 2;
      results = results.filter((e) => {
        if (!e.coordinates?.coordinates) return false;
        const [lng, lat] = e.coordinates.coordinates;
        return haversineKm(centerLat, centerLng, lat, lng) <= radiusKm;
      });
    } else if (neighborhood) {
      // Only text-match neighborhood when no radius — many events have null/inconsistent neighborhood
      const nbLower = neighborhood.toLowerCase();
      results = results.filter((e) => e.neighborhood?.toLowerCase().includes(nbLower));
    }

    res.json(filterJunkEvents(results));
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
module.exports.filterJunkEvents = filterJunkEvents;
