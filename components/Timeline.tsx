
import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Play, Pause, FastForward, Rewind } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip as RechartsTooltip, YAxis, Brush } from 'recharts';
import { DataPoint, MetricConfig, FilterState, Persona } from '../types';
import { PLAYBACK_SPEEDS } from '../constants';
import { isDataComplete, getQualityColor } from '../utils/dataUtils';
import { formatTime, formatDate } from '../utils/timeFormat';
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
      date: formatTime(d.timestamp)
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


  // Neutral glass over the map; colour comes only from the data (class band, cursor dot)
  const isDark = theme === 'dark';
  const glassContainer = isDark ? 'av-glass-dark' : 'av-glass';
  const textColor = isDark ? 'text-white' : 'text-[#1a1c1e]';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const ink = isDark ? '#e6e8ea' : '#1a1c1e';
  const iconBtn = `w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-[#1a1c1e] hover:bg-black/[0.06]'}`;

  // Brush in ink, so it reads as a control and not as data
  const brushStroke = ink;
  const brushFill = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,28,30,0.06)';

  // Track geometry (px): curve + class band on top, filter brush underneath
  const CURVE_H = 40;
  const BRUSH_H = 12;
  const BRUSH_GAP = 4;
  const TRACK_H = CURVE_H + BRUSH_GAP + BRUSH_H;

  // Calculate cursor position percentage
  const progressPercent = filteredData.length > 1 
    ? (currentIndex / (filteredData.length - 1)) * 100 
    : 0;

  // Dynamic Color for Cursor based on Risk Profile
  const currentVal = filteredData[currentIndex] ? filteredData[currentIndex][metricConfig.key] as number : null;
  const riskColor = getQualityColor(currentVal, metricConfig.key, persona);

  // The chart shows only the brush window (Recharts zooms to it), so band and labels use that window too
  const windowData = useMemo(() => {
    if (chartData.length === 0) return chartData;
    const end = brushState.endIndex > 0 ? brushState.endIndex : chartData.length - 1;
    return chartData.slice(brushState.startIndex, end + 1);
  }, [chartData, brushState]);

  // Class band: the quality class over time, as hard colour stops (same getQualityColor, display only)
  const classBand = useMemo(() => {
    const n = windowData.length;
    if (n === 0) return 'transparent';
    const colorAt = (i: number) => {
      const v = windowData[i].value;
      return v === null || v === undefined ? 'transparent' : getQualityColor(v, metricConfig.key, persona);
    };
    const stops: string[] = [];
    let runColor = colorAt(0);
    let runStart = 0;
    for (let i = 1; i <= n; i++) {
      const c = i < n ? colorAt(i) : null;
      if (c !== runColor) {
        const from = (runStart / n) * 100;
        const to = (i / n) * 100;
        stops.push(`${runColor} ${from.toFixed(2)}%`, `${runColor} ${to.toFixed(2)}%`);
        runColor = c as string;
        runStart = i;
      }
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [windowData, metricConfig.key, persona]);

  const firstTs = chartData[0]?.timestamp;
  const lastTs = chartData[chartData.length - 1]?.timestamp;
  const windowStartTs = windowData[0]?.timestamp;
  const windowEndTs = windowData[windowData.length - 1]?.timestamp;
  const isFiltered = windowData.length > 0 && windowData.length < chartData.length;
  const filterLabel = isFiltered
    ? `${metricConfig.label} · filtered, full route ${formatTime(firstTs)}–${formatTime(lastTs)}`
    : `${metricConfig.label} · drag the handles to filter`;

  const currentTime = formatTime(filteredData[currentIndex]?.timestamp);

  return (
    <div id="timeline-container" className={`
      w-full pointer-events-auto ${glassContainer} ${textColor}
      px-3 py-3 md:px-4 transition-all z-20
      rounded-t-2xl md:rounded-2xl md:mb-5 md:w-auto md:mx-5
      flex flex-wrap items-center gap-x-2 md:gap-x-4 gap-y-2
    `}>

      {/* Playback */}
      <div className="flex items-center gap-1">
        <Tooltip content={isPlaying ? "Pause playback" : "Start playback"} theme={theme}>
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
        </Tooltip>
        <Tooltip content="Back 20 steps" theme={theme}>
          <button onClick={() => onSeek(Math.max(0, currentIndex - 20))} aria-label="Back 20 steps" className={iconBtn}>
            <Rewind size={18} />
          </button>
        </Tooltip>
        <Tooltip content="Forward 20 steps" theme={theme}>
          <button onClick={() => onSeek(Math.min(filteredData.length - 1, currentIndex + 20))} aria-label="Forward 20 steps" className={iconBtn}>
            <FastForward size={18} />
          </button>
        </Tooltip>
      </div>

      {/* Track: full width on phones (first row), flexible on desktop */}
      <div className="order-first basis-full md:order-none md:basis-0 md:flex-1 min-w-0">
        <div className="relative select-none group" style={{ height: TRACK_H }} ref={chartContainerRef}>
          {/* Class band behind the curve */}
          <div
            className="absolute inset-x-0 top-0 rounded-lg pointer-events-none"
            style={{ height: CURVE_H, backgroundImage: classBand, opacity: isDark ? 0.32 : 0.26 }}
            aria-hidden="true"
          />

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis hide />
              {/* Floor at the metric minimum, ceiling just above the recorded peak: the curve stays readable in 40 px */}
              <YAxis hide domain={[metricConfig.min, (dataMax: number) => Math.min(metricConfig.max, metricConfig.min + (dataMax - metricConfig.min) * 1.15 || metricConfig.max)]} />
              <Area
                connectNulls={false}
                type="monotone"
                dataKey="value"
                stroke={ink}
                strokeWidth={1.5}
                fill={ink}
                fillOpacity={isDark ? 0.10 : 0.07}
                isAnimationActive={false}
              />
              {/* Filter window: drag the end handles to restrict the time range */}
              <Brush
                dataKey="originalIndex"
                height={BRUSH_H}
                y={CURVE_H + BRUSH_GAP}
                stroke={brushStroke}
                fill={brushFill}
                tickFormatter={() => ''}
                startIndex={brushState.startIndex}
                endIndex={brushState.endIndex}
                onChange={handleBrushChange}
                alwaysShowText={false}
                travellerWidth={8}
                className="filter-brush"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* SEEK OVERLAY (curve area only, the brush stays draggable) */}
          <div
            ref={seekAreaRef}
            className="absolute inset-x-0 top-0 z-10 cursor-crosshair rounded-lg"
            style={{ height: CURVE_H }}
            onMouseDown={onMouseDown}
            title="Click or drag to seek"
          >
            <div className={`w-full h-full rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`} />
          </div>

          {/* Current Position Cursor & Handle */}
          <div
            className="absolute top-0 w-[2px] pointer-events-none z-10"
            style={{ left: `${progressPercent}%`, height: CURVE_H, backgroundColor: ink, transform: 'translateX(-1px)' }}
          >
            {/* Time bubble (visible on drag/hover) */}
            <div
              className={`
                absolute bottom-full mb-1.5 px-2 py-1 rounded-lg
                ${progressPercent < 8 ? 'left-0 -translate-x-1' : progressPercent > 92 ? 'right-0 translate-x-1' : 'left-1/2 -translate-x-1/2'}
                text-[11px] font-semibold whitespace-nowrap
                ${isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white'}
                opacity-0 ${isDragging ? 'opacity-100' : 'group-hover:opacity-100'} transition-opacity
              `}
            >
              {currentTime}
            </div>
            {/* Dot in the class colour of the current reading */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${isDark ? 'border-[#181b1f]' : 'border-white'}`}
              style={{ backgroundColor: riskColor }}
            />
          </div>
        </div>

        <div className={`flex items-center justify-between gap-3 mt-1 text-[11px] ${muted}`}>
          <span>{formatTime(windowStartTs) || ''}</span>
          <span className="truncate">{filterLabel}</span>
          <span>{formatTime(windowEndTs) || ''}</span>
        </div>
      </div>

      {/* Current time */}
      <div className="ml-auto md:ml-0 text-right min-w-[70px] md:min-w-[84px]">
        <div className="text-[17px] leading-tight font-semibold">{currentTime || '--:--:--'}</div>
        <div className={`text-xs ${muted}`}>{formatDate(filteredData[currentIndex]?.timestamp) || '----/--/--'}</div>
      </div>

      {/* Speed */}
      <div role="group" aria-label="Playback speed" className={`flex items-center gap-0.5 p-0.5 rounded-xl ${isDark ? 'bg-white/10' : 'bg-black/[0.06]'}`}>
        {PLAYBACK_SPEEDS.slice(0, 3).map(speed => (
          <Tooltip key={speed} content={`Set speed ${speed}×`} theme={theme}>
            <button
              onClick={() => onSpeedChange(speed)}
              aria-pressed={playbackSpeed === speed}
              className={`h-8 min-w-[34px] md:min-w-[38px] px-1.5 md:px-2 text-[13px] rounded-[10px] transition-colors ${
                playbackSpeed === speed
                  ? (isDark ? 'bg-slate-100 text-[#1a1c1e] font-semibold' : 'bg-white text-[#1a1c1e] font-semibold shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-[#50565c] hover:text-[#1a1c1e]')
              }`}
            >
              {speed}×
            </button>
          </Tooltip>
        ))}
      </div>

      {/* Brush overrides: thin rounded track, ink handles, selected window lightly filled */}
      <style>{`
        .filter-brush > rect:first-of-type {
           stroke: none !important;
           rx: 6px;
        }
        .filter-brush .recharts-brush-slide {
           fill: ${ink} !important;
           fill-opacity: ${isDark ? 0.18 : 0.12} !important;
           stroke: none !important;
        }
        .filter-brush .recharts-brush-traveller rect {
           fill: ${brushStroke} !important;
           stroke: none !important;
           rx: 3px;
           width: 6px;
           transform: translateX(1px);
        }
        .filter-brush .recharts-brush-traveller line { display: none; }
      `}</style>
    </div>
  );
};

export default Timeline;
