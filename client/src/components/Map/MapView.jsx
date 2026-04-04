import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { CHICAGO_CENTER } from '../../utils/geoUtils.js';
import { api } from '../../services/api.js';
import { useFiltersStore } from '../../store/filters.js';
import EventDetailPanel from '../Events/EventDetailPanel.jsx';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const OFFICIAL_COLOR = '#3B82F6';   // blue
const COMMUNITY_COLOR = '#2E986A';  // teal

export default function MapView({ selectedEventId, onSelectEvent }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const boundsTimer = useRef(null);
  const { categories, startDate, endDate, searchQuery } = useFiltersStore();

  // Fetch events for current bounds and update both GeoJSON sources
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
      if (categories.length) params.category = categories;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (searchQuery) params.q = searchQuery;

      const events = await api.getEventsWithinBounds(params);

      const official = { type: 'FeatureCollection', features: [] };
      const community = { type: 'FeatureCollection', features: [] };

      events.forEach((e) => {
        if (!e.coordinates) return;
        // coordinates comes back as WKB hex from PostGIS — parse via Supabase
        // Supabase returns GEOGRAPHY as GeoJSON when using postgis extension
        let coords;
        if (typeof e.coordinates === 'string') {
          // WKB — skip, rely on Supabase returning GeoJSON
          return;
        }
        if (e.coordinates?.coordinates) {
          coords = e.coordinates.coordinates; // [lng, lat]
        } else {
          return;
        }

        const feature = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            id: e.id,
            title: e.title,
            start_datetime: e.start_datetime,
            category: JSON.stringify(e.category),
            is_user_submitted: e.is_user_submitted,
            is_free: e.is_free,
            venue_name: e.venue_name,
          },
        };

        if (e.is_user_submitted) {
          community.features.push(feature);
        } else {
          official.features.push(feature);
        }
      });

      if (map.current.getSource('official-events')) {
        map.current.getSource('official-events').setData(official);
      }
      if (map.current.getSource('community-events')) {
        map.current.getSource('community-events').setData(community);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [CHICAGO_CENTER.lng, CHICAGO_CENTER.lat],
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // ── Official events source + layers (blue) ──
      map.current.addSource('official-events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles
      map.current.addLayer({
        id: 'official-clusters',
        type: 'circle',
        source: 'official-events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': OFFICIAL_COLOR,
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
          'circle-opacity': 0.85,
        },
      });
      map.current.addLayer({
        id: 'official-cluster-count',
        type: 'symbol',
        source: 'official-events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff' },
      });

      // Individual markers
      map.current.addLayer({
        id: 'official-unclustered',
        type: 'circle',
        source: 'official-events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': OFFICIAL_COLOR,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // ── Community events source + layers (teal) ──
      map.current.addSource('community-events', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.current.addLayer({
        id: 'community-clusters',
        type: 'circle',
        source: 'community-events',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': COMMUNITY_COLOR,
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 20, 30],
          'circle-opacity': 0.85,
        },
      });
      map.current.addLayer({
        id: 'community-cluster-count',
        type: 'symbol',
        source: 'community-events',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff' },
      });

      map.current.addLayer({
        id: 'community-unclustered',
        type: 'circle',
        source: 'community-events',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': COMMUNITY_COLOR,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // ── Click handlers ──
      ['official-unclustered', 'community-unclustered'].forEach((layerId) => {
        map.current.on('click', layerId, (e) => {
          const props = e.features[0].properties;
          onSelectEvent(props.id);
        });

        map.current.on('mouseenter', layerId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', layerId, () => {
          map.current.getCanvas().style.cursor = '';
        });
      });

      // Click cluster → zoom in
      ['official-clusters', 'community-clusters'].forEach((layerId) => {
        map.current.on('click', layerId, (e) => {
          const features = map.current.queryRenderedFeatures(e.point, { layers: [layerId] });
          const clusterId = features[0].properties.cluster_id;
          const source = layerId.startsWith('official') ? 'official-events' : 'community-events';
          map.current.getSource(source).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.current.easeTo({ center: features[0].geometry.coordinates, zoom });
          });
        });
        map.current.on('mouseenter', layerId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', layerId, () => {
          map.current.getCanvas().style.cursor = '';
        });
      });

      loadEvents();
    });

    // Debounced reload on pan/zoom
    map.current.on('moveend', () => {
      clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(loadEvents, 400);
    });

    return () => {
      clearTimeout(boundsTimer.current);
    };
  }, [loadEvents]);

  // Reload markers when filters change (map already initialized)
  useEffect(() => {
    if (!map.current) return;
    clearTimeout(boundsTimer.current);
    boundsTimer.current = setTimeout(loadEvents, 300);
  }, [categories, startDate, endDate, searchQuery, loadEvents]);

  return (
    <div className="relative flex-1 h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {selectedEventId && (
        <EventDetailPanel
          eventId={selectedEventId}
          onClose={() => onSelectEvent(null)}
        />
      )}
    </div>
  );
}
