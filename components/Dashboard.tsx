import React from 'react';
import { Droplets, Thermometer, Wind, Activity, Gauge, CloudFog } from 'lucide-react';
import { DataPoint, MetricKey, Persona } from '../types';
import { METRICS, getQualityColor } from '../utils/dataUtils';
import Tooltip from './Tooltip';

interface DashboardProps {
  currentData: DataPoint | null;
  selectedMetric: MetricKey;
  onSelectMetric: (key: MetricKey) => void;
  theme: 'light' | 'dark';
  persona: Persona;
  className?: string; // Added for Tour targeting
}

const StatCard: React.FC<{
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  metricKey: MetricKey;
  theme: 'light' | 'dark';
  persona: Persona;
}> = ({ label, value, unit, icon, isActive, onClick, metricKey, theme, persona }) => {
  
  const displayValue = value !== null 
    ? (typeof value === 'number' ? Math.round(value * 1000) / 1000 : value)
    : "N/A";
  const color = value !== null ? getQualityColor(value, metricKey, persona) : '#888';
  
  // GLASSMORPHISM RECIPE
  // Base: Layout & Sizing
  // MOBILE OPTIMIZATION: Reduced min-width, padding, and height
  const baseStyles = `
    flex items-center justify-between p-2 md:p-3 rounded-xl md:rounded-2xl transition-all duration-300 
    cursor-pointer pointer-events-auto select-none
    min-w-[130px] md:min-w-[220px] md:w-full flex-shrink-0
    group relative overflow-hidden
  `;

  // Theme: Colors & Glass Effects
  const glassStyles = isActive 
    ? (theme === 'dark' 
        ? 'bg-slate-800/80 ring-1 md:ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' 
        : 'bg-white/80 ring-1 md:ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]')
    : (theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60 border border-white/5 hover:bg-slate-800/70' 
        : 'bg-gradient-to-br from-white/60 to-white/30 border border-white/40 hover:bg-white/70');

  const commonGlass = `backdrop-blur-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5`;

  return (
    <Tooltip content={`Click to visualize ${label} on Map`} position="right" theme={theme}>
      <div
        onClick={onClick}
        className={`${baseStyles} ${glassStyles} ${commonGlass}`}
      >
        {/* Shine Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="flex items-center gap-2 md:gap-3 relative z-10 w-full">
          <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-950/50 text-slate-300' : 'bg-white/50 text-slate-600'}`}>
            {/* Clone icon with smaller size for mobile */}
            {React.cloneElement(icon as React.ReactElement, { size: 16, className: "md:w-[18px] md:h-[18px]" })}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className={`text-[9px] md:text-[10px] uppercase font-bold tracking-wider mb-0 md:mb-0.5 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {label}
            </div>
            <div className={`text-sm md:text-xl font-bold font-mono leading-none tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'} drop-shadow-sm`}>
              {displayValue} <span className="text-[9px] md:text-[10px] font-normal text-slate-500 ml-0.5">{unit}</span>
            </div>
          </div>
        </div>
        
        {value !== null && (
          <div 
             className="w-1 md:w-1.5 h-6 md:h-8 rounded-full ml-1.5 md:ml-2 transition-all duration-500 relative z-10 flex-shrink-0" 
             style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}88` }} 
          />
        )}
      </div>
    </Tooltip>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ currentData, selectedMetric, onSelectMetric, theme, persona, className }) => {
  return (
    <div className={`flex flex-col pointer-events-none z-20 w-full md:w-auto ${className || ''}`}>
      
      {/* Scrollable Container for Metrics */}
      <div className="
        flex flex-row gap-2 md:gap-3 overflow-x-auto w-full p-1 no-scrollbar
        md:flex-col md:w-64 md:overflow-visible md:h-auto
        pointer-events-auto
        pb-2 md:pb-0
        mask-linear-fade
      ">
        
        <StatCard
          label="Temperature"
          value={currentData?.temp ?? null}
          unit="°C"
          icon={<Thermometer />}
          isActive={selectedMetric === 'temp'}
          onClick={() => onSelectMetric('temp')}
          metricKey="temp"
          theme={theme}
          persona={persona}
        />

        <StatCard
          label="Dew Point"
          value={currentData?.dewpoint ?? null}
          unit="°C"
          icon={<Thermometer />}
          isActive={selectedMetric === 'dewpoint'}
          onClick={() => onSelectMetric('dewpoint')}
          metricKey="dewpoint"
          theme={theme}
          persona={persona}
        />
        
        <StatCard
          label="Humidity"
          value={currentData?.humidity ?? null}
          unit="%"
          icon={<Droplets />}
          isActive={selectedMetric === 'humidity'}
          onClick={() => onSelectMetric('humidity')}
          metricKey="humidity"
          theme={theme}
          persona={persona}
        />

        <StatCard
          label="VOC"
          value={currentData?.voc ?? null}
          unit="ppm"
          icon={<Wind />}
          isActive={selectedMetric === 'voc'}
          onClick={() => onSelectMetric('voc')}
          metricKey="voc"
          theme={theme}
          persona={persona}
        />

        <StatCard
          label="PM 2.5"
          value={currentData?.pm25 ?? null}
          unit="µg/m³"
          icon={<CloudFog />}
          isActive={selectedMetric === 'pm25'}
          onClick={() => onSelectMetric('pm25')}
          metricKey="pm25"
          theme={theme}
          persona={persona}
        />
        
        <StatCard
          label="PM 10"
          value={currentData?.pm10 ?? null}
          unit="µg/m³"
          icon={<CloudFog />}
          isActive={selectedMetric === 'pm10'}
          onClick={() => onSelectMetric('pm10')}
          metricKey="pm10"
          theme={theme}
          persona={persona}
        />

        <StatCard
          label="AQS"
          value={currentData?.aqs ?? null}
          unit=""
          icon={<Gauge />}
          isActive={selectedMetric === 'aqs'}
          onClick={() => onSelectMetric('aqs')}
          metricKey="aqs"
          theme={theme}
          persona={persona}
        />
      </div>
    </div>
  );
};

export default Dashboard;
