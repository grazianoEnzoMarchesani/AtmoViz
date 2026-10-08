
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { DataPoint, MetricConfig, VisualizationMode, Persona, GeoPhoto } from '../types';
import { DEFAULT_CENTER } from '../constants';
import { getQualityColor } from '../utils/dataUtils';
import { buildBaseStyle } from '../utils/mapStyle';
import MapMarker from './MapMarker';
import PhotoLayer from './PhotoLayer';

// Vite bundles MapLibre's worker as a separate file
maplibregl.setWorkerUrl(workerUrl);

const TRAIL_LENGTH = 20; // Number of segments in the playback "wake"

// Overlay sources/layers all start with "atmo-" so they are easy to tell apart from the base map
const SRC_SEGMENTS = 'atmo-segments';
const SRC_POINTS = 'atmo-points';
const SRC_TRAIL = 'atmo-trail';
const LAYER_HEATMAP = 'atmo-heatmap';
const LAYER_PATH = 'atmo-path';
const LAYER_POINTS = 'atmo-points';
const LAYER_TRAIL = 'atmo-trail';

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

const hasCoords = (p: DataPoint | undefined): p is DataPoint & { lat: number; lng: number } =>
  !!p && p.lat !== null && p.lng !== null;

/** Adds the (empty) data overlays on top of the base map. Runs again after every style change. */
const installOverlays = (map: maplibregl.Map) => {
  for (const id of [SRC_SEGMENTS, SRC_POINTS, SRC_TRAIL]) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY });
  }
  const layers: maplibregl.AddLayerObject[] = [
    {
      // Density: big soft discs, like the blurred circles of the Leaflet version
      id: LAYER_HEATMAP, type: 'circle', source: SRC_POINTS,
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.25,
        'circle-blur': 0.7,
      },
    },
    {
      id: LAYER_PATH, type: 'line', source: SRC_SEGMENTS,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 6, 'line-opacity': 0.9 },
    },
    {
      id: LAYER_POINTS, type: 'circle', source: SRC_POINTS,
      paint: {
        'circle-radius': 4,
        'circle-color': ['get', 'color'],
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-width': 1,
        'circle-stroke-opacity': 0.8,
      },
    },
    {
      id: LAYER_TRAIL, type: 'line', source: SRC_TRAIL,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 10, 'line-opacity': ['get', 'opacity'] },
    },
  ];
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
};

const setSourceData = (map: maplibregl.Map, id: string, data: FeatureCollection) => {
  (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);
};

interface MapBoardProps {
  data: DataPoint[];
  currentIndex: number;
  isPlaying: boolean;
  theme: 'light' | 'dark';
  metricConfig: MetricConfig;
  visualizationMode: VisualizationMode;
  useDynamicHeatmapRadius: boolean;
  onPointSelect: (index: number) => void;
  isFollowing: boolean;
  onFollowChange: (following: boolean) => void;
  persona: Persona;
  photos?: GeoPhoto[];
  isPhotoLayerVisible?: boolean;
  onPhotoClick?: (photo: GeoPhoto) => void;
}

