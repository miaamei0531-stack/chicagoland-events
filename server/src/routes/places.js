const router = require('express').Router();
const supabase = require('../services/supabase');
const { attachCoords } = require('../utils/parseCoordinates');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/v1/places
// Params: category[], lat, lng, radius_km, q, limit, offset
router.get('/', async (req, res) => {
  try {
    const { category, lat, lng, radius_km, q, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('places')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false, nullsFirst: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      query = query.overlaps('category', cats);
    }
    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data.map(attachCoords);

    // Radius filter
    if (lat && lng && radius_km) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const radiusKm = parseFloat(radius_km);
      results = results.filter((p) => {
        if (!p.coordinates?.coordinates) return false;
        const [pLng, pLat] = p.coordinates.coordinates;
        return haversineKm(centerLat, centerLng, pLat, pLng) <= radiusKm;
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// GET /api/v1/places/within-bounds
router.get('/within-bounds', async (req, res) => {
  try {
    const { north, south, east, west, category } = req.query;
    if (!north || !south || !east || !west) {
      return res.status(400).json({ error: 'north, south, east, west are required' });
    }

    // Use a simple bounding box query since places don't have an RPC yet
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    let results = data.map(attachCoords).filter((p) => {
      if (!p.coordinates?.coordinates) return false;
      const [lng, lat] = p.coordinates.coordinates;
      return lat >= parseFloat(south) && lat <= parseFloat(north) &&
             lng >= parseFloat(west) && lng <= parseFloat(east);
    });

    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      results = results.filter((p) => {
        const pCats = Array.isArray(p.category) ? p.category : [];
        return pCats.some((c) => cats.includes(c));
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch places within bounds' });
  }
});

// GET /api/v1/places/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Place not found' });

    res.json(attachCoords(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch place' });
  }
});

module.exports = router;
