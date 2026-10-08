import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';
import tonerStyle from './toner-style.json';

// Base map: "Toner" look (Stamen design, MapTiler/OpenMapTiles GL implementation,
// github.com/openmaptiles/maptiler-toner-gl-style, BSD-3) on OpenFreeMap vector tiles.
// OpenFreeMap serves the whole planet in the OpenMapTiles schema with no API key and no account.
const TILES_URL = 'https://tiles.openfreemap.org/planet';
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> · ' +
  'Toner style &copy; <a href="https://stamen.com" target="_blank">Stamen</a>';

// The Toner style uses Nunito, which OpenFreeMap does not host: map every font onto the Noto Sans it has.
const FONT_MAP: Record<string, string> = {
  'Nunito Regular': 'Noto Sans Regular',
  'Nunito Semi Bold': 'Noto Sans Bold',
  'Nunito Bold': 'Noto Sans Bold',
  'Nunito Extra Bold': 'Noto Sans Bold',
  'Noto Sans Bold Italic': 'Noto Sans Italic',
};

const mapFonts = (value: unknown): unknown => {
  if (typeof value === 'string') return FONT_MAP[value] ?? value;
  if (Array.isArray(value)) return value.map(mapFonts);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapFonts(v)]));
  }
  return value;
};

// --- Dark variant: same layers with every grey inverted and squeezed into a softer range ---

const parseColor = (c: string): [number, number, number, number] | null => {
  const s = c.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const [r, g, b, a = '1'] = m[1].split(',').map(x => x.trim());
    return [+r, +g, +b, +a];
  }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    // Toner only uses achromatic hsl(): lightness is enough
    const parts = m[1].split(',').map(x => x.trim());
    const v = Math.round((parseFloat(parts[2]) / 100) * 255);
    return [v, v, v, parts[3] !== undefined ? +parts[3] : 1];
  }
  return null;
};

const DARK_MIN = 18;   // what pure white becomes
const DARK_MAX = 200;  // what pure black becomes
const invert = (v: number) => Math.round(DARK_MIN + ((255 - v) / 255) * (DARK_MAX - DARK_MIN));

const invertColors = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const c = parseColor(value);
    return c ? `rgba(${invert(c[0])}, ${invert(c[1])}, ${invert(c[2])}, ${c[3]})` : value;
  }
  if (Array.isArray(value)) return value.map(invertColors);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, invertColors(v)]));
  }
  return value;
};

// In the dark theme large black areas (woods, grass, buildings) would turn into bright blocks:
// keep them as faint fills and drop the white-with-holes texture sprites that only work on paper.
const DARK_FILL_OPACITY: Record<string, number> = {
  landcover_grass_fill: 0.18,
  landcover_wood_fill: 0.22,
  landcover_cemetery_fill: 0.25,
  building_fill: 0.35,
};

const darkLayer = (layer: LayerSpecification): LayerSpecification | null => {
  if (layer.id.endsWith('_pattern')) return null;
  const out = { ...layer } as LayerSpecification;
  if ('paint' in layer && layer.paint) (out as { paint?: unknown }).paint = invertColors(layer.paint);
  if (layer.id in DARK_FILL_OPACITY && out.type === 'fill') {
    out.paint = { ...out.paint, 'fill-opacity': DARK_FILL_OPACITY[layer.id] };
  }
  return out;
};

const absoluteUrl = (path: string) => new URL(import.meta.env.BASE_URL + path, window.location.href).href;

export const buildBaseStyle = (theme: 'light' | 'dark'): StyleSpecification => {
  const layers = (tonerStyle.layers as unknown[]).map(l => mapFonts(l) as LayerSpecification);
  return {
    version: 8,
    name: theme === 'dark' ? 'Toner Dark' : 'Toner',
    sources: {
      openmaptiles: { type: 'vector', url: TILES_URL, attribution: MAP_ATTRIBUTION },
    },
    glyphs: GLYPHS_URL,
    sprite: absoluteUrl('map/sprites/toner'),
    layers: theme === 'dark'
      ? layers.map(darkLayer).filter((l): l is LayerSpecification => l !== null)
      : layers,
  };
};
