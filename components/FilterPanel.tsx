
import React, { useEffect, useState } from 'react';
import { X, Filter, Calendar, MapPinOff, Maximize2, ShieldCheck } from 'lucide-react';
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

  const bgBase = theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95';
  const textBase = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const borderBase = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const inputBg = theme === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-50 text-slate-900 border-slate-300';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`
        w-full max-w-md flex flex-col rounded-2xl shadow-2xl border
        ${bgBase} ${borderBase} ${textBase}
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderBase}`}>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-500">
               <Filter size={20} />
            </div>
            <h2 className="text-xl font-bold">Filter Data</h2>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-slate-500/20 transition-colors`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {/* Time Range */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider opacity-70">
                        <Calendar size={14} />
                        <span>Time Range</span>
                    </div>
                    <Tooltip content="Reset start/end to full range" theme={theme} position="left">
                        <button 
                            onClick={handleMaximizeTime}
                            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 font-bold border border-cyan-500/30 px-2 py-1 rounded hover:bg-cyan-500/10 transition-colors"
                        >
                            <Maximize2 size={12} />
                            Full Range
                        </button>
                    </Tooltip>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-xs block mb-1 ml-1 opacity-60">Start Time</label>
                        <input 
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                            style={{ colorScheme: theme }}
                        />
                    </div>
                    <div>
                        <label className="text-xs block mb-1 ml-1 opacity-60">End Time</label>
                        <input 
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                            style={{ colorScheme: theme }}
                        />
                    </div>
                </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                {/* Toggle GPS */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${borderBase} ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${hideNoGps ? 'bg-cyan-500 text-black' : 'bg-slate-500/20 text-slate-500'}`}>
                            <MapPinOff size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-sm">Hide Missing GPS</div>
                            <div className="text-xs opacity-60">Exclude points without coordinates</div>
                        </div>
                    </div>
                    
                    <Tooltip content="Toggle GPS Filter" theme={theme} position="left">
                        <button 
                            onClick={() => setHideNoGps(!hideNoGps)}
                            className={`
                                w-12 h-6 rounded-full relative transition-colors duration-300
                                ${hideNoGps ? 'bg-cyan-500' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300')}
                            `}
                        >
                            <div className={`
                                absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300
                                ${hideNoGps ? 'left-7' : 'left-1'}
                            `} />
                        </button>
                    </Tooltip>
                </div>

                {/* Toggle Strict Mode (Complete Data) */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${borderBase} ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${onlyCompleteData ? 'bg-green-500 text-white' : 'bg-slate-500/20 text-slate-500'}`}>
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-sm">Strict Data Mode</div>
                            <div className="text-xs opacity-60">Show only complete datasets (no nulls)</div>
                        </div>
                    </div>
                    
                    <Tooltip content="Toggle Null Value Filter" theme={theme} position="left">
                        <button 
                            onClick={() => setOnlyCompleteData(!onlyCompleteData)}
                            className={`
                                w-12 h-6 rounded-full relative transition-colors duration-300
                                ${onlyCompleteData ? 'bg-green-500' : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300')}
                            `}
                        >
                            <div className={`
                                absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300
                                ${onlyCompleteData ? 'left-7' : 'left-1'}
                            `} />
                        </button>
                    </Tooltip>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${borderBase} flex gap-3`}>
            <Tooltip content="Revert to original state" theme={theme}>
                <button 
                    onClick={handleReset}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                    Reset Defaults
                </button>
            </Tooltip>
            
            <Tooltip content="Save and Close" theme={theme}>
                <button 
                    onClick={handleApply}
                    className="flex-[2] py-3 px-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 transition-colors"
                >
                    Apply Filters
                </button>
            </Tooltip>
        </div>

      </div>
    </div>
  );
};

export default FilterPanel;
