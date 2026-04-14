const router = require('express').Router();
const supabase = require('../services/supabase');
const { checkAuth } = require('../middleware/auth');
const { getWeatherForDate } = require('../services/weather');
const { generateRecommendations } = require('../services/ai/agents/recommendationAgent');
const { attachCoords } = require('../utils/parseCoordinates');

const CHICAGO_LAT = 41.8781;
const CHICAGO_LNG = -87.6298;

// Haversine distance in km
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/v1/recommendations?date=saturday|sunday|YYYY-MM-DD
// Auth required — uses the user's stored preferences
router.get('/', checkAuth, async (req, res) => {
  const userId = req.user.id;

  // 1. Resolve target date
  let targetDate;
  const { date } = req.query;
  const today = new Date();

  if (!date || date === 'saturday') {
    const day = today.getDay();
    const daysUntilSat = day === 6 ? 0 : 6 - day;
    const sat = new Date(today);
    sat.setDate(today.getDate() + daysUntilSat);
    targetDate = sat.toISOString().split('T')[0];
  } else if (date === 'sunday') {
    const day = today.getDay();
    const daysUntilSun = day === 0 ? 0 : 7 - day;
    const sun = new Date(today);
    sun.setDate(today.getDate() + daysUntilSun);
    targetDate = sun.toISOString().split('T')[0];
  } else {
    targetDate = date;
  }

  // 2. Fetch user preferences + home location
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('preferences, home_location, home_address')
    .eq('id', userId)
    .single();

  if (userErr) return res.status(404).json({ error: 'User not found' });

  const prefs = userRow.preferences || {};
  const homeRow = attachCoords({ coordinates: userRow.home_location });
  const homeLat = homeRow.coordinates?.coordinates?.[1] ?? CHICAGO_LAT;
  const homeLng = homeRow.coordinates?.coordinates?.[0] ?? CHICAGO_LNG;
  const maxDistanceKm = prefs.max_distance_km || 15;

  // 3. Fetch weather for target date at home location
  let weatherData = null;
  try {
    weatherData = await getWeatherForDate(homeLat, homeLng, targetDate);
  } catch {
    // Non-fatal
  }

  // 4. Query events for that date matching user's categories
  const startOfDay = `${targetDate}T00:00:00.000Z`;
  const endOfDay = `${targetDate}T23:59:59.999Z`;

  let query = supabase
    .from('events')
    .select('*')
    .in('submission_status', ['ingested', 'approved'])
    .eq('is_active', true)
    .gte('start_datetime', startOfDay)
    .lte('start_datetime', endOfDay)
    .limit(100);

  if (prefs.categories?.length) {
    query = query.overlaps('category', prefs.categories);
  }

  const { data: rawEvents } = await query;
  const events = (rawEvents || []).map(attachCoords);

  // 5. Filter by distance from home
  const nearbyEvents = events.filter((e) => {
    const coords = e.coordinates?.coordinates;
    if (!coords) return true; // keep if no coordinates
    const [eLng, eLat] = coords;
    return haversineKm(homeLat, homeLng, eLat, eLng) <= maxDistanceKm;
  });

  // 6. Call recommendation agent
  const result = await generateRecommendations({
    userId,
    userPreferences: prefs,
    homeLocation: { lat: homeLat, lng: homeLng },
    targetDate,
    weatherData,
    availableEvents: nearbyEvents,
  });

  // 7. Attach full event objects to each recommendation
  const eventMap = {};
  nearbyEvents.forEach((e) => { eventMap[e.id] = e; });

  const enriched = result.recommendations.map((rec) => ({
    ...rec,
    event: eventMap[rec.event_id] || null,
  })).filter((rec) => rec.event !== null);

  res.json({
    date: targetDate,
    weather: weatherData,
    recommendations: enriched,
    day_summary: result.day_summary,
    weather_advisory: result.weather_advisory,
  });
});

module.exports = router;
