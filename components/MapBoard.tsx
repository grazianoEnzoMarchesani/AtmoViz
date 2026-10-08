
import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, Popup, Polyline } from 'react-leaflet';
import { DataPoint, MetricConfig, VisualizationMode, Persona, GeoPhoto } from '../types';
import { MAP_TILES, MAP_ATTRIBUTION, DEFAULT_CENTER } from '../constants';
import { getQualityColor } from '../utils/dataUtils';
import PhotoLayer from './PhotoLayer';

// --- Sub-components ---

// 1. Motion Trail: Renders a "wake" effect behind the current point during playback
const MotionTrail = React.memo(({ 
  data, 
  currentIndex, 
  metricConfig,
  theme,
  persona
}: { 
  data: DataPoint[], 
  currentIndex: number, 
  metricConfig: MetricConfig, 
  theme: 'light' | 'dark',
  persona: Persona
}) => {
  const TRAIL_LENGTH = 20; // Number of points in the trail

  const segments = useMemo(() => {
    if (currentIndex < 1) return null;

    const result = [];
    const start = Math.max(0, currentIndex - TRAIL_LENGTH);
    
    for (let i = start; i < currentIndex; i++) {
      const current = data[i];
      const next = data[i + 1];

      if (!current || !next || current.lat === null || current.lng === null || next.lat === null || next.lng === null) continue;

      // Calculate opacity based on distance from current index (Head = 1.0, Tail = 0.0)
      const pos = (i - start) / (currentIndex - start); 
      const opacity = 0.1 + (0.7 * pos); // Range from 0.1 to 0.8
      
      const val = current[metricConfig.key] as number | null;
      const color = getQualityColor(val, metricConfig.key, persona);
      
      result.push(
        <Polyline
          key={`wake-${current.id}`}
          positions={[
            [current.lat, current.lng],
            [next.lat, next.lng]
          ]}
          pathOptions={{
            color: color,
            weight: 10, 
            opacity: opacity,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'pointer-events-none'
          }}
        />
      );
    }
    return result;
  }, [data, currentIndex, metricConfig, TRAIL_LENGTH, persona]);

  return <>{segments}</>;
});

// 2. Gradient Path: Renders the route as colored segments
const GradientPath = React.memo(({ 
  data, 
  metricConfig, 
  onPointSelect,
  persona
}: { 
  data: DataPoint[], 
  metricConfig: MetricConfig, 
  onPointSelect: (index: number) => void,
  persona: Persona
}) => {
  const segments = useMemo(() => {
    const result = [];
    
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];

      if (current.lat === null || current.lng === null || next.lat === null || next.lng === null) continue;

      const val = current[metricConfig.key] as number | null;
      const color = getQualityColor(val, metricConfig.key, persona);

      result.push(
        <Polyline
          key={`seg-${current.id}`}
          positions={[
            [current.lat, current.lng],
            [next.lat, next.lng]
          ]}
          pathOptions={{
            color: color,
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          }}
          eventHandlers={{
            click: () => onPointSelect(i)
          }}
        />
      );
    }
    return result;
  }, [data, metricConfig, onPointSelect, persona]);

  return <>{segments}</>;
});

// 3. Points Layer: Renders individual points
const PointsLayer = React.memo(({ 
  data, 
  metricConfig, 
  onPointSelect,
  persona
}: { 
  data: DataPoint[], 
  metricConfig: MetricConfig, 
  onPointSelect: (index: number) => void,
  persona: Persona
}) => {
  const points = useMemo(() => {
    return data.map((point, index) => {
        if (point.lat === null || point.lng === null) return null;
        const val = point[metricConfig.key] as number | null;
        const color = getQualityColor(val, metricConfig.key, persona);
        
        return (
            <CircleMarker
                key={`pt-${point.id}`}
                center={[point.lat, point.lng]}
                radius={4}
                pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 1,
                    weight: 1,
                    opacity: 0.8
                }}
                eventHandlers={{
                  click: () => onPointSelect(index)
                }}
            />
        );
    });
  }, [data, metricConfig, onPointSelect, persona]);

  return <>{points}</>;
});

// 4. Heatmap (Density) Layer
const HeatmapLayer = React.memo(({ 
  data, 
  metricConfig, 
  useDynamicRadius,
  persona
}: { 
  data: DataPoint[], 
  metricConfig: MetricConfig, 
  useDynamicRadius: boolean,
  persona: Persona
}) => {
  const points = useMemo(() => {
    return data.map((point) => {
        if (point.lat === null || point.lng === null) return null;
        const val = point[metricConfig.key] as number | null;
        const color = getQualityColor(val, metricConfig.key, persona);
        
        // Dynamic Radius Calculation
        let radius = 25; 
        if (useDynamicRadius && val !== null) {
           const min = metricConfig.min;
           const max = metricConfig.max;
           const clampedVal = Math.max(min, Math.min(max, val));
           const normalized = (clampedVal - min) / (max - min);
           radius = 15 + (normalized * 35); 
        }

        return (
            <CircleMarker
                key={`hm-${point.id}`}
                center={[point.lat, point.lng]}
                radius={radius} 
                pathOptions={{
                    stroke: false,
                    fillColor: color,
                    fillOpacity: 0.2,
                    className: 'heatmap-blob pointer-events-none'
                }}
            />
        );
    });
  }, [data, metricConfig, useDynamicRadius, persona]);

  return <>{points}</>;
});

