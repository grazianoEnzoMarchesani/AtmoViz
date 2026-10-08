// Builds the light and dark base-map styles exactly as the app does and checks them with
// MapLibre's own validator, plus the fonts OpenFreeMap actually serves. Run: npm run check:map
import { build } from 'esbuild';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

// Fonts available at tiles.openfreemap.org/fonts (anything else is a 404 and labels vanish)
const OPENFREEMAP_FONTS = new Set(['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic']);

const bundle = await build({
  entryPoints: ['utils/mapStyle.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
  external: ['maplibre-gl'],
  define: { 'import.meta.env.BASE_URL': '"/AtmoViz/"' },
});
globalThis.window = { location: { href: 'https://example.org/AtmoViz/' } };
const { buildBaseStyle } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

const fontsIn = (value, found = new Set()) => {
  if (Array.isArray(value)) value.forEach(v => (typeof v === 'string' ? found.add(v) : fontsIn(v, found)));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => fontsIn(v, found));
  return found;
};

let failed = false;
for (const theme of ['light', 'dark']) {
  const style = buildBaseStyle(theme);
  const problems = validateStyleMin(style).map(e => e.message);

  for (const layer of style.layers) {
    for (const font of fontsIn(layer.layout?.['text-font'])) {
      if (!OPENFREEMAP_FONTS.has(font)) problems.push(`${layer.id}: font "${font}" is not served by OpenFreeMap`);
    }
  }
  if (theme === 'dark' && style.layers.some(l => l.id.endsWith('_pattern'))) {
    problems.push('dark style still contains texture layers');
  }

  console.log(`${theme}: ${style.layers.length} layers, ${problems.length ? problems.length + ' problem(s)' : 'OK'}`);
  problems.forEach(p => console.log('  - ' + p));
  failed ||= problems.length > 0;
}
process.exit(failed ? 1 : 0);
