// Convert events array to GeoJSON FeatureCollection for Mapbox
export function toGeoJSON(events) {
  return {
    type: 'FeatureCollection',
    features: events
      .filter((e) => e.coordinates)
      .map((e) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [e.coordinates.lon, e.coordinates.lat],
        },
        properties: {
          id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          category: e.category,
          is_user_submitted: e.is_user_submitted,
        },
      })),
  };
}

// Chicago bounding box
export const CHICAGO_BOUNDS = {
  north: 42.023,
  south: 41.644,
  east: -87.524,
  west: -87.94,
};

export const CHICAGO_CENTER = { lat: 41.8827, lng: -87.6233 };
