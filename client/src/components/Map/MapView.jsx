import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { CHICAGO_CENTER } from '../../utils/geoUtils.js';
import { api } from '../../services/api.js';
import { useFiltersStore } from '../../store/filters.js';
import { useThemeStore } from '../../store/theme.js';
import { useTripStore } from '../../store/trip.js';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../services/supabase.js';
import { CATEGORY_HEX, DEFAULT_HEX, ALL_CATEGORIES } from '../../utils/categoryColors.js';
import EventDetailPanel from '../Events/EventDetailPanel.jsx';
import PlaceDetailPanel from '../Places/PlaceDetailPanel.jsx';
import { NEIGHBORHOOD_CENTERS } from '../../utils/neighborhoods.js';
import { usePlanStore } from '../../store/plan.js';

const PLACE_COLOR = '#8B5CF6'; // purple

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DAY_STYLE = 'mapbox://styles/mapbox/light-v11';
const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
// Cluster colors by size
const CLUSTER_SMALL  = '#E8601C'; // orange  — < 10
const CLUSTER_MEDIUM = '#D97706'; // amber   — < 50
const CLUSTER_LARGE  = '#2C7A5C'; // green   — 50+

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
  const homeMarkerRef = useRef(null);
  const loadEventsRef = useRef(null); // always points to the latest loadEvents closure
  const { categories, startDate, endDate, searchQuery, neighborhood, radius } = useFiltersStore();
  const dark = useThemeStore((s) => s.dark);
  const { tripMode, tripDate, tripEvents, routeMode } = useTripStore();
  const isPlanOpen = usePlanStore((s) => s.isPlanOpen);
  const planDate = usePlanStore((s) => s.selectedDate);
  const { user } = useAuth();

  // Weather pill state (today's weather, loaded once)
  const [todayWeather, setTodayWeather] = useState(null);
  // "For You" toggle — only active when user is logged in
  const [forYouOn, setForYouOn] = useState(true);
  // Events/Places visibility toggles — places OFF by default, only when zoomed in
  const [showEvents, setShowEvents] = useState(true);
  const [showPlaces, setShowPlaces] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false); // true when zoom >= 14
  // Selected place (separate from selectedEventId)
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

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
      // Always apply category/search filters
      if (categories.length) params.category = categories;
      if (searchQuery) params.q = searchQuery;

      // Neighborhood + radius: always use neighborhood center as anchor when selected.
      // This avoids the race condition where loadEvents fires before the fly-to animation
      // completes, causing the bounds query to use the old viewport.
      const nbCenter = neighborhood ? NEIGHBORHOOD_CENTERS[neighborhood] : null;
      if (nbCenter || radius) {
        const cLat = nbCenter ? nbCenter.lat : (b.getNorth() + b.getSouth()) / 2;
        const cLng = nbCenter ? nbCenter.lng : (b.getEast() + b.getWest()) / 2;
        // Default radius when neighborhood is selected but no radius slider set: 5km
        const effectiveRadius = radius || (nbCenter ? 5 : null);
        if (effectiveRadius) {
          params.radius = effectiveRadius;
          params.radius_lat = cLat;
          params.radius_lng = cLng;
          const degLat = effectiveRadius / 111;
          const degLng = effectiveRadius / (111 * Math.cos(cLat * Math.PI / 180));
          params.north = Math.max(b.getNorth(), cLat + degLat);
          params.south = Math.min(b.getSouth(), cLat - degLat);
          params.east  = Math.max(b.getEast(),  cLng + degLng);
          params.west  = Math.min(b.getWest(),  cLng - degLng);
        }
      }

      if (isPlanOpen && planDate) {
        // Plan mode: show only events on the selected plan date
        params.start_date = planDate;
        params.end_date = planDate;
      } else if (tripMode && tripDate) {
        // Lock date to trip date; ignore the normal date range filters
        params.start_date = tripDate;
        params.end_date = tripDate;
      } else {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }

      // Load events always; only load places when zoomed in + toggled on
      const eventsPromise = api.getEventsWithinBounds(params);
      const currentZoom = map.current.getZoom();
      const shouldLoadPlaces = currentZoom >= 14;
      const placesPromise = shouldLoadPlaces
        ? api.getPlacesWithinBounds({
            north: params.north, south: params.south,
            east: params.east, west: params.west,
          })
        : Promise.resolve([]);

      const [events, places] = await Promise.all([eventsPromise, placesPromise.catch(() => [])]);

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

      // Places GeoJSON
      const placesGeojson = { type: 'FeatureCollection', features: [] };
      places.forEach((p) => {
        if (!p.coordinates?.coordinates) return;
        placesGeojson.features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.coordinates.coordinates },
          properties: {
            id: p.id,
            name: p.name,
            primary_category: Array.isArray(p.category) ? p.category[0] : null,
            rating: p.rating,
            price_level: p.price_level,
          },
        });
      });
      if (map.current.getSource('places')) {
        map.current.getSource('places').setData(placesGeojson);
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
  }, [tripMode, tripDate, categories, startDate, endDate, searchQuery, neighborhood, radius, isPlanOpen, planDate]);

  // Keep ref in sync so the moveend handler always calls the latest closure
  useEffect(() => { loadEventsRef.current = loadEvents; }, [loadEvents]);

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
        'circle-color': ['step', ['get', 'point_count'], CLUSTER_SMALL, 10, CLUSTER_MEDIUM, 50, CLUSTER_LARGE],
        'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
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

    // ── Places source + layers (purple squares) ──
    if (!map.current.getSource('places')) {
      map.current.addSource('places', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Place marker — subtle glow
      map.current.addLayer({
        id: 'place-glow',
        type: 'circle',
        source: 'places',
        layout: { visibility: 'none' },
        paint: {
          'circle-color': PLACE_COLOR,
          'circle-radius': 10,
          'circle-opacity': 0.12,
        },
      });

      // Place marker — small dot
      map.current.addLayer({
        id: 'place-marker',
        type: 'circle',
        source: 'places',
        layout: { visibility: 'none' },
        paint: {
          'circle-color': PLACE_COLOR,
          'circle-radius': 5,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });

      // Place click handlers
      map.current.on('click', 'place-marker', (e) => {
        const id = e.features[0].properties.id;
        onSelectEvent(null); // close any open event panel
        setSelectedPlaceId(id);
      });
      map.current.on('click', 'place-glow', (e) => {
        const id = e.features[0].properties.id;
        onSelectEvent(null);
        setSelectedPlaceId(id);
      });
      ['place-marker', 'place-glow'].forEach((layer) => {
        map.current.on('mouseenter', layer, () => { map.current.getCanvas().style.cursor = 'pointer'; });
        map.current.on('mouseleave', layer, () => { map.current.getCanvas().style.cursor = ''; });
      });
    }
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
      boundsTimer.current = setTimeout(() => loadEventsRef.current?.(), 400);
      setZoomedIn(map.current.getZoom() >= 14);
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

  // Toggle place layer visibility — only show when zoomed in AND toggled on
  useEffect(() => {
    if (!map.current) return;
    const placeLayers = ['place-glow', 'place-marker'];
    const visible = showPlaces && zoomedIn;
    placeLayers.forEach((id) => {
      if (map.current.getLayer(id)) map.current.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    });
  }, [showPlaces, zoomedIn]);

  // Reload markers when filters or trip date/mode changes
  useEffect(() => {
    if (!map.current) return;
    clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(loadEvents, 300);
  }, [categories, startDate, endDate, searchQuery, neighborhood, radius, tripMode, tripDate, isPlanOpen, planDate, loadEvents]);

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

  // Fetch today's weather for the map pill overlay
  useEffect(() => {
    const dateStr = new Date().toISOString().split('T')[0];
    fetch(`${import.meta.env.VITE_API_BASE_URL}/weather?date=${dateStr}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data && setTodayWeather(data))
      .catch(() => null);
  }, []);

  // Place home marker when user is logged in and has home_location
  useEffect(() => {
    if (!user || !map.current) return;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const prefs = await api.getPreferences(session.access_token);
        if (!prefs?.home_coords) return;
        const { lat, lng } = prefs.home_coords;

        // Remove existing home marker
        if (homeMarkerRef.current) homeMarkerRef.current.remove();

        const el = document.createElement('div');
        el.className = 'home-marker';
        el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:var(--accent,#d4a843);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:default;';
        el.title = 'Your home base';
        el.textContent = '🏠';

        homeMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map.current);
      } catch {
        // Non-fatal
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, map.current]);

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

      {/* Places toggle — only visible when zoomed in enough */}
      {zoomedIn && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 theme-surface rounded-full theme-shadow border theme-border-s p-0.5">
          <button
            onClick={() => setShowPlaces((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              showPlaces ? 'text-white' : 'theme-muted'
            }`}
            style={showPlaces ? { backgroundColor: PLACE_COLOR } : {}}
          >
            {showPlaces ? '🍽 Hide Places' : '🍽 Show Places'}
          </button>
        </div>
      )}

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

      {/* Weather pill — top-right corner of map (below zoom controls) */}
      {todayWeather && (
        <div className="absolute top-24 right-3 z-10">
          <div className="theme-surface border theme-border-s rounded-full px-3 py-1.5 text-xs font-medium theme-text theme-shadow flex items-center gap-1.5 whitespace-nowrap">
            <span>{todayWeather.emoji}</span>
            <span>{todayWeather.tempHighF}°F</span>
          </div>
        </div>
      )}

      {/* "For You" toggle — only shown when logged in */}
      {user && (
        <div className="absolute bottom-20 right-3 z-10 md:bottom-4">
          <button
            onClick={() => setForYouOn((v) => !v)}
            title={forYouOn ? 'Showing personalized view — click for all events' : 'Click to show personalized picks'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all theme-shadow ${
              forYouOn
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'theme-surface theme-muted border-[var(--border-subtle)]'
            }`}
          >
            ✨ {forYouOn ? 'For You' : 'All Events'}
          </button>
        </div>
      )}

      {selectedEventId && (
        <EventDetailPanel
          eventId={selectedEventId}
          onClose={() => onSelectEvent(null)}
        />
      )}

      {selectedPlaceId && !selectedEventId && (
        <PlaceDetailPanel
          placeId={selectedPlaceId}
          onClose={() => setSelectedPlaceId(null)}
        />
      )}
    </div>
  );
}
