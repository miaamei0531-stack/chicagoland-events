/**
 * Neighborhood center coordinates.
 * Used by both MapView (for fly-to) and useEvents (for radius anchor).
 * Shared so both the map and the event list use identical geo filtering.
 */

export const NEIGHBORHOOD_CENTERS = {
  'Loop':           { lat: 41.8827, lng: -87.6278 },
  'River North':    { lat: 41.8944, lng: -87.6337 },
  'Lincoln Park':   { lat: 41.9220, lng: -87.6447 },
  'Wicker Park':    { lat: 41.9087, lng: -87.6796 },
  'Bucktown':       { lat: 41.9177, lng: -87.6820 },
  'Logan Square':   { lat: 41.9217, lng: -87.7033 },
  'Pilsen':         { lat: 41.8534, lng: -87.6636 },
  'Hyde Park':      { lat: 41.7943, lng: -87.5907 },
  'Andersonville':  { lat: 41.9814, lng: -87.6683 },
  'Lakeview':       { lat: 41.9435, lng: -87.6490 },
  'Wrigleyville':   { lat: 41.9484, lng: -87.6553 },
  'South Loop':     { lat: 41.8614, lng: -87.6278 },
  'West Loop':      { lat: 41.8827, lng: -87.6490 },
  'Evanston':       { lat: 42.0451, lng: -87.6877 },
  'Oak Park':       { lat: 41.8850, lng: -87.7845 },
  'Naperville':     { lat: 41.7858, lng: -88.1472 },
  'Schaumburg':     { lat: 42.0334, lng: -88.0834 },
  'Aurora':         { lat: 41.7606, lng: -88.3201 },
};
