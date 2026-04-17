/**
 * Recommendation Agent
 * Given user preferences, their location, weekend weather, and candidate events —
 * returns 3-5 curated picks with personal reasons and fit scores.
 *
 * Caches results per userId+date for 2 hours.
 */

const { callClaudeJSON } = require('../orchestrator');

// In-memory cache: key = "userId:date" → { data, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const SYSTEM_PROMPT = `You are a knowledgeable local friend in Chicago who knows every event happening this weekend.
You give warm, specific, personal recommendations — not generic suggestions.
You consider weather, distance, the user's group type, budget, and what they actually enjoy.
You explain your picks in one friendly sentence each, like a friend would.
You never recommend outdoor events when it's raining or precipitation chance is above 50%.
You always consider travel time between events if suggesting multiple.
You respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`;

/**
 * generateRecommendations(params)
 * params: {
 *   userId,
 *   userPreferences,    // { categories, max_distance_km, budget, group_size, mobility, avoid }
 *   homeLocation,       // { lat, lng } or null
 *   targetDate,         // 'YYYY-MM-DD'
 *   weatherData,        // result from weather service or null
 *   availableEvents[]   // up to 30 candidate events
 * }
 *
 * Returns: {
 *   recommendations: [{ event_id, reason, fit_score, weather_note, suggested_time }],
 *   day_summary,
 *   weather_advisory
 * }
 */
async function generateRecommendations(params) {
  const { userId, userPreferences, homeLocation, targetDate, weatherData, availableEvents } = params;

  const cacheKey = `${userId}:${targetDate}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  if (!availableEvents?.length) {
    return {
      recommendations: [],
      day_summary: "We couldn't find events matching your preferences for this date.",
      weather_advisory: null,
    };
  }

  // Trim events to relevant fields to keep the prompt concise
  const eventSummaries = availableEvents.slice(0, 30).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    start_datetime: e.start_datetime,
    venue_name: e.venue_name,
    address: e.address,
    neighborhood: e.neighborhood,
    is_free: e.is_free,
    price_min: e.price_min,
    is_outdoor: e.is_outdoor,
    description: e.description?.slice(0, 200),
  }));

  const userMessage = JSON.stringify({
    userPreferences,
    homeLocation,
    targetDate,
    weather: weatherData
      ? {
          condition: weatherData.condition,
          tempHighF: weatherData.tempHighF,
          precipitationChance: weatherData.precipitationChance,
          summary: weatherData.summary,
          outdoorSuitable: weatherData.outdoorSuitable,
        }
      : null,
    availableEvents: eventSummaries,
    instructions: `Based on the user's preferences and today's weather, pick 3-5 events from availableEvents that you'd genuinely recommend to this person. Return JSON matching this exact schema:
{
  "recommendations": [
    {
      "event_id": "uuid from the event",
      "reason": "one warm, specific sentence explaining why this fits them",
      "fit_score": 85,
      "weather_note": "Great weather for this outdoor event" or null,
      "suggested_time": "Arrive early — gets busy by noon" or null
    }
  ],
  "day_summary": "A friendly 2-3 sentence overview of the day you're suggesting",
  "weather_advisory": "Rain expected after 3pm — plan indoor activities for the evening" or null
}`,
  });

  try {
    const result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 1500,
    });
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.error('Recommendation agent error:', err.message);
    return {
      recommendations: [],
      day_summary: 'We had trouble generating personalized picks right now. Browse events below.',
      weather_advisory: null,
    };
  }
}

module.exports = { generateRecommendations };
