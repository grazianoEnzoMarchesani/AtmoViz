
import React, { useState, useEffect } from 'react';
import { X, Info, CheckCircle, BookOpen, Shield, Wind, Droplets, User } from 'lucide-react';
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

  const bgBase = theme === 'dark' ? 'bg-slate-900/90' : 'bg-white/90';
  const textBase = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subText = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const borderBase = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`
        w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border
        ${bgBase} ${borderBase} ${textBase}
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${borderBase}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-500">
               <BookOpen size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold">Environmental Guide</h2>
                <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-1.5 mt-0.5`}>
                    <span>Active Profile:</span>
                    <span className="font-bold uppercase text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded text-xs">
                        {persona}
                    </span>
                </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-slate-500/20 transition-colors`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex items-center gap-2 px-6 pt-4 pb-0 overflow-x-auto no-scrollbar border-b ${borderBase}`}>
            {availableTabs.map(key => (
                <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`
                        px-4 py-3 font-bold text-sm uppercase tracking-wider border-b-2 transition-all whitespace-nowrap
                        ${activeTab === key 
                            ? 'border-cyan-500 text-cyan-500' 
                            : 'border-transparent text-slate-500 hover:text-slate-400'}
                    `}
                >
                    {METRICS[key]?.label || key}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* Current Value Header */}
            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/20">
               <span className="text-sm font-bold uppercase text-cyan-500">Current Reading</span>
               <div className="font-mono text-xl font-bold">
                  {currentValue !== null ? currentValue : '--'}
                  <span className="text-xs ml-1 opacity-70">
                     {METRICS[activeTab]?.unit || ''}
                  </span>
               </div>
            </div>

            {/* Standards Table */}
            <div className="space-y-3 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-2 flex items-center gap-2">
                    <Shield size={14} />
                    Health Thresholds ({persona})
                </h3>
                {activeStandards.map((range, idx) => {
                    const active = isRowActive(range.min, range.max, activeTab, currentValue);
                    
                    return (
                        <div 
                            key={idx}
                            className={`
                                relative p-3 rounded-lg border transition-all duration-300
                                flex flex-col md:flex-row md:items-center gap-3
                                ${active 
                                    ? `border-[${range.color}] bg-[${range.color}]/10 ring-1 ring-[${range.color}] shadow-lg scale-[1.01]` 
                                    : `${theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'} opacity-90`}
                            `}
                            style={{ 
                                borderColor: active ? range.color : undefined,
                                backgroundColor: active ? `${range.color}15` : undefined 
                            }}
                        >
                            {/* Range Badge */}
                            <div className="min-w-[100px]">
                                <div 
                                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                                    style={{ backgroundColor: range.color }}
                                >
                                    {range.min} - {range.max > 500 ? '>' : range.max}
                                </div>
                                <div className="text-sm font-bold mt-0.5">{range.label}</div>
                            </div>

                            {/* Description */}
                            <div className={`flex-1 text-xs leading-relaxed ${subText}`}>
                                {range.desc}
                            </div>

                            {/* Active Indicator */}
                            {active && (
                                <div className="absolute right-3 top-3 text-cyan-500 animate-pulse hidden md:block">
                                    <CheckCircle size={16} fill="currentColor" className="text-white" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Advice Section (if available) */}
            {advice && (
                <div className={`mt-8 pt-6 border-t ${borderBase} animate-in fade-in slide-in-from-bottom-4`}>
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                        {activeTab === 'voc' && <Wind size={20} className="text-cyan-500" />}
                        {activeTab.startsWith('pm') && <Shield size={20} className="text-cyan-500" />}
                        {activeTab === 'humidity' && <Droplets size={20} className="text-cyan-500" />}
                        {advice.title}
                    </h3>
                    <p className={`text-sm mb-6 leading-relaxed opacity-80`}>
                        {advice.intro}
                    </p>

                    <div className="grid grid-cols-1 gap-6">
                        {advice.sections.map((section, idx) => (
                            <div key={idx} className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <h4 className="font-bold text-base mb-3 text-cyan-600 dark:text-cyan-400">
                                    {section.title}
                                </h4>
                                {Array.isArray(section.content) ? (
                                    <ul className="space-y-2">
                                        {section.content.map((item, i) => (
                                            <li key={i} className={`text-sm flex items-start gap-2 ${subText}`}>
                                                <span className="block w-1.5 h-1.5 mt-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className={`text-sm leading-relaxed ${subText}`}>
                                        {section.content}
                                    </p>
                                )}
                            </div>
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