const MapBoard: React.FC<MapBoardProps> = ({
  data,
  currentIndex,
  isPlaying,
  theme,
  metricConfig,
  visualizationMode,
  useDynamicHeatmapRadius,
  onPointSelect,
  isFollowing,
  onFollowChange,
  persona,
  photos = [],
  isPhotoLayerVisible = true,
  onPhotoClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // Bumped on every style load: overlays are re-installed and re-filled after a theme switch
  const [styleGeneration, setStyleGeneration] = useState(0);

  const currentPoint = data[currentIndex];

  // Determine initial center
  const initialCenter: [number, number] = useMemo(() => {
    const firstValidData = data.find(d => d.lat !== null && d.lng !== null);
    if (firstValidData) return [firstValidData.lat!, firstValidData.lng!];
    if (photos.length > 0) return [photos[0].lat, photos[0].lng];
    return DEFAULT_CENTER;
  }, [data, photos]);

  // Latest values for handlers registered once
  const onPointSelectRef = useRef(onPointSelect);
  onPointSelectRef.current = onPointSelect;
  const onFollowChangeRef = useRef(onFollowChange);
  onFollowChangeRef.current = onFollowChange;
  const isFollowingRef = useRef(isFollowing);
  isFollowingRef.current = isFollowing;
  const themeRef = useRef(theme);

  // --- Map lifecycle ---
  useEffect(() => {
    const instance = new maplibregl.Map({
      container: containerRef.current!,
      style: buildBaseStyle(themeRef.current),
      center: [initialCenter[1], initialCenter[0]],
      zoom: 16,
      attributionControl: { compact: true },
      // Lets the PDF report read the WebGL canvas back
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    instance.on('style.load', () => {
      installOverlays(instance);
      setStyleGeneration(g => g + 1);
    });

    // Clicking the route or a point seeks the playback to it
    const handleSelect = (e: maplibregl.MapLayerMouseEvent) => {
      const index = e.features?.[0]?.properties?.index;
      if (typeof index === 'number') onPointSelectRef.current(index);
    };
    const setPointer = () => { instance.getCanvas().style.cursor = 'pointer'; };
    const clearPointer = () => { instance.getCanvas().style.cursor = ''; };
    for (const layer of [LAYER_PATH, LAYER_POINTS]) {
      instance.on('click', layer, handleSelect);
      instance.on('mouseenter', layer, setPointer);
      instance.on('mouseleave', layer, clearPointer);
    }

    // Dragging the map is the user taking over: stop following the current point
    instance.on('dragstart', () => {
      if (isFollowingRef.current) onFollowChangeRef.current(false);
    });

    setMap(instance);
    // Handy for poking at the map from the browser console while developing
    if (import.meta.env.DEV) (window as unknown as { atmoMap: maplibregl.Map }).atmoMap = instance;
    return () => {
      instance.remove();
      setMap(null);
    };
    // The map is created once; later center changes are handled by the follow logic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme switch: reload the base style (overlays come back through 'style.load')
  useEffect(() => {
    if (!map || themeRef.current === theme) return;
    themeRef.current = theme;
    map.setStyle(buildBaseStyle(theme), { diff: false });
  }, [map, theme]);

  // --- Overlay data ---
  const segments = useMemo<FeatureCollection<LineString>>(() => {
    const features: FeatureCollection<LineString>['features'] = [];
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      if (!hasCoords(current) || !hasCoords(next)) continue;
      const val = current[metricConfig.key] as number | null;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[current.lng, current.lat], [next.lng, next.lat]] },
        properties: { index: i, color: getQualityColor(val, metricConfig.key, persona) },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [data, metricConfig, persona]);

  const points = useMemo<FeatureCollection<Point>>(() => {
    const features: FeatureCollection<Point>['features'] = [];
    data.forEach((point, index) => {
      if (!hasCoords(point)) return;
      const val = point[metricConfig.key] as number | null;
      // Dynamic Radius Calculation
      let radius = 25;
      if (useDynamicHeatmapRadius && val !== null) {
        const clampedVal = Math.max(metricConfig.min, Math.min(metricConfig.max, val));
        const normalized = (clampedVal - metricConfig.min) / (metricConfig.max - metricConfig.min);
        radius = 15 + (normalized * 35);
      }
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
        properties: { index, radius, color: getQualityColor(val, metricConfig.key, persona) },
      });
    });
    return { type: 'FeatureCollection', features };
  }, [data, metricConfig, persona, useDynamicHeatmapRadius]);

  // Motion Trail: a fading "wake" behind the current point during playback
  const trail = useMemo<FeatureCollection<LineString>>(() => {
    if (!isPlaying || currentIndex < 1) return EMPTY as FeatureCollection<LineString>;
    const features: FeatureCollection<LineString>['features'] = [];
    const start = Math.max(0, currentIndex - TRAIL_LENGTH);
    for (let i = start; i < currentIndex; i++) {
      const current = data[i];
      const next = data[i + 1];
      if (!hasCoords(current) || !hasCoords(next)) continue;
      // Head = 0.8, tail = 0.1
      const pos = (i - start) / (currentIndex - start);
      const val = current[metricConfig.key] as number | null;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[current.lng, current.lat], [next.lng, next.lat]] },
        properties: { opacity: 0.1 + 0.7 * pos, color: getQualityColor(val, metricConfig.key, persona) },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [data, currentIndex, isPlaying, metricConfig, persona]);

  useEffect(() => {
    if (map && styleGeneration) setSourceData(map, SRC_SEGMENTS, segments);
  }, [map, styleGeneration, segments]);

  useEffect(() => {
    if (map && styleGeneration) setSourceData(map, SRC_POINTS, points);
  }, [map, styleGeneration, points]);

  useEffect(() => {
    if (map && styleGeneration) setSourceData(map, SRC_TRAIL, trail);
  }, [map, styleGeneration, trail]);

  useEffect(() => {
    if (!map || !styleGeneration) return;
    const visible: Record<string, boolean> = {
      [LAYER_PATH]: visualizationMode === 'path',
      [LAYER_POINTS]: visualizationMode === 'points',
      [LAYER_HEATMAP]: visualizationMode === 'heatmap',
    };
    for (const [layer, on] of Object.entries(visible)) {
      map.setLayoutProperty(layer, 'visibility', on ? 'visible' : 'none');
    }
  }, [map, styleGeneration, visualizationMode]);

  // --- Follow the current point ---
  const currentLat = hasCoords(currentPoint) ? currentPoint.lat : null;
  const currentLng = hasCoords(currentPoint) ? currentPoint.lng : null;
  useEffect(() => {
    if (!map || !isFollowing || currentLat === null || currentLng === null) return;
    // A smooth, slightly cinematic pan
    map.easeTo({ center: [currentLng, currentLat], duration: 1000, easing: t => t * (2 - t) });
  }, [map, isFollowing, currentLat, currentLng]);

  const pulseColor = currentPoint
    ? getQualityColor(currentPoint[metricConfig.key] as number | null, metricConfig.key, persona)
    : '#3b82f6';

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <div ref={containerRef} className="w-full h-full" />

      {map && (
        <PhotoLayer
          map={map}
          styleGeneration={styleGeneration}
          photos={photos}
          isVisible={isPhotoLayerVisible}
          onPhotoClick={onPhotoClick}
        />
      )}

      {map && currentLat !== null && currentLng !== null && (
        <MapMarker
          map={map}
          lngLat={[currentLng, currentLat]}
          anchor="center"
          offset={12}
          popup={
            <div className="text-center px-1">
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">{metricConfig.label}</div>
              <div className="text-lg font-mono font-bold text-slate-900">
                {currentPoint[metricConfig.key] !== null ? currentPoint[metricConfig.key] : 'N/A'}
                <span className="text-xs ml-1">{metricConfig.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{currentPoint.dateStr}</div>
            </div>
          }
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ backgroundColor: pulseColor, opacity: 0.2 }}
            />
            <div
              className="relative w-4 h-4 rounded-full"
              style={{
                backgroundColor: pulseColor,
                border: `2px solid ${theme === 'dark' ? '#ffffff' : '#000000'}`,
              }}
            />
          </div>
        </MapMarker>
      )}
    </div>
  );
};

export default MapBoard;
