
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PERSONA_STANDARDS, METRICS } from '../utils/dataUtils';
import { DataPoint, MetricKey, Persona } from '../types';

interface ReferenceGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: DataPoint | null;
  currentMetric: MetricKey;
  theme: 'light' | 'dark';
  persona: Persona;
}

// Content extracted from provided educational materials
const ADVICE_CONTENT: Record<string, { title: string; intro: string; sections: { title: string; content: string | string[] }[] }> = {
  voc: {
    title: "Simple steps to reduce VOC levels",
    intro: "Volatile organic compounds (VOCs) are emitted as gases from certain solids or liquids. VOCs include a variety of chemicals, some of which may have adverse health effects. Concentrations are consistently higher indoors (up to ten times higher) than outdoors.",
    sections: [
      {
        title: "1. Ventilation",
        content: "Regular ventilation is an effective way to reduce exposure to VOCs. This can be done either by an automatic demand-controlled ventilation system equipped with suitable sensors, or by natural ventilation through open windows and doors."
      },
      {
        title: "2. Air purification",
        content: "Air cleaning devices equipped with suitable filters are an effective way to reduce the concentration of VOCs in indoor air, in particular in locations where ventilation with outside air is not appropriate."
      },
      {
        title: "3. Source control",
        content: "Potentially hazardous products often have warnings. Use products in well-ventilated areas, go outdoors, or use exhaust fans. Otherwise, open up windows to provide the maximum amount of outdoor air possible."
      },
      {
        title: "Common Sources of VOCs",
        content: [
          "Household: Paints, solvents, wood preservatives, aerosols, cleansers, disinfectants, moth repellents, air fresheners, stored fuels, pesticide, dry-cleaned clothing.",
          "Other: Building materials, furnishings, office equipment (copiers, printers), glues, adhesives, permanent markers."
        ]
      }
    ]
  },
  pm25: {
    title: "How to protect yourself from PM pollution",
    intro: "Particulate matter (PM) components include finely divided solids or liquids such as dust, pollen, fly ash, soot, smoke, aerosols, and fumes that can be suspended in the air for extended periods of time.",
    sections: [
      {
        title: "Outdoors",
        content: [
          "Avoid prolonged or heavy exertion and intense exercise outside.",
          "Limit unnecessary traveling by cars, scooters and other motorized vehicles.",
          "Use a special mask labeled with N95 or P100 if you must be outside for long periods.",
          "Stay indoors with windows closed and air conditioning on (ensure fresh-air intake is closed).",
          "Stay away from roads with heavy traffic."
        ]
      },
      {
        title: "Indoors",
        content: [
          "Increase ventilation by opening windows (when outdoor air is clean).",
          "Use air-purifiers with HEPA filters.",
          "Avoid using anything that burns, such as wood fireplaces, gas logs, candles, or incense.",
          "Reduce the use of cleaning products or air fresheners.",
          "Keep the house clean and do wet cleaning at least once a week."
        ]
      }
    ]
  },
  humidity: {
    title: "Understanding humidity and taking actions",
    intro: "Humidity directly affects our well-being and the amount of allergens in the indoor environment. It is believed that people are most comfortable when humidity levels are between 30% and 60%.",
    sections: [
      {
        title: "Low Humidity (<30%)",
        content: [
          "Stay hydrated - Drink more water (about 8 ounces per hour).",
          "Use saline spray, eye drops, and moisturize your skin.",
          "Use a vaporizer or humidifier.",
          "Boil water on your stove or simply place bowls of water around your home.",
          "Do not drink alcohol or coffee."
        ]
      },
      {
        title: "High Humidity (>60%)",
        content: [
          "Use a dehumidifier – particularly in basements and during the summer.",
          "Take cool showers and use exhaust fans while cooking and bathing.",
          "Open a window if there is fresh, drier air outside.",
          "Reduce water introduced into the home: cover pots when cooking, vent clothes dryers to the outside.",
          "In tightly constructed homes, use an energy recovery ventilator."
        ]
      }
    ]
  }
};

// Map other PM metrics to the same content
ADVICE_CONTENT['pm10'] = ADVICE_CONTENT['pm25'];
ADVICE_CONTENT['pm1'] = ADVICE_CONTENT['pm25'];

