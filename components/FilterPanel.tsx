
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FilterState } from '../types';
import Tooltip from './Tooltip';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
  theme: 'light' | 'dark';
  minTimestamp: number;
  maxTimestamp: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  theme,
  minTimestamp,
  maxTimestamp
}) => {
  // Local state for inputs
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [hideNoGps, setHideNoGps] = useState<boolean>(filters.hideNoGps);
  const [onlyCompleteData, setOnlyCompleteData] = useState<boolean>(filters.onlyCompleteData || false);

  // Helper to format timestamp to YYYY-MM-DDTHH:mm for datetime-local input
  const formatForInput = (ts: number | null) => {
    if (!ts) return '';
    const date = new Date(ts);
    // Adjust for local timezone is tricky with native inputs, simplistic approach:
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  // Helper to parse input back to timestamp
  const parseInput = (val: string): number | null => {
    if (!val) return null;
    return new Date(val).getTime();
  };

  // Initialize local state from props when opened or props change
  useEffect(() => {
    if (isOpen) {
        // Default to min/max if filter is null, otherwise use filter value
        setStartTime(formatForInput(filters.startTime || minTimestamp));
        setEndTime(formatForInput(filters.endTime || maxTimestamp));
        setHideNoGps(filters.hideNoGps);
        setOnlyCompleteData(filters.onlyCompleteData || false);
    }
  }, [isOpen, filters, minTimestamp, maxTimestamp]);

  const handleApply = () => {
    const start = parseInput(startTime);
    const end = parseInput(endTime);
    
    onApplyFilters({
        startTime: start,
        endTime: end,
        hideNoGps: hideNoGps,
        onlyCompleteData: onlyCompleteData
    });
    onClose();
  };

  const handleReset = () => {
      setStartTime(formatForInput(minTimestamp));
      setEndTime(formatForInput(maxTimestamp));
      setHideNoGps(true);
      setOnlyCompleteData(false);
  };
  
  const handleMaximizeTime = () => {
      setStartTime(formatForInput(minTimestamp));
      setEndTime(formatForInput(maxTimestamp));
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const hairline = isDark ? 'border-white/10' : 'border-black/10';
  const inputBg = isDark
    ? 'bg-white/5 text-white border-white/15 focus:border-slate-100'
    : 'bg-white/70 text-[#1a1c1e] border-black/15 focus:border-[#1a1c1e]';
  const primaryBtn = isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black';
  const switchOn = isDark ? 'bg-slate-100' : 'bg-[#1a1c1e]';
  const switchOff = isDark ? 'bg-white/20' : 'bg-black/20';
  const knobOn = isDark ? 'bg-[#1a1c1e]' : 'bg-white';

  // Plain render helper (not a component), so the switch keeps focus across re-renders
  const renderToggle = ({ checked, onToggle, title, hint, tooltip }: { checked: boolean; onToggle: () => void; title: string; hint: string; tooltip: string }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className={`text-sm ${muted}`}>{hint}</div>
      </div>
      <Tooltip content={tooltip} theme={theme} position="left">
        <button
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={onToggle}
          className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${checked ? switchOn : switchOff}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${checked ? `left-6 ${knobOn}` : 'left-1 bg-white'}`} />
        </button>
      </Tooltip>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-title"
        className={`w-full max-w-md flex flex-col rounded-3xl ${isDark ? 'av-glass-dark' : 'av-glass'} ${ink}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 id="filter-title" className="text-xl font-semibold">Filter data</h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-2">
            {/* Time Range */}
            <div className="flex items-baseline justify-between pt-2">
                <h3 className="text-sm font-semibold">Time range</h3>
                <Tooltip content="Reset start/end to full range" theme={theme} position="left">
                    <button
                        onClick={handleMaximizeTime}
                        className="text-sm underline underline-offset-2 hover:no-underline"
                    >
                        Use full range
                    </button>
                </Tooltip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <label className="block">
                    <span className={`text-sm block mb-1 ${muted}`}>Start</span>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`w-full h-11 px-3 rounded-xl border outline-none transition-colors ${inputBg}`}
                        style={{ colorScheme: theme }}
                    />
                </label>
                <label className="block">
                    <span className={`text-sm block mb-1 ${muted}`}>End</span>
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={`w-full h-11 px-3 rounded-xl border outline-none transition-colors ${inputBg}`}
                        style={{ colorScheme: theme }}
                    />
                </label>
            </div>

            {/* Toggles */}
            <div className={`mt-5 border-t ${hairline} divide-y ${isDark ? 'divide-white/10' : 'divide-black/10'}`}>
                {renderToggle({
                    checked: hideNoGps,
                    onToggle: () => setHideNoGps(!hideNoGps),
                    title: 'Hide points without GPS',
                    hint: 'Exclude readings that have no coordinates',
                    tooltip: 'Toggle GPS filter',
                })}
                {renderToggle({
                    checked: onlyCompleteData,
                    onToggle: () => setOnlyCompleteData(!onlyCompleteData),
                    title: 'Complete readings only',
                    hint: 'Show only points where every sensor has a value',
                    tooltip: 'Toggle null value filter',
                })}
            </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${hairline} flex items-center justify-end gap-2`}>
            <Tooltip content="Revert to original state" theme={theme}>
                <button
                    onClick={handleReset}
                    className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
                >
                    Reset defaults
                </button>
            </Tooltip>
            <Tooltip content="Save and close" theme={theme}>
                <button
                    onClick={handleApply}
                    className={`h-11 px-6 rounded-xl text-sm font-semibold transition-colors ${primaryBtn}`}
                >
                    Apply filters
                </button>
            </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
