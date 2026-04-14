/**
 * Itinerary Agent
 * Given selected events, arranges them into a logical day itinerary.
 * Times and durations are computed SERVER-SIDE from actual event data —
 * Claude only generates descriptions and travel suggestions.
 */

const { callClaudeJSON } = require('../orchestrator');

const SYSTEM_PROMPT = `You are an expert at building perfect day itineraries in Chicago.
You arrange events in logical geographic order to minimize travel.
You suggest the best time to arrive at each event.
You fill gaps with specific neighborhood suggestions — coffee, lunch, etc.
You write in a warm, practical tone and account for weather.
You respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`;

/**
 * Format a datetime string to Chicago local time: "7:00 PM"
 */
function formatChicagoTime(isoStr) {
  if (!isoStr) return null;
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Chicago',
    });
  } catch {
    return null;
  }
}

/**
 * Calculate duration in minutes between two ISO datetime strings.
 * Returns null if either is missing.
 */
function calcDurationMinutes(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0 || isNaN(ms)) return null;
  return Math.round(ms / 60000);
}

/**
 * Format duration minutes into a readable string: "2h", "90m", "1h 30m"
 */
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

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

  // Pre-compute times and durations from real event data
  const eventsWithTimes = selectedEvents
    .map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      time: formatChicagoTime(e.start_datetime) || 'TBD',
      duration_minutes: calcDurationMinutes(e.start_datetime, e.end_datetime),
      duration_label: formatDuration(calcDurationMinutes(e.start_datetime, e.end_datetime)),
      venue_name: e.venue_name,
      address: e.address,
      neighborhood: e.neighborhood,
      is_outdoor: e.is_outdoor,
      description: e.description?.slice(0, 200),
      coordinates: e.coordinates?.coordinates,
    }))
    // Sort by actual start time
    .sort((a, b) => {
      if (!a.start_datetime || !b.start_datetime) return 0;
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });

  const userMessage = JSON.stringify({
    selectedEvents: eventsWithTimes,
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
    instructions: `Build an itinerary for these events. IMPORTANT: each event already has a pre-computed "time" field (e.g. "7:00 PM") and "duration_minutes" — use those EXACTLY, do not generate your own times. You may add "suggestion" stops (lunch, coffee) between events with your own times. Return JSON:
{
  "itinerary": [
    {
      "type": "event",
      "time": "USE THE EVENT's time FIELD EXACTLY",
      "duration_minutes": USE_EVENT_duration_minutes_OR_null,
      "event_id": "the event id",
      "title": "event title",
      "description": "1-2 sentence tip about this event",
      "travel_to_next": { "duration_minutes": 15, "mode": "walking", "note": "short walk" } or null
    }
  ],
  "total_duration_hours": 5.5,
  "total_distance_km": 3.0,
  "summary": "2-3 sentence overview"
}`,
  });

  try {
    const result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, { maxTokens: 2500 });

    // Safety: override times with our pre-computed values in case Claude ignored them
    if (result.itinerary && Array.isArray(result.itinerary)) {
      for (const stop of result.itinerary) {
        if (stop.type === 'event' && stop.event_id) {
          const source = eventsWithTimes.find((e) => e.id === stop.event_id);
          if (source) {
            stop.time = source.time;
            stop.duration_minutes = source.duration_minutes;
          }
        }
      }
    }

    return result;
  } catch (err) {
    console.error('Itinerary agent error:', err.message);
    // Fallback: return events in time order with real times
    return {
      itinerary: eventsWithTimes.map((e) => ({
        type: 'event',
        time: e.time,
        duration_minutes: e.duration_minutes,
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
