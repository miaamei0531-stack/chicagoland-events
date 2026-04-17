/**
 * Itinerary Agent
 * Builds a day itinerary from selected events with:
 * - Real start times (formatted server-side, never invented by AI)
 * - Travel time between consecutive stops
 * - Suggestion stops in 90+ minute gaps
 * - Scheduling conflict warnings
 */

const { callClaudeJSON } = require('../orchestrator');

const SYSTEM_PROMPT = `You are an expert Chicago day trip planner who gives detailed, specific, local advice.
You receive a list of events the user wants to attend on a specific day, already sorted by start time.
You also receive a list of always-available places (restaurants, parks, cafes, museums) from the user's area.

IMPORTANT — be DETAILED and SPECIFIC in every field. Do NOT give vague answers.

Your job:
1. Use the ACTUAL start times from the events — never change them or invent new times. Each event has a "start_time" field like "7:00 PM" — use it EXACTLY.

2. Calculate realistic travel time between each consecutive event. You MUST:
   - Name the specific route: "18 min drive via Lake Shore Drive" not just "18 min drive"
   - For walks, name the streets or landmarks: "12 min walk south on Michigan Ave through Millennium Park"
   - For transit, name the CTA line: "22 min via CTA Blue Line from Jackson to Logan Square"
   - Choose the right mode: walk if < 1 mile, transit if 1-5 miles without parking hassle, drive otherwise

3. Check for gaps of 90+ minutes between events. For EACH gap, insert ONE suggestion:
   - Use a SPECIFIC real place — name the actual restaurant/cafe/bar by name and address
   - Prefer places from the provided nearby_places list when one fits
   - If none fit, name a real Chicago spot you know near the venue (e.g., "Portillo's at 100 W Ontario" not "a nearby restaurant")
   - Match meal times: breakfast before 10 AM, lunch 11:30-1:30, dinner 5:30-8
   - For short gaps (60-90 min), suggest a coffee shop or quick walk
   - For post-event (after last event, before 9 PM), suggest a specific bar or dessert spot nearby

4. Write a practical "description" for EACH stop — not just the title. Examples:
   - "Arrive 10 min early for best seats near the stage"
   - "Street parking available on side streets off Halsted"
   - "Order the deep dish — 45 min cook time so order right away"

5. Flag scheduling conflicts where travel time makes an event unreachable.

6. Write a one-line day summary that captures the vibe, not just a list: "A culture-packed afternoon from the Art Institute to live blues in Wicker Park"

Return ONLY valid JSON — no markdown, no explanation:
{
  "summary": "A culture-packed afternoon from the Art Institute to live blues in Wicker Park",
  "stops": [
    {
      "type": "event",
      "time": "3:00 PM",
      "title": "Event Title",
      "venue": "Venue Name",
      "description": "Arrive early — free street parking on Dearborn. Grab the gallery map at the front desk.",
      "travel_to_next": {
        "duration": "18 min",
        "mode": "drive",
        "note": "Take Lake Shore Drive south to 31st St exit"
      }
    },
    {
      "type": "suggestion",
      "time": "4:30 PM",
      "title": "Coffee at Intelligentsia Millennium Park",
      "venue": "Intelligentsia Coffee, 53 E Randolph St",
      "description": "Great pour-over — sit by the window facing the Bean. 45 min until next event.",
      "travel_to_next": {
        "duration": "8 min",
        "mode": "walk",
        "note": "Walk east on Randolph, cross Michigan Ave"
      }
    }
  ],
  "warnings": ["The 5 PM and 5:15 PM events overlap — you'd need to skip one or leave early"]
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
  const { selectedEvents, nearbyPlaces, homeLocation, date, weatherData, mobility, groupType } = params;

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

  // Format places for AI (if provided)
  const placesForAI = (nearbyPlaces || []).slice(0, 10).map((p) => ({
    name: p.name,
    category: Array.isArray(p.category) ? p.category[0] : p.category,
    address: p.address || null,
    rating: p.rating || null,
    price_level: p.price_level || null,
  }));

  const userMessage = JSON.stringify({
    events: eventsForAI,
    nearby_places: placesForAI,
    date,
    weather: weatherSummary,
    user_mobility: mobility || 'driving',
  });

  try {
    // Try Haiku first, fall back to Sonnet if model not available
    let result;
    try {
      result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 3000,
      });
    } catch (modelErr) {
      console.error('Haiku failed, trying Sonnet:', modelErr.message);
      result = await callClaudeJSON(SYSTEM_PROMPT, userMessage, {
        model: 'claude-sonnet-4-6',
        maxTokens: 3000,
      });
    }

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
    console.error('Itinerary agent error:', err.message, err.status || '');
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
      warnings: [`AI itinerary builder is unavailable — showing events in time order. (${err.message})`],
    };
  }
}

module.exports = { buildItinerary };
