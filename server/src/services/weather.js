/**
 * Weather service using Open-Meteo API (free, no API key required)
 * Caches results in-memory for 1 hour to avoid hammering the API.
 */

const CHICAGO_LAT = 41.8781;
const CHICAGO_LNG = -87.6298;

// In-memory cache: key = "lat,lng,date" → { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// WMO weather code → { condition, emoji }
function interpretWeatherCode(code) {
  if (code === 0) return { condition: 'sunny', emoji: '☀️' };
  if (code <= 2) return { condition: 'cloudy', emoji: '⛅' };
  if (code === 3) return { condition: 'cloudy', emoji: '☁️' };
  if (code <= 49) return { condition: 'foggy', emoji: '🌫️' };
  if (code <= 57) return { condition: 'drizzle', emoji: '🌦️' };
  if (code <= 67) return { condition: 'rainy', emoji: '🌧️' };
  if (code <= 77) return { condition: 'snowy', emoji: '❄️' };
  if (code <= 82) return { condition: 'rainy', emoji: '🌧️' };
  if (code <= 86) return { condition: 'snowy', emoji: '🌨️' };
  if (code <= 99) return { condition: 'stormy', emoji: '⛈️' };
  return { condition: 'unknown', emoji: '🌤️' };
}

function celsiusToFahrenheit(c) {
  return Math.round((c * 9) / 5 + 32);
}

function buildSummary(condition, tempHighF, precipChance) {
  if (condition === 'sunny' && tempHighF >= 65) return `Sunny and warm — perfect for outdoors`;
  if (condition === 'sunny' && tempHighF >= 50) return `Clear skies and pleasant`;
  if (condition === 'sunny') return `Sunny but cool — dress in layers`;
  if (condition === 'cloudy') return `Cloudy but dry`;
  if (['rainy', 'drizzle', 'stormy'].includes(condition)) return `Rain expected — check before you go`;
  if (condition === 'snowy') return `Snow expected — plan accordingly`;
  if (precipChance >= 50) return `Rain likely (${precipChance}% chance)`;
  return `Mild conditions`;
}

/**
 * getWeatherForDate(lat, lng, date)
 * date: 'YYYY-MM-DD' string
 */
async function getWeatherForDate(lat = CHICAGO_LAT, lng = CHICAGO_LNG, date) {
  const cacheKey = `${lat},${lng},${date}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lng);
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max');
  url.searchParams.set('timezone', 'America/Chicago');
  url.searchParams.set('forecast_days', '7');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Open-Meteo API error ${res.status}`);
  const json = await res.json();

  const daily = json.daily;
  const dateIndex = daily.time.indexOf(date);
  if (dateIndex === -1) {
    throw new Error(`No forecast data for date: ${date}`);
  }

  const weatherCode = daily.weathercode[dateIndex];
  const { condition, emoji } = interpretWeatherCode(weatherCode);
  const tempHighF = celsiusToFahrenheit(daily.temperature_2m_max[dateIndex]);
  const tempLowF = celsiusToFahrenheit(daily.temperature_2m_min[dateIndex]);
  const precipitationChance = daily.precipitation_probability_max[dateIndex] ?? 0;
  const windspeedKph = daily.windspeed_10m_max[dateIndex] ?? 0;

  const outdoorSuitable = precipitationChance < 30 && tempHighF > 40;

  const result = {
    date,
    condition,
    emoji,
    tempHighF,
    tempLowF,
    precipitationChance,
    windspeedKph,
    weatherCode,
    summary: buildSummary(condition, tempHighF, precipitationChance),
    outdoorSuitable,
  };

  cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

/**
 * getWeekendWeather(lat, lng)
 * Returns weather for the upcoming Saturday and Sunday.
 */
async function getWeekendWeather(lat = CHICAGO_LAT, lng = CHICAGO_LNG) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  // Days until Saturday
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek);
  const daysUntilSun = dayOfWeek === 0 ? 0 : (7 - dayOfWeek);

  function dateStr(daysAhead) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }

  const [saturday, sunday] = await Promise.all([
    getWeatherForDate(lat, lng, dateStr(daysUntilSat)),
    getWeatherForDate(lat, lng, dateStr(daysUntilSun)),
  ]);

  return { saturday, sunday };
}

module.exports = { getWeatherForDate, getWeekendWeather };
