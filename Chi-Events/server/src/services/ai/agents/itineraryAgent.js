/**
 * Itinerary Agent
 * Builds a day itinerary from selected events with:
 * - Real start times (formatted server-side, never invented by AI)
 * - Travel time between consecutive stops
 * - Suggestion stops in 90+ minute gaps
 * - Scheduling conflict warnings
 */

const { callClaudeJSON } = require('../orchestrator');

const SYSTEM_PROMPT = `You are an expert Chicago day trip planner.
You receive a list of events the user wants to attend on a specific day, already sorted by start time.

Your job:
1. Use the ACTUAL start times from the events — never change them or invent new times. Each event has a "start_time" field like "7:00 PM" — use it EXACTLY.
2. Calculate realistic travel time between each consecutive event using your knowledge of Chicago geography and venues. Assume driving unless venues are walkable (< 1 mile apart). Be specific: "18 min drive via I-90" or "12 min walk through Lincoln Park".
3. Check if there are gaps of 90+ minutes between events. If so, insert ONE practical suggestion (a specific real coffee shop, restaurant, or short activity in that neighborhood). Keep suggestions brief — name the actual place if you know one nearby.
4. Flag any scheduling conflicts where travel time makes an event unreachable.
5. Write a one-line day summary at the top.

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "summary": "A one-line overview of the day",
  "stops": [
    {
      "type": "event",
      "time": "3:00 PM",
      "title": "Event Title",
      "venue": "Venue Name",
      "description": "Brief practical tip",
      "travel_to_next": {
        "duration": "18 min",
        "mode": "drive",
        "note": "Take Lake Shore Drive south"
      }
    },
    {
      "type": "suggestion",
      "time": "4:30 PM",
      "title": "Coffee at Intelligentsia",
      "venue": "Intelligentsia Coffee, Millennium Park",
      "description": "Great spot to kill 45 min before the next event",
      "travel_to_next": {
        "duration": "8 min walk",
        "mode": "walk",
        "note": "Head east on Randolph"
      }
    }
  ],
  "warnings": ["The 5 PM and 5:15 PM events overlap — you may need to skip one"]
}`;

/**
 * Format a datetime to Chicago local time: "7:00 PM"
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

async function buildItinerary(params) {
  const { selectedEvents, homeLocation, date, weatherData, mobility, groupType } = params;

  if (!selectedEvents?.length) {
    return { summary: 'No events selected.', stops: [], warnings: [] };
  }

  // Sort by start_datetime and format times server-side
  const sorted = [...selectedEvents].sort((a, b) => {
    if (!a.start_datetime || !b.start_datetime) return 0;
    return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
  });

  const eventsForAI = sorted.map((e) => ({
    title: e.title,
    venue: e.venue_name || null,
    address: e.address || null,
    start_time: formatChicagoTime(e.start_datetime) || 'TBD',
    end_time: formatChicagoTime(e.end_datetime) || null,
    category: Array.isArray(e.category) ? e.category[0] : e.category,
    event_id: e.id,
  }));

  const weatherSummary = weatherData
    ? `${weatherData.tempHighF}°F, ${weatherData.summary}`
    : null;

  const userMessage = JSON.stringify({
    events: eventsForAI,
    date,
    weather: weatherSummary,
    user_mobility: mobility || 'driving',
  });

  try {
    const result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, { maxTokens: 2500 });

    // Safety: override event stop times with our server-formatted values
    if (result.stops && Array.isArray(result.stops)) {
      for (const stop of result.stops) {
        if (stop.type === 'event') {
          const match = eventsForAI.find(
            (e) => e.title === stop.title || e.event_id === stop.event_id
          );
          if (match) {
            stop.time = match.start_time;
            stop.event_id = match.event_id;
          }
        }
      }
    }

    return {
      summary: result.summary || '',
      stops: result.stops || [],
      warnings: result.warnings || [],
    };
  } catch (err) {
    console.error('Itinerary agent error:', err.message);
    // Fallback: return events in time order with no travel/suggestions
    return {
      summary: `${sorted.length} events for the day.`,
      stops: sorted.map((e) => ({
        type: 'event',
        time: formatChicagoTime(e.start_datetime) || 'TBD',
        title: e.title,
        venue: e.venue_name || null,
        description: e.address || '',
        event_id: e.id,
        travel_to_next: null,
      })),
      warnings: ['AI itinerary builder is unavailable — showing events in time order.'],
    };
  }
}

module.exports = { buildItinerary };