const ReferenceGuide: React.FC<ReferenceGuideProps> = ({ 
  isOpen, 
  onClose, 
  currentData, 
  currentMetric,
  theme,
  persona
}) => {
  const [activeTab, setActiveTab] = useState<string>('aqs');

  // Get standards for ACTIVE persona
  const activePersonaStandards = PERSONA_STANDARDS[persona];

  // Sync active tab with selected metric from parent
  useEffect(() => {
    if (isOpen) {
      if (activePersonaStandards[currentMetric]) {
        setActiveTab(currentMetric);
      } else {
         setActiveTab('aqs');
      }
    }
  }, [isOpen, currentMetric, activePersonaStandards]);

  if (!isOpen) return null;

  const availableTabs = Object.keys(activePersonaStandards);
  const activeStandards = activePersonaStandards[activeTab] || activePersonaStandards['aqs'];
  const currentValue = currentData && (activeTab in currentData) ? (currentData as any)[activeTab] : null;
  
  const advice = ADVICE_CONTENT[activeTab];

  // Helper to determine if current value is in a range
  const isRowActive = (min: number, max: number, key: string, val: number | null) => {
    if (val === null) return false;
    if (key === 'aqs') {
        return val >= min && val <= max;
    }
    return val >= min && val < max;
  };

  const isDark = theme === 'dark';
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const hairline = isDark ? 'border-white/10' : 'border-black/10';

  // Same ranges, shown low → high on the scale (AQS is stored high → low)
  const scale = [...activeStandards].sort((a, b) => a.min - b.min);
  const activeIdx = scale.findIndex(r => isRowActive(r.min, r.max, activeTab, currentValue));
  const activeRange = activeIdx >= 0 ? scale[activeIdx] : null;
  const markerPct = (() => {
    if (activeIdx < 0 || currentValue === null) return null;
    const r = scale[activeIdx];
    const span = r.max > 500 ? Math.max(r.min, 1) : r.max - r.min;
    const frac = Math.min(1, Math.max(0, (currentValue - r.min) / span));
    return ((activeIdx + frac) / scale.length) * 100;
  })();
  const formatRange = (min: number, max: number) => (max > 500 ? `> ${min}` : `${min}–${max}`);
  const tintStyle = (activeRange ? { ['--tint' as any]: activeRange.color } : {}) as React.CSSProperties;
  const labelStyle = activeRange
    ? { color: `color-mix(in srgb, ${activeRange.color} 62%, ${isDark ? '#ffffff' : '#1a1c1e'})` }
    : undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl ${isDark ? 'av-tint-dark' : 'av-tint'} ${ink}`}
        style={tintStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div>
            <h2 id="guide-title" className="text-xl font-semibold">Health thresholds</h2>
            <div className={`text-sm mt-0.5 ${muted}`}>
              Profile: <span className={`font-semibold ${ink}`}>{persona.charAt(0).toUpperCase() + persona.slice(1)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close guide"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className={`flex items-center gap-1 px-4 overflow-x-auto no-scrollbar border-b ${hairline}`}>
            {availableTabs.map(key => (
                <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setActiveTab(key)}
                    className={`
                        px-3 h-11 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap
                        ${activeTab === key
                            ? `font-semibold ${isDark ? 'border-slate-100' : 'border-[#1a1c1e]'}`
                            : `border-transparent ${muted} ${isDark ? 'hover:text-white' : 'hover:text-[#1a1c1e]'}`}
                    `}
                >
                    {METRICS[key]?.label || key}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Current reading */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className={`text-sm ${muted}`}>Now</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[44px] leading-none font-semibold tracking-tight">{currentValue !== null ? currentValue : '—'}</span>
                  <span className={`text-sm ${muted}`}>{METRICS[activeTab]?.unit || ''}</span>
                </div>
              </div>
              <div className="text-lg font-semibold pb-1" style={labelStyle}>
                {activeRange ? activeRange.label : (currentValue === null ? 'No reading at this point' : '')}
              </div>
            </div>

            {/* Scale: one segment per range, marker on the current value */}
            <div className="mt-5" aria-hidden="true">
              <div className="relative h-3.5">
                {markerPct !== null && (
                  <div
                    className="absolute top-0 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[8px]"
                    style={{ left: `${markerPct}%`, borderTopColor: isDark ? '#f1f5f9' : '#1a1c1e' }}
                  />
                )}
              </div>
              <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden">
                {scale.map((r, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: r.color, opacity: i === activeIdx ? 1 : 0.45 }} />
                ))}
              </div>
            </div>

            {/* Ranges */}
            <ol className="mt-4 flex flex-col">
                {scale.map((range, idx) => {
                    const active = idx === activeIdx;
                    return (
                        <li
                            key={idx}
                            className={`grid grid-cols-[12px_minmax(0,9rem)_1fr_auto] items-baseline gap-3 px-3 py-2.5 rounded-xl ${active ? (isDark ? 'bg-white/10' : 'bg-white/60') : ''}`}
                        >
                            <span className="w-2.5 h-2.5 rounded-[3px] self-center" style={{ backgroundColor: range.color }} />
                            <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{range.label}</span>
                            <span className={`text-sm ${muted}`}>{range.desc}</span>
                            <span className={`text-sm whitespace-nowrap ${active ? 'font-semibold' : muted}`}>{formatRange(range.min, range.max)}</span>
                        </li>
                    );
                })}
            </ol>

            {/* Advice (if available) */}
            {advice && (
                <div className={`mt-6 pt-5 border-t ${hairline}`}>
                    <h3 className="text-base font-semibold">{advice.title}</h3>
                    <p className={`text-sm mt-1.5 leading-relaxed ${muted}`}>{advice.intro}</p>

                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                        {advice.sections.map((section, idx) => (
                            <section key={idx}>
                                <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                                {Array.isArray(section.content) ? (
                                    <ul className={`space-y-1.5 text-sm leading-snug list-disc pl-4 ${isDark ? 'marker:text-slate-500' : 'marker:text-[#8a9096]'}`}>
                                        {section.content.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm leading-relaxed">{section.content}</p>
                                )}
                            </section>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ReferenceGuide;
