import React from 'react';
import { DataPoint, MetricKey, Persona } from '../types';
import { PERSONA_STANDARDS, getQualityColor } from '../utils/dataUtils';

interface DashboardProps {
  currentData: DataPoint | null;
  selectedMetric: MetricKey;
  onSelectMetric: (key: MetricKey) => void;
  theme: 'light' | 'dark';
  persona: Persona;
  className?: string; // Added for Tour targeting
}

const ROWS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'temp', label: 'Temperature', unit: '°C' },
  { key: 'dewpoint', label: 'Dew Point', unit: '°C' },
  { key: 'humidity', label: 'Humidity', unit: '%' },
  { key: 'voc', label: 'VOC', unit: 'ppm' },
  { key: 'pm25', label: 'PM 2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM 10', unit: 'µg/m³' },
  { key: 'aqs', label: 'AQS', unit: '' },
];

const formatValue = (value: number | null) =>
  value !== null ? (typeof value === 'number' ? Math.round(value * 1000) / 1000 : value) : '—';

// Label of the range getQualityColor picked: same source of truth, no new thresholds logic.
const qualityLabel = (value: number | null, key: MetricKey, persona: Persona): string | null => {
  if (value === null) return null;
  const color = getQualityColor(value, key, persona);
  const ranges = PERSONA_STANDARDS[persona]?.[key] || PERSONA_STANDARDS.standard[key];
  return ranges?.find(r => r.color === color)?.label ?? null;
};

const Dashboard: React.FC<DashboardProps> = ({ currentData, selectedMetric, onSelectMetric, theme, persona, className }) => {
  const isDark = theme === 'dark';
  const valueOf = (key: MetricKey) => (currentData ? ((currentData as any)[key] ?? null) : null) as number | null;

  const selected = ROWS.find(r => r.key === selectedMetric) || ROWS[4];
  const selectedValue = valueOf(selected.key);
  const tint = selectedValue !== null ? getQualityColor(selectedValue, selected.key, persona) : undefined;
  const label = qualityLabel(selectedValue, selected.key, persona);

  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const tintStyle = (tint ? { ['--tint' as any]: tint } : {}) as React.CSSProperties;
  // Class name in a darker (light theme) or lighter (dark theme) shade of the tint, for contrast.
  const labelStyle = tint
    ? { color: `color-mix(in srgb, ${tint} 62%, ${isDark ? '#ffffff' : '#1a1c1e'})` }
    : undefined;

  return (
    <div className={`flex flex-col pointer-events-none z-20 w-full md:w-auto ${className || ''}`}>
      <section
        aria-label="Current readings"
        className={`pointer-events-auto rounded-2xl ${isDark ? 'av-tint-dark' : 'av-tint'} ${ink} md:w-72`}
        style={tintStyle}
      >
        {/* Selected reading: the focal point (desktop only, mobile keeps the compact strip) */}
        <div className="hidden md:block px-5 pt-4 pb-3">
          <div className={`text-[13px] ${muted}`}>{selected.label}</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[40px] leading-none font-semibold tracking-tight">{formatValue(selectedValue)}</span>
            <span className={`text-sm ${muted}`}>{selected.unit}</span>
          </div>
          <div className="mt-1.5 text-[15px] font-semibold" style={labelStyle}>
            {label ?? (selectedValue === null ? 'No data at this point' : '')}
          </div>
        </div>

        {/* All readings: one list, the selected one is the row the map is coloured by */}
        <ul
          className={`
            flex flex-row gap-1 overflow-x-auto no-scrollbar p-1.5
            md:flex-col md:gap-0.5 md:overflow-visible md:px-2 md:pb-2 md:pt-1
            md:border-t ${isDark ? 'md:border-white/10' : 'md:border-black/10'}
          `}
        >
          {ROWS.map(row => {
            const value = valueOf(row.key);
            const isActive = row.key === selectedMetric;
            const dot = value !== null ? getQualityColor(value, row.key, persona) : 'transparent';
            return (
              <li key={row.key} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectMetric(row.key)}
                  aria-pressed={isActive}
                  className={`
                    w-full min-h-[40px] flex items-center gap-2.5 px-3 rounded-xl text-left transition-colors
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1
                    ${isActive
                      ? (isDark ? 'bg-white/15 font-semibold' : 'bg-black/[0.08] font-semibold')
                      : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/[0.04]')}
                  `}
                >
                  <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: dot }} />
                  <span className="text-[14px] md:flex-1 whitespace-nowrap">{row.label}</span>
                  <span className="text-[15px] font-semibold whitespace-nowrap">{formatValue(value)}</span>
                  <span className={`hidden md:inline w-11 text-xs font-normal ${muted}`}>{row.unit}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default Dashboard;
