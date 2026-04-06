import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { CHICAGO_CENTER } from '../../utils/geoUtils.js';
import { api } from '../../services/api.js';
import { useFiltersStore } from '../../store/filters.js';
import { useThemeStore } from '../../store/theme.js';
import { useTripStore } from '../../store/trip.js';
import { CATEGORY_HEX, DEFAULT_HEX, ALL_CATEGORIES } from '../../utils/categoryColors.js';
import EventDetailPanel from '../Events/EventDetailPanel.jsx';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DAY_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const CLUSTER_COLOR = '#64748b'; // slate — neutral for mixed-category clusters

// Approximate centers for each neighborhood option in FiltersPanel
const NEIGHBORHOOD_CENTERS = {
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

// Build a Mapbox match expression: ['match', ['get', 'primary_category'], cat1, hex1, cat2, hex2, ..., fallback]
function categoryColorExpression() {
  const expr = ['match', ['get', 'primary_category']];
  ALL_CATEGORIES.forEach((cat) => {
    expr.push(cat, CATEGORY_HEX[cat] || DEFAULT_HEX);
  });
  expr.push(DEFAULT_HEX); // fallback
  return expr;
}

const COLOR_EXPR = categoryColorExpression();

export default function MapView({ selectedEventId, onSelectEvent }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const boundsTimer = useRef(null);
  const featuresRef = useRef([]); // store loaded features for flyTo lookups
  const { categories, startDate, endDate, searchQuery, neighborhood, radius } = useFiltersStore();
  const dark = useThemeStore((s) => s.dark);
  const { tripMode, tripDate, tripEvents, routeMode } = useTripStore();

  const loadEvents = useCallback(async () => {
    if (!map.current) return;
    const b = map.current.getBounds();
    try {
      const params = {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      };
      // Always apply category/search/neighborhood/radius filters
      if (categories.length) params.category = categories;
      if (searchQuery) params.q = searchQuery;
      if (neighborhood) params.neighborhood = neighborhood;
      if (radius) {
        params.radius = radius;
        // Use neighborhood center as radius origin; fall back to map viewport center
        const nbCenter = neighborhood ? NEIGHBORHOOD_CENTERS[neighborhood] : null;
        params.radius_lat = nbCenter ? nbCenter.lat : (b.getNorth() + b.getSouth()) / 2;
        params.radius_lng = nbCenter ? nbCenter.lng : (b.getEast() + b.getWest()) / 2;
      }

      if (tripMode && tripDate) {
        // Lock date to trip date; ignore the normal date range filters
        params.start_date = tripDate;
        params.end_date = tripDate;
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      const events = await api.getEventsWithinBounds(params);

      const geojson = { type: 'FeatureCollection', features: [] };

      events.forEach((e) => {
        if (!e.coordinates?.coordinates) return;

        const primaryCategory = Array.isArray(e.category) && e.category.length > 0
          ? e.category[0]
          : null;

        geojson.features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: e.coordinates.coordinates },
          properties: {
            id: e.id,
            title: e.title,
            start_datetime: e.start_datetime,
            primary_category: primaryCategory,
            is_user_submitted: e.is_user_submitted,
            is_free: e.is_free,
            venue_name: e.venue_name || null,
          },
        });
      });

      featuresRef.current = geojson.features;
      if (map.current.getSource('events')) {
        map.current.getSource('events').setData(geojson);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [tripMode, tripDate, categories, startDate, endDate, searchQuery, neighborhood, radius]);

  function addSourcesAndLayers() {
    if (map.current.getSource('events')) return; // already added

    map.current.addSource('events', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 45,
    });

    // ── Cluster circle ──
    map.current.addLayer({
      id: 'event-clusters',
      type: 'circle',
      source: 'events',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': CLUSTER_COLOR,
        'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
        'circle-opacity': 0.82,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-stroke-opacity': 0.6,
      },
    });

    // Cluster count label
    map.current.addLayer({
      id: 'event-cluster-count',
      type: 'symbol',
      source: 'events',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12,
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#fff' },
    });

    // ── Individual markers — outer glow ──
    map.current.addLayer({
      id: 'event-unclustered-glow',
      type: 'circle',
      source: 'events',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': COLOR_EXPR,
        'circle-radius': 14,
        'circle-opacity': 0.18,
        'circle-stroke-width': 0,
      },
    });

    // ── Individual markers — main dot ──
    map.current.addLayer({
      id: 'event-unclustered',
      type: 'circle',
      source: 'events',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': COLOR_EXPR,
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });

    // ── Click handlers ──
    map.current.on('click', 'event-unclustered', (e) => {
      onSelectEvent(e.features[0].properties.id);
    });
    map.current.on('click', 'event-unclustered-glow', (e) => {
      onSelectEvent(e.features[0].properties.id);
    });
    ['event-unclustered', 'event-unclustered-glow'].forEach((layer) => {
      map.current.on('mouseenter', layer, () => { map.current.getCanvas().style.cursor = 'pointer'; });
      map.current.on('mouseleave', layer, () => { map.current.getCanvas().style.cursor = ''; });
    });

    // ── Cluster click → zoom in ──
    map.current.on('click', 'event-clusters', (e) => {
      const features = map.current.queryRenderedFeatures(e.point, { layers: ['event-clusters'] });
      const clusterId = features[0].properties.cluster_id;
      map.current.getSource('events').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.current.easeTo({ center: features[0].geometry.coordinates, zoom });
      });
    });
    map.current.on('mouseenter', 'event-clusters', () => { map.current.getCanvas().style.cursor = 'pointer'; });
    map.current.on('mouseleave', 'event-clusters', () => { map.current.getCanvas().style.cursor = ''; });
  }

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: dark ? DARK_STYLE : DAY_STYLE,
      center: [CHICAGO_CENTER.lng, CHICAGO_CENTER.lat],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      addSourcesAndLayers();
      loadEvents();
    });

    map.current.on('moveend', () => {
      clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(loadEvents, 400);
    });

    return () => { clearTimeout(boundsTimer.current); };
  }, [loadEvents]);

  // Swap map style when theme changes — re-add layers after style loads
  useEffect(() => {
    if (!map.current) return;
    map.current.setStyle(dark ? DARK_STYLE : DAY_STYLE);
    map.current.once('styledata', () => {
      addSourcesAndLayers();
      loadEvents();
    });
  }, [dark, loadEvents]);

  // Fly to neighborhood center when neighborhood filter changes
  useEffect(() => {
    if (!map.current || !neighborhood) return;
    const center = NEIGHBORHOOD_CENTERS[neighborhood];
    if (!center) return;
    map.current.flyTo({ center: [center.lng, center.lat], zoom: 13, duration: 800 });
  }, [neighborhood]);

  // Reload markers when filters or trip date/mode changes
  useEffect(() => {
    if (!map.current) return;
    clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(loadEvents, 300);
  }, [categories, startDate, endDate, searchQuery, neighborhood, radius, tripMode, tripDate, loadEvents]);

  // Fly to + pulse-highlight selected event
  useEffect(() => {
    if (!map.current || !selectedEventId) return;
    const feature = featuresRef.current.find((f) => f.properties?.id === selectedEventId);
    if (!feature) return;

    const [lng, lat] = feature.geometry.coordinates;

    map.current.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 14), duration: 600 });

    // Add a temporary pulse layer
    const pulseId = 'selected-pulse';
    if (map.current.getLayer(pulseId)) map.current.removeLayer(pulseId);
    if (map.current.getSource(pulseId)) map.current.removeSource(pulseId);

    map.current.addSource(pulseId, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } },
    });
    map.current.addLayer({
      id: pulseId,
      type: 'circle',
      source: pulseId,
      paint: {
        'circle-radius': 18,
        'circle-color': 'var(--accent, #d4a843)',
        'circle-opacity': 0.35,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'var(--accent, #d4a843)',
        'circle-stroke-opacity': 0.8,
      },
    }, 'event-unclustered-glow');
  }, [selectedEventId]);

  // Draw Directions route when trip events change
  useEffect(() => {
    if (!map.current) return;

    const coords = tripEvents
      .filter((te) => te.event?.coordinates?.coordinates)
      .map((te) => te.event.coordinates.coordinates); // [lng, lat]

    // Remove existing route
    if (map.current.getLayer('trip-route')) map.current.removeLayer('trip-route');
    if (map.current.getSource('trip-route')) map.current.removeSource('trip-route');

    if (!tripMode || coords.length < 2) return;

    const profile = routeMode === 'walking' ? 'walking' : 'driving';
    const waypointStr = coords.map((c) => c.join(',')).join(';');
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${waypointStr}?geometries=geojson&overview=full&access_token=${token}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const route = data.routes?.[0]?.geometry;
        if (!route || !map.current) return;
        map.current.addSource('trip-route', { type: 'geojson', data: { type: 'Feature', geometry: route } });
        map.current.addLayer({
          id: 'trip-route',
          type: 'line',
          source: 'trip-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': 'var(--accent, #d4a843)',
            'line-width': 4,
            'line-opacity': 0.8,
            'line-dasharray': [2, 1],
          },
        }, 'event-clusters'); // insert below markers
      })
      .catch(() => {});
  }, [tripMode, tripEvents, routeMode]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Category legend — top-left on mobile, hidden on desktop (shown in filters sidebar) */}
      <div className="absolute top-3 left-3 z-10 md:hidden theme-surface rounded-2xl theme-shadow p-2 border theme-border-s">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_HEX[cat] }} />
              <span className="text-[9px] theme-text leading-none">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedEventId && (
        <EventDetailPanel
          eventId={selectedEventId}
          onClose={() => onSelectEvent(null)}
        />
      )}
    </div>
  );
}
