import React, { useState, useMemo, useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { ChevronLeft, ChevronRight, Layers, Sparkles, MapPin } from 'lucide-react';
import { GeoPhoto } from '../types';
import MapMarker from './MapMarker';

interface PhotoLayerProps {
  map: maplibregl.Map;
  // Changes after every base-style reload, when the connector lines must be added again
  styleGeneration: number;
  photos: GeoPhoto[];
  isVisible: boolean;
  onPhotoClick?: (photo: GeoPhoto) => void;
}

interface PhotoGroup {
  id: string;
  centerLat: number;
  centerLng: number;
  photos: GeoPhoto[];
}

// Distance threshold for clustering (approx 15-20 meters)
const DISTANCE_THRESHOLD = 0.00018;

// Distinct color palettes for spiderfied (raggera) photo pins
const SPIDER_PALETTES = [
  { bg: 'from-cyan-500 to-blue-600', text: 'text-cyan-300', stroke: '#06b6d4', ring: 'ring-cyan-400', badge: 'bg-cyan-500', hex: '#06b6d4' },
  { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-300', stroke: '#10b981', ring: 'ring-emerald-400', badge: 'bg-emerald-500', hex: '#10b981' },
  { bg: 'from-amber-400 to-orange-500', text: 'text-amber-200', stroke: '#f59e0b', ring: 'ring-amber-400', badge: 'bg-amber-500', hex: '#f59e0b' },
  { bg: 'from-purple-500 to-indigo-600', text: 'text-purple-300', stroke: '#a855f7', ring: 'ring-purple-400', badge: 'bg-purple-500', hex: '#a855f7' },
  { bg: 'from-pink-500 to-rose-600', text: 'text-pink-300', stroke: '#ec4899', ring: 'ring-pink-400', badge: 'bg-pink-500', hex: '#ec4899' },
  { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-300', stroke: '#3b82f6', ring: 'ring-blue-400', badge: 'bg-blue-500', hex: '#3b82f6' },
  { bg: 'from-lime-400 to-emerald-600', text: 'text-lime-200', stroke: '#84cc16', ring: 'ring-lime-400', badge: 'bg-lime-500', hex: '#84cc16' },
  { bg: 'from-orange-500 to-red-600', text: 'text-orange-300', stroke: '#f97316', ring: 'ring-orange-400', badge: 'bg-orange-500', hex: '#f97316' },
];

// Helper to group photos that are close to each other
const groupPhotosByProximity = (photos: GeoPhoto[]): PhotoGroup[] => {
  const groups: PhotoGroup[] = [];

  photos.forEach((photo) => {
    let added = false;
    for (const group of groups) {
      const dLat = Math.abs(group.centerLat - photo.lat);
      const dLng = Math.abs(group.centerLng - photo.lng);
      
      if (dLat < DISTANCE_THRESHOLD && dLng < DISTANCE_THRESHOLD) {
        group.photos.push(photo);
        // Recalculate center
        group.centerLat = group.photos.reduce((sum, p) => sum + p.lat, 0) / group.photos.length;
        group.centerLng = group.photos.reduce((sum, p) => sum + p.lng, 0) / group.photos.length;
        added = true;
        break;
      }
    }

    if (!added) {
      groups.push({
        id: `group-${photo.id}`,
        centerLat: photo.lat,
        centerLng: photo.lng,
        photos: [photo]
      });
    }
  });

  return groups;
};

// Single Photo Pin Icon
const singlePhotoIcon = `
    <div class="relative group cursor-pointer" style="width: 36px; height: 36px;">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 p-0.5 shadow-xl shadow-rose-500/40 ring-2 ring-white hover:scale-110 transition-transform duration-200 flex items-center justify-center text-white">
        <div class="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-rose-500 rotate-45 rounded-xs shadow-md"></div>
    </div>
  `;

// Group Cluster Pin Icon
const createClusterIcon = (count: number, isSpiderfied: boolean) => `
    <div class="relative group cursor-pointer" style="width: 44px; height: 44px;">
      <!-- Stacked effect shadow cards -->
      <div class="absolute top-1 left-1 w-9 h-9 rounded-xl bg-rose-900/60 ring-1 ring-white/20 transform rotate-6"></div>
      <div class="absolute top-0.5 left-0.5 w-9 h-9 rounded-xl bg-amber-600/70 ring-1 ring-white/30 transform -rotate-3"></div>
      
      <!-- Main Badge Pin -->
      <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-tr ${isSpiderfied ? 'from-cyan-500 via-teal-500 to-emerald-400 shadow-cyan-500/50' : 'from-rose-600 via-pink-600 to-amber-500 shadow-rose-500/50'} p-0.5 shadow-2xl ring-2 ring-white hover:scale-110 transition-all duration-200 flex items-center justify-center text-white">
        <div class="w-full h-full bg-slate-900 rounded-[14px] flex flex-col items-center justify-center p-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isSpiderfied ? '#06b6d4' : '#f43f5e'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            <circle cx="9" cy="9" r="2"/>
          </svg>
          <span class="text-[10px] font-black tracking-tight ${isSpiderfied ? 'text-cyan-300' : 'text-amber-300'} font-mono -mt-0.5">${count}</span>
        </div>
      </div>

      <!-- Badge counter pill -->
      <div class="absolute -top-1.5 -right-1.5 ${isSpiderfied ? 'bg-cyan-500' : 'bg-rose-500'} text-white font-bold text-[10px] font-mono px-1.5 py-0.2 rounded-full ring-2 ring-slate-900 shadow-md">
        ${count}
      </div>

      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 ${isSpiderfied ? 'bg-cyan-500' : 'bg-rose-600'} rotate-45 rounded-xs shadow-md"></div>
    </div>
  `;

// Spiderfied Item Icon with unique color palette per index
const createSpiderfiedIcon = (index: number, total: number) => {
  const palette = SPIDER_PALETTES[index % SPIDER_PALETTES.length];
  
  return `
      <div class="relative group cursor-pointer animate-in zoom-in-50 duration-200" style="width: 36px; height: 36px;">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr ${palette.bg} p-0.5 shadow-xl ring-2 ring-white hover:scale-125 transition-transform duration-200 flex items-center justify-center text-white">
          <div class="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-mono text-[11px] font-bold ${palette.text}">
            #${index + 1}
          </div>
        </div>
        <!-- Colored tag dot -->
        <div class="absolute -top-1 -right-1 w-3.5 h-3.5 ${palette.badge} rounded-full ring-2 ring-slate-900 flex items-center justify-center">
          <span class="w-1.5 h-1.5 bg-white rounded-full"></span>
        </div>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gradient-to-br ${palette.bg} rotate-45"></div>
      </div>
    `;
};

const PinIcon: React.FC<{ html: string }> = ({ html }) => <div dangerouslySetInnerHTML={{ __html: html }} />;

// Component for stacked cluster group
const GroupClusterMarker: React.FC<{
  map: maplibregl.Map;
  styleGeneration: number;
  group: PhotoGroup;
  onPhotoClick?: (photo: GeoPhoto) => void;
}> = ({ map, styleGeneration, group, onPhotoClick }) => {
  const [isSpiderfied, setIsSpiderfied] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Calculate spiderfied positions in a radial circle
  const spiderPositions = useMemo(() => {
    if (group.photos.length <= 1) return [];
    const count = group.photos.length;
    // Radial radius (approx 35-40 meters in deg)
    const radius = 0.00038; 
    
    return group.photos.map((photo, i) => {
      const angle = (i / count) * (2 * Math.PI) - Math.PI / 2;
      const lat = group.centerLat + radius * Math.cos(angle);
      const lng = group.centerLng + (radius * Math.sin(angle)) / Math.cos((group.centerLat * Math.PI) / 180);
      const palette = SPIDER_PALETTES[i % SPIDER_PALETTES.length];
      return { photo, lat, lng, index: i, palette };
    });
  }, [group]);

  const currentPhoto = group.photos[activePhotoIdx] || group.photos[0];

  // Dashed connector lines from the centre to each spiderfied pin, drawn on the map canvas
  useEffect(() => {
    if (!isSpiderfied) return;
    const id = `atmo-spider-${group.id}`;
    map.addSource(id, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: spiderPositions.map(({ lat, lng, palette }) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[group.centerLng, group.centerLat], [lng, lat]] },
          properties: { color: palette.hex },
        })),
      },
    });
    map.addLayer({
      id, type: 'line', source: id,
      paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
    });
    return () => {
      // After a style reload the old layer is already gone
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, styleGeneration, isSpiderfied, spiderPositions, group]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev + 1) % group.photos.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev - 1 + group.photos.length) % group.photos.length);
  };

  return (
    <>
      {/* Central Group Cluster Marker */}
      <MapMarker
        map={map}
        lngLat={[group.centerLng, group.centerLat]}
        offset={46}
        popupClassName="photo-map-popup"
        autoPan
        // Hover preview tooltip
        tooltip={!isSpiderfied ? (
          <div className="bg-slate-900/90 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg border border-white/10 font-sans">
            <Layers size={13} className="text-rose-400" />
            <span>{group.photos.length} Foto Sovrapposte — Clicca per Aprire</span>
          </div>
        ) : undefined}
        // Locked Interactive Popup on Click
        popup={
          <div className="w-[300px] p-1 text-white font-sans">
            {/* Header with Group Badge and Raggera Toggle */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Layers size={14} className="text-rose-500" />
                <span>Foto {activePhotoIdx + 1} di {group.photos.length}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSpiderfied(!isSpiderfied);
                }}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all shadow-md ${
                  isSpiderfied 
                    ? 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400'
                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
                }`}
              >
                <Sparkles size={12} />
                <span>{isSpiderfied ? 'Chiudi Raggera' : 'Disperdi a Raggera'}</span>
              </button>
            </div>

            {/* Photo Image Viewport with Carousel Controls */}
            <div className="relative w-full h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center mb-2.5 border border-white/10 group">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.name}
                className="w-full h-full object-cover"
              />

              {/* Left/Right Navigation Arrows */}
              {group.photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white shadow-xl backdrop-blur-md transition-all border border-white/20 active:scale-95"
                    title="Foto precedente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white shadow-xl backdrop-blur-md transition-all border border-white/20 active:scale-95"
                    title="Foto successiva"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Model badge */}
              {(currentPhoto.model || currentPhoto.make) && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-500/30 text-[10px] text-amber-400 font-mono font-bold">
                  FLIR {currentPhoto.model || currentPhoto.make}
                </div>
              )}
            </div>

            {/* Thumbnail Strip for fast selection */}
            {group.photos.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2.5 scrollbar-none px-0.5">
                {group.photos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIdx(idx);
                    }}
                    className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      idx === activePhotoIdx 
                        ? 'border-rose-500 ring-2 ring-rose-500/50 scale-105 opacity-100' 
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-mono text-[9px] px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Photo Metadata */}
            <div className="px-1 space-y-1.5">
              <div className="font-semibold text-xs text-slate-100 truncate flex items-center justify-between">
                <span className="truncate pr-2">{currentPhoto.name}</span>
                <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">JPEG</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <MapPin size={12} /> GPS
                </span>
                <span>{currentPhoto.lat.toFixed(6)}, {currentPhoto.lng.toFixed(6)}</span>
              </div>

              {currentPhoto.dateTime && (
                <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                  📅 {currentPhoto.dateTime}
                </div>
              )}
            </div>
          </div>
        }
      >
        <PinIcon html={createClusterIcon(group.photos.length, isSpiderfied)} />
      </MapMarker>

      {/* Spiderfied (Raggera) Radial Pins (connector lines are a map layer, see above) */}
      {isSpiderfied && (
        <>
          {spiderPositions.map(({ photo, lat, lng, index, palette }) => (
            <React.Fragment key={photo.id}>
              {/* Individual Spiderfied Marker with distinct palette */}
              <MapMarker
                map={map}
                lngLat={[lng, lat]}
                offset={40}
                popupClassName="photo-map-popup"
        autoPan
                onClick={() => onPhotoClick && onPhotoClick(photo)}
                // Hover Tooltip for Spiderfied Pin
                tooltip={
                  <div className={`px-2 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold font-mono border border-slate-700 flex items-center gap-1.5`}>
                    <span className={`w-2 h-2 rounded-full ${palette.badge}`}></span>
                    <span>Foto #{index + 1}: {photo.name}</span>
                  </div>
                }
                // Locked Interactive Popup for Spiderfied Pin
                popup={
                  <div className="w-[280px] p-1 text-white font-sans">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                      <span className={`text-xs font-bold font-mono ${palette.text} flex items-center gap-1`}>
                        <span className={`w-2 h-2 rounded-full ${palette.badge}`}></span>
                        Foto #{index + 1} della raggera
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{photo.fileSize ? `${(photo.fileSize / 1024).toFixed(0)} KB` : ''}</span>
                    </div>

                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-black flex items-center justify-center mb-2 shadow-inner border border-white/10">
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                      {(photo.model || photo.make) && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-[10px] text-amber-400 font-mono font-bold">
                          FLIR {photo.model || photo.make}
                        </div>
                      )}
                    </div>

                    <div className="px-1 space-y-1">
                      <div className="font-semibold text-xs text-slate-100 truncate flex items-center justify-between">
                        <span className="truncate pr-2">{photo.name}</span>
                        <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">JPEG</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <MapPin size={11} /> GPS
                        </span>
                        <span>{photo.lat.toFixed(6)}, {photo.lng.toFixed(6)}</span>
                      </div>

                      {photo.dateTime && (
                        <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                          📅 {photo.dateTime}
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                <PinIcon html={createSpiderfiedIcon(index, group.photos.length)} />
              </MapMarker>
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

const PhotoLayer: React.FC<PhotoLayerProps> = ({ map, styleGeneration, photos, isVisible, onPhotoClick }) => {
  // Group photos by proximity
  const groups = useMemo(() => groupPhotosByProximity(photos), [photos]);

  if (!isVisible || photos.length === 0) return null;

  return (
    <>
      {groups.map((group) => {
        if (group.photos.length === 1) {
          const photo = group.photos[0];
          return (
            <MapMarker
              key={photo.id}
              map={map}
              lngLat={[photo.lng, photo.lat]}
              offset={40}
              popupClassName="photo-map-popup"
        autoPan
              onClick={() => onPhotoClick && onPhotoClick(photo)}
              tooltip={
                <div className="bg-slate-900/90 text-white px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 font-sans">
                  <span>📷 {photo.name}</span>
                </div>
              }
              popup={
                <div className="w-[280px] p-1 text-white font-sans">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-black flex items-center justify-center mb-2">
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-xs truncate text-slate-100">{photo.name}</h4>
                  <p className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                    <MapPin size={11} /> {photo.lat.toFixed(6)}, {photo.lng.toFixed(6)}
                  </p>
                  {photo.dateTime && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">📅 {photo.dateTime}</p>}
                  {(photo.model || photo.make) && <p className="text-[10px] text-amber-400 font-semibold mt-0.5">📷 FLIR {photo.model || photo.make}</p>}
                </div>
              }
            >
              <PinIcon html={singlePhotoIcon} />
            </MapMarker>
          );
        }

        // Render clustered group
        return (
          <GroupClusterMarker
            key={group.id}
            map={map}
            styleGeneration={styleGeneration}
            group={group}
            onPhotoClick={onPhotoClick}
          />
        );
      })}
    </>
  );
};

export default PhotoLayer;
