/**
 * Itinerary Agent
 * Given selected events, arranges them into a logical day itinerary:
 *   - Geographic ordering to minimize travel
 *   - Realistic buffer time between events
 *   - Arrival tips (come early, peak time, etc.)
 *   - Filler suggestions (coffee, lunch spots) between events
 *   - Weather-aware notes
 *
 * No caching here — itinerary is user-driven and inputs vary.
 */

const { callClaudeJSON } = require('../orchestrator');

const SYSTEM_PROMPT = `You are an expert at building perfect day itineraries in Chicago.
You arrange events in logical geographic order to minimize travel.
You add realistic buffer time between events.
You suggest the best time to arrive at each event (before crowds, at peak atmosphere, etc.).
You fill gaps with specific neighborhood suggestions — a coffee shop between events, a good lunch spot nearby.
You write in a warm, practical tone.
You account for weather — if rain is expected, note it for outdoor stops.
You respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`;

/**
 * buildItinerary(params)
 * params: {
 *   selectedEvents[],   // full event objects user wants to attend
 *   homeLocation,       // { lat, lng } or null
 *   date,               // 'YYYY-MM-DD'
 *   weatherData,        // from weather service or null
 *   mobility,           // 'walking'|'driving'|'transit'
 *   groupType           // 'solo'|'couple'|'family'|'group'
 * }
 *
 * Returns: {
 *   itinerary: [{ type, time, duration_minutes, event_id, title, description, travel_to_next }],
 *   total_duration_hours,
 *   total_distance_km,
 *   summary
 * }
 */
async function buildItinerary(params) {
  const { selectedEvents, homeLocation, date, weatherData, mobility, groupType } = params;

  if (!selectedEvents?.length) {
    return {
      itinerary: [],
      total_duration_hours: 0,
      total_distance_km: 0,
      summary: 'No events selected.',
    };
  }

  const eventSummaries = selectedEvents.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    start_datetime: e.start_datetime,
    end_datetime: e.end_datetime,
    venue_name: e.venue_name,
    address: e.address,
    neighborhood: e.neighborhood,
    is_outdoor: e.is_outdoor,
    description: e.description?.slice(0, 300),
    coordinates: e.coordinates?.coordinates,
  }));

  const userMessage = JSON.stringify({
    selectedEvents: eventSummaries,
    homeLocation,
    date,
    mobility: mobility || 'driving',
    groupType: groupType || 'solo',
    weather: weatherData
      ? {
          condition: weatherData.condition,
          tempHighF: weatherData.tempHighF,
          precipitationChance: weatherData.precipitationChance,
          summary: weatherData.summary,
        }
      : null,
    instructions: `Build a complete day itinerary for these events. Return JSON matching this exact schema:
{
  "itinerary": [
    {
      "type": "event",
      "time": "9:00 AM",
      "duration_minutes": 90,
      "event_id": "uuid or null for suggestions",
      "title": "Event or suggestion title",
      "description": "Warm, practical 1-2 sentence tip",
      "travel_to_next": {
        "duration_minutes": 18,
        "mode": "walking",
        "note": "Pleasant walk through Lincoln Park"
      }
    }
  ],
  "total_duration_hours": 7.5,
  "total_distance_km": 4.2,
  "summary": "Warm 2-3 sentence overview of the full day"
}
Note: type is "event" for actual events from the list, "suggestion" for your added recommendations (coffee, lunch, etc.), "travel" is not needed — use travel_to_next instead. travel_to_next can be null for the last stop.`,
  });

  try {
    const result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, { maxTokens: 2500 });
    return result;
  } catch (err) {
    console.error('Itinerary agent error:', err.message);
    return {
      itinerary: selectedEvents.map((e, i) => ({
        type: 'event',
        time: e.start_datetime
          ? new Date(e.start_datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : `Stop ${i + 1}`,
        duration_minutes: 90,
        event_id: e.id,
        title: e.title,
        description: e.venue_name || '',
        travel_to_next: null,
      })),
      total_duration_hours: 0,
      total_distance_km: 0,
      summary: 'Here are your selected events for the day.',
    };
  }
}

module.exports = { buildItinerary };