// 5. Smart Map Controller
const MapController = ({ 
  center, 
  isFollowing, 
  onUserInteract 
}: { 
  center: [number, number], 
  isFollowing: boolean, 
  onUserInteract: () => void 
}) => {
  const map = useMap();
  const isFollowingRef = useRef(isFollowing);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    const handleInteraction = () => {
      // Only break follow mode if we are currently following
      if (isFollowingRef.current) {
        onUserInteract();
      }
    };
    
    // 'dragstart' is the best event to detect intentional user movement
    map.on('dragstart', handleInteraction);
    return () => {
      map.off('dragstart', handleInteraction);
    };
  }, [map, onUserInteract]);

  useEffect(() => {
    if (isFollowing && center) {
      // Use panTo for smooth following
      // duration: 1.0 gives a fluid, cinematic feel
      map.panTo(center, { animate: true, duration: 1.0, easeLinearity: 0.25 });
    }
  }, [center, isFollowing, map]);

  return null;
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
  const currentPoint = data[currentIndex];
  
  // Determine initial center
  const initialCenter: [number, number] = useMemo(() => {
    const firstValidData = data.find(d => d.lat !== null && d.lng !== null);
    if (firstValidData) return [firstValidData.lat!, firstValidData.lng!];
    if (photos.length > 0) return [photos[0].lat, photos[0].lng];
    return DEFAULT_CENTER;
  }, [data, photos]);

  const pulseColor = currentPoint 
    ? getQualityColor(currentPoint[metricConfig.key] as number | null, metricConfig.key, persona)
    : '#3b82f6';

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <style>
        {`
          .heatmap-blob {
            filter: blur(8px);
            transition: all 0.3s ease;
          }
        `}
      </style>

      <MapContainer
        center={initialCenter}
        zoom={16}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution={MAP_ATTRIBUTION}
          url={theme === 'dark' ? MAP_TILES.dark : MAP_TILES.light}
          crossOrigin="anonymous"
        />
        
        {currentPoint && currentPoint.lat !== null && currentPoint.lng !== null && (
          <MapController 
            center={[currentPoint.lat, currentPoint.lng]} 
            isFollowing={isFollowing}
            onUserInteract={() => onFollowChange(false)}
          />
        )}

        {/* Photo EXIF GPS Layer */}
        <PhotoLayer 
          photos={photos} 
          isVisible={isPhotoLayerVisible} 
          onPhotoClick={onPhotoClick} 
        />

        {/* Visualization Layers */}
        {visualizationMode === 'path' && (
          <GradientPath 
            data={data} 
            metricConfig={metricConfig} 
            onPointSelect={onPointSelect} 
            persona={persona}
          />
        )}
        {visualizationMode === 'points' && (
          <PointsLayer 
            data={data} 
            metricConfig={metricConfig} 
            onPointSelect={onPointSelect} 
            persona={persona}
          />
        )}
        {visualizationMode === 'heatmap' && (
          <HeatmapLayer 
            data={data} 
            metricConfig={metricConfig} 
            useDynamicRadius={useDynamicHeatmapRadius}
            persona={persona}
          />
        )}

        {isPlaying && (
          <MotionTrail 
             data={data}
             currentIndex={currentIndex}
             metricConfig={metricConfig}
             theme={theme}
             persona={persona}
          />
        )}

        {currentPoint && currentPoint.lat !== null && currentPoint.lng !== null && (
          <>
             <CircleMarker
              center={[currentPoint.lat, currentPoint.lng]}
              radius={20}
              pathOptions={{
                color: pulseColor,
                fillColor: pulseColor,
                fillOpacity: 0.2,
                weight: 0,
                className: "animate-pulse" 
              }}
            />
            <CircleMarker
              center={[currentPoint.lat, currentPoint.lng]}
              radius={8}
              pathOptions={{
                color: theme === 'dark' ? '#ffffff' : '#000000',
                weight: 2,
                fillColor: pulseColor,
                fillOpacity: 1,
              }}
            >
               <Popup autoPan={false}>
                  <div className="text-center">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">{metricConfig.label}</div>
                    <div className="text-lg font-mono font-bold">
                       {currentPoint[metricConfig.key] !== null ? currentPoint[metricConfig.key] : 'N/A'}
                       <span className="text-xs ml-1">{metricConfig.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{currentPoint.dateStr}</div>
                  </div>
               </Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default MapBoard;
