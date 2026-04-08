const router = require('express').Router();
const { getWeatherForDate, getWeekendWeather } = require('../services/weather');

const CHICAGO_LAT = 41.8781;
const CHICAGO_LNG = -87.6298;

// GET /api/v1/weather?lat=&lng=&date=YYYY-MM-DD
// Returns weather for a specific date and location.
// Falls back to Chicago center if lat/lng not provided.
router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat) || CHICAGO_LAT;
  const lng = parseFloat(req.query.lng) || CHICAGO_LNG;
  const { date } = req.query;

  try {
    if (date) {
      const weather = await getWeatherForDate(lat, lng, date);
      return res.json(weather);
    }
    // No date → return this weekend's forecast
    const weekend = await getWeekendWeather(lat, lng);
    res.json(weekend);
  } catch (err) {
    console.error('Weather fetch error:', err.message);
    res.status(503).json({ error: 'Weather data unavailable' });
  }
});

module.exports = router;
