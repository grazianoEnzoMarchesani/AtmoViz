
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip as RechartsTooltip, YAxis, Brush } from 'recharts';
import { DataPoint, MetricConfig, FilterState, Persona } from '../types';
import { PLAYBACK_SPEEDS } from '../constants';
import { isDataComplete, getQualityColor } from '../utils/dataUtils';
import Tooltip from './Tooltip';

interface TimelineProps {
  allData: DataPoint[];
  filteredData: DataPoint[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  metricConfig: MetricConfig;
  filters: FilterState;
  onTogglePlay: () => void;
  onSeek: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onFilterChange: (filters: FilterState) => void;
  theme: 'light' | 'dark';
  persona: Persona;
}

const Timeline: React.FC<TimelineProps> = ({
  allData,
  filteredData,
  currentIndex,
  isPlaying,
  playbackSpeed,
  metricConfig,
  filters,
  onTogglePlay,
  onSeek,
  onSpeedChange,
  onFilterChange,
  theme,
  persona
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const seekAreaRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Prepare full dataset for the chart background
  const chartData = useMemo(() => {
    // Apply strict filter if enabled to prevent gaps in the chart
    let sourceData = allData;
    if (filters.onlyCompleteData) {
      sourceData = sourceData.filter(isDataComplete);
    }

    // Sampling for performance if dataset is huge > 2000 points
    const factor = sourceData.length > 2000 ? Math.ceil(sourceData.length / 1000) : 1;
    
    return sourceData.filter((_, i) => i % factor === 0).map((d, i) => ({
      originalIndex: d.id,
      timestamp: d.timestamp,
      value: d[metricConfig.key] as number ?? null,
      date: d.dateStr.split(' ')[1]
    }));
  }, [allData, metricConfig.key, filters.onlyCompleteData]);

  // Calculate brush indices based on global filters
  const [brushState, setBrushState] = useState({ startIndex: 0, endIndex: 0 });

  useEffect(() => {
    if (chartData.length === 0) return;

    let start = 0;
    let end = chartData.length - 1;

    if (filters.startTime) {
        const idx = chartData.findIndex(d => d.timestamp >= filters.startTime!);
        if (idx !== -1) start = idx;
    }
    if (filters.endTime) {
        for(let i = chartData.length - 1; i >= 0; i--) {
            if (chartData[i].timestamp <= filters.endTime!) {
                end = i;
                break;
            }
        }
    }
    setBrushState({ startIndex: start, endIndex: end });
  }, [filters, chartData]);

  const handleBrushChange = (e: any) => {
    if (!e || e.startIndex === undefined || e.endIndex === undefined) return;

    const startItem = chartData[e.startIndex];
    const endItem = chartData[e.endIndex];

    if (startItem && endItem) {
      onFilterChange({
        ...filters,
        startTime: startItem.timestamp,
        endTime: endItem.timestamp
      });
    }
  };

  // --- SEEK INTERACTION LOGIC ---
  const handleSeekInteraction = useCallback((clientX: number) => {
    if (!seekAreaRef.current || filteredData.length === 0) return;
    const rect = seekAreaRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    
    // Calculate percentage of width (0 to 1)
    const percentage = Math.max(0, Math.min(1, x / width));
    
    // Map to index in filteredData
    const newIndex = Math.round(percentage * (filteredData.length - 1));
    onSeek(newIndex);
  }, [filteredData.length, onSeek]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeekInteraction(e.clientX);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection while dragging
        handleSeekInteraction(e.clientX);
      }
    };
    const onMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handleSeekInteraction]);


  // Glassmorphism Theme Application
  // Updated to use higher opacity white for cleaner look while keeping blur
  const glassContainer = theme === 'dark'
    ? 'bg-slate-900/80 border-t md:border border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]'
    : 'bg-white/85 border-t md:border border-white/40 shadow-[0_-4px_30px_rgba(31,38,135,0.15)]';

  const backdropBlur = 'backdrop-blur-2xl';
  
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-800';
  const iconColor = theme === 'dark' ? 'text-cyan-400' : 'text-blue-600';
  
  // New Brush Styling
  const brushStroke = theme === 'dark' ? '#22d3ee' : '#2563eb';
  const brushFill = theme === 'dark' ? '#0f172a' : '#cbd5e1';
  const brushOpacity = theme === 'dark' ? 0.7 : 0.6;

  // Calculate cursor position percentage
  const progressPercent = filteredData.length > 1 
    ? (currentIndex / (filteredData.length - 1)) * 100 
    : 0;

  // Dynamic Color for Cursor based on Risk Profile
  const currentVal = filteredData[currentIndex] ? filteredData[currentIndex][metricConfig.key] as number : null;
  const riskColor = getQualityColor(currentVal, metricConfig.key, persona);

  return (
    <div id="timeline-container" className={`
      w-full pointer-events-auto
      ${glassContainer} ${backdropBlur}
      p-4 flex flex-col gap-2 transition-all z-20
      md:rounded-2xl md:mb-6 md:w-auto md:mx-6
    `}>
      
      {/* Chart Area with Drag-to-Seek Overlay */}
      {/* Changed bg-black/5 to bg-white/50 for a brighter chart background */}
      <div className="h-32 md:h-36 w-full relative select-none group overflow-hidden rounded-lg bg-white/50 dark:bg-white/5" ref={chartContainerRef}>
        <div className="absolute top-0 left-0 text-[10px] font-bold opacity-50 z-20 pointer-events-none flex items-center gap-1 px-1">
            <span>TIMELINE & FILTER</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricConfig.colorMid} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metricConfig.colorLow} stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <XAxis hide /> 
            <YAxis hide domain={[metricConfig.min, metricConfig.max]} />
            
            <Area 
              connectNulls={false}
              type="monotone" 
              dataKey="value" 
              stroke={metricConfig.colorMid} 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            
            {/* Improved Brush: Acts as a focus window at the bottom */}
            <Brush 
                dataKey="originalIndex" 
                height={24} 
                y={115} // Position at very bottom
                stroke={brushStroke}
                fill={brushFill}
                fillOpacity={brushOpacity}
                tickFormatter={() => ''}
                startIndex={brushState.startIndex}
                endIndex={brushState.endIndex}
                onChange={handleBrushChange}
                alwaysShowText={false}
                travellerWidth={6} // Minimalist handle
                className="filter-brush"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* SEEK OVERLAY */}
        <div 
            ref={seekAreaRef}
            className="absolute inset-x-0 top-0 bottom-[30px] z-10 cursor-crosshair"
            onMouseDown={onMouseDown}
            title="Click or drag to seek"
        >
             {/* Hover Highlight */}
             <div className="w-full h-full opacity-0 hover:opacity-100 transition-opacity duration-300 bg-white/5 pointer-events-none" />
        </div>

        {/* Current Position Cursor & Handle */}
        <div 
          className="absolute top-0 bottom-[25px] w-[2px] pointer-events-none transition-all duration-75 z-10 shadow-[0_0_6px_rgba(0,0,0,0.5)]"
          style={{ left: `${progressPercent}%`, backgroundColor: riskColor }}
        >
            {/* Time Bubble (Visible on Drag/Hover) */}
            <div className={`
                absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded 
                text-white text-[10px] font-bold 
                opacity-0 ${isDragging ? 'opacity-100' : 'group-hover:opacity-100'} 
                transition-opacity whitespace-nowrap shadow-sm
            `}
            style={{ backgroundColor: riskColor }}
            >
                {filteredData[currentIndex]?.dateStr.split(' ')[1]}
            </div>

            {/* Drag Handle Dot */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-md" style={{ backgroundColor: riskColor }} />
        </div>
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-between px-1 mt-1">
        
        {/* Left: Speed Controls */}
        <div className="flex items-center gap-1">
             {PLAYBACK_SPEEDS.slice(0, 3).map(speed => (
               <Tooltip key={speed} content={`Set Speed ${speed}x`} theme={theme}>
                   <button
                     onClick={() => onSpeedChange(speed)}
                     className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                       playbackSpeed === speed 
                        ? (theme === 'dark' ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-blue-600 text-white border-blue-500')
                        : (theme === 'dark' ? 'border-white/10 text-slate-500 hover:text-white hover:border-white/30' : 'border-black/10 text-slate-400 hover:text-black hover:border-black/30')
                     }`}
                   >
                     {speed}x
                   </button>
               </Tooltip>
             ))}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-6">
            <Tooltip content="Rewind 20 steps" theme={theme}>
                <button 
                  onClick={() => onSeek(Math.max(0, currentIndex - 20))}
                  className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${iconColor}`}
                >
                  <Rewind size={20} />
                </button>
            </Tooltip>
            
            <Tooltip content={isPlaying ? "Pause Playback" : "Start Playback"} theme={theme}>
                <button 
                  onClick={onTogglePlay}
                  className={`
                    p-4 rounded-full shadow-xl transition-all transform active:scale-95 flex items-center justify-center border border-white/20
                    ${theme === 'dark' 
                        ? 'bg-gradient-to-tr from-cyan-600 to-cyan-400 text-black shadow-cyan-500/20' 
                        : 'bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-blue-500/30'} 
                  `}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
            </Tooltip>

            <Tooltip content="Forward 20 steps" theme={theme}>
                <button 
                  onClick={() => onSeek(Math.min(filteredData.length - 1, currentIndex + 20))}
                  className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${iconColor}`}
                >
                  <FastForward size={20} />
                </button>
            </Tooltip>
        </div>

        {/* Right: Date/Time Info */}
        <div className="flex flex-col items-end">
            <div className={`font-mono text-base font-bold ${textColor}`}>
               {filteredData[currentIndex]?.dateStr.split(' ')[1] || "--:--:--"}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               {filteredData[currentIndex]?.dateStr.split(' ')[0] || "----/--/--"}
            </div>
        </div>
      </div>
      
      {/* Custom CSS style injected for specific SVG Brush overrides */}
      <style>{`
        .filter-brush .recharts-brush-slide {
           fill: none !important;
           stroke-width: 0;
        }
        .filter-brush .recharts-brush-traveller rect {
           fill: ${brushStroke} !important;
           rx: 2px;
           width: 4px;
           transform: translateX(1px);
        }
      `}</style>
    </div>
  );
};

export default Timeline;
