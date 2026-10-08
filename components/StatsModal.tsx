
import React, { useMemo, useState } from 'react';
import { X, BarChart2, ArrowDownToLine, ArrowUpToLine, TrendingUp, Activity, LayoutGrid, Calculator, Info } from 'lucide-react';
import { DataPoint, MetricKey } from '../types';
import { METRICS, getQualityColor } from '../utils/dataUtils';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Label } from 'recharts';
import Tooltip from './Tooltip';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataPoint[];
  theme: 'light' | 'dark';
}

interface MetricStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, data, theme }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'correlations'>('overview');
  const [xMetric, setXMetric] = useState<MetricKey>('temp');
  const [yMetric, setYMetric] = useState<MetricKey>('humidity');
  
  const statistics = useMemo(() => {
    const stats: Record<string, MetricStats | null> = {};

    Object.values(METRICS).forEach(metric => {
      const values = data
        .map(d => d[metric.key] as number | null)
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      if (values.length === 0) {
        stats[metric.key] = null;
        return;
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / values.length;

      stats[metric.key] = { min, max, avg, count: values.length };
    });

    return stats;
  }, [data]);

  // Prepare Scatter Plot Data
  const scatterData = useMemo(() => {
    return data
      .filter(d => d[xMetric] != null && d[yMetric] != null)
      .map(d => ({
        x: d[xMetric] as number,
        y: d[yMetric] as number,
        id: d.id
      }));
  }, [data, xMetric, yMetric]);

  // Calculate Pearson Correlation and R-Squared
  const correlationStats = useMemo(() => {
    const n = scatterData.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const valX = scatterData[i].x;
      const valY = scatterData[i].y;
      sumX += valX;
      sumY += valY;
      sumXY += valX * valY;
      sumX2 += valX * valX;
      sumY2 += valY * valY;
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return { r: 0, r2: 0, desc: "Undefined" };

    const r = numerator / denominator;
    const r2 = r * r;

    // Interpretation
    let strength = "";
    const absR = Math.abs(r);
    if (absR < 0.2) strength = "Negligible";
    else if (absR < 0.4) strength = "Weak";
    else if (absR < 0.6) strength = "Moderate";
    else if (absR < 0.8) strength = "Strong";
    else strength = "Very Strong";

    const direction = r > 0 ? "Positive" : "Negative";
    const desc = `${strength} ${direction}`;

    return { r, r2, desc };
  }, [scatterData]);

  if (!isOpen) return null;

  const bgBase = theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95';
  const textBase = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const borderBase = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const cardBg = theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50';
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const inputBg = theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`
        w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border
        ${bgBase} ${borderBase} ${textBase} animate-in fade-in zoom-in-95 duration-200
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 pb-0`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-full text-purple-500">
               <BarChart2 size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold">Data Analysis</h2>
                <p className={`text-sm ${subText}`}>
                    {data.length} data points selected
                </p>
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
        <div className={`flex gap-6 px-6 mt-6 border-b ${borderBase}`}>
            <Tooltip content="View General Statistics" theme={theme}>
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2
                        ${activeTab === 'overview' 
                            ? 'border-purple-500 text-purple-500' 
                            : 'border-transparent opacity-50 hover:opacity-100'}
                    `}
                >
                    <LayoutGrid size={16} />
                    Summary Stats
                </button>
            </Tooltip>
            
            <Tooltip content="Compare Two Metrics" theme={theme}>
                <button 
                    onClick={() => setActiveTab('correlations')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2
                        ${activeTab === 'correlations' 
                            ? 'border-cyan-500 text-cyan-500' 
                            : 'border-transparent opacity-50 hover:opacity-100'}
                    `}
                >
                    <TrendingUp size={16} />
                    Correlation Plot
                </button>
            </Tooltip>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(METRICS).map((metric) => {
                        const stat = statistics[metric.key];
                        if (!stat) return null;

                        const qualityColor = getQualityColor(stat.avg, metric.key);
                        const range = stat.max - stat.min;
                        const avgPercent = range === 0 ? 50 : ((stat.avg - stat.min) / range) * 100;

                        return (
                            <div 
                                key={metric.key}
                                className={`p-4 rounded-xl border ${borderBase} ${cardBg} flex flex-col gap-3 relative overflow-hidden group`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${subText}`}>{metric.label}</span>
                                    </div>
                                    <span className="text-[10px] font-mono opacity-50 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                        {metric.unit}
                                    </span>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span 
                                        className="text-3xl font-bold font-mono" 
                                        style={{ color: qualityColor }}
                                    >
                                        {stat.avg.toFixed(1)}
                                    </span>
                                    <span className={`text-xs font-bold ${subText}`}>AVG</span>
                                </div>

                                <div className={`grid grid-cols-2 gap-2 text-xs mt-1 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDownToLine size={12} className="opacity-50" />
                                        <span className={subText}>Min:</span>
                                        <span className="font-mono font-bold">{stat.min}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <span className={subText}>Max:</span>
                                        <span className="font-mono font-bold">{stat.max}</span>
                                        <ArrowUpToLine size={12} className="opacity-50" />
                                    </div>
                                </div>

                                <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-30" style={{ backgroundColor: qualityColor }}></div>
                                    <div 
                                        className="absolute top-0 bottom-0 w-1 bg-white dark:bg-black shadow-sm ring-1 ring-black/10 dark:ring-white/20"
                                        style={{ left: `${avgPercent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW: CORRELATIONS */}
            {activeTab === 'correlations' && (
                <div className="flex flex-col h-full gap-6">
                    {/* Selectors */}
                    <div className={`p-4 rounded-xl border ${borderBase} ${cardBg} flex flex-col lg:flex-row gap-6 items-start lg:items-center flex-shrink-0`}>
                        
                        {/* Left: Selectors */}
                        <div className="flex flex-col md:flex-row gap-4 items-center flex-1 w-full">
                            <div className="flex items-center gap-3 w-full">
                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                    <Activity size={18} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase opacity-60 mb-1 block">X Axis Metric</label>
                                    <select 
                                        value={xMetric}
                                        onChange={(e) => setXMetric(e.target.value as MetricKey)}
                                        className={`w-full p-2 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                                    >
                                        {Object.values(METRICS).map(m => (
                                            <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="hidden md:block text-slate-400 font-bold px-2">VS</div>

                            <div className="flex items-center gap-3 w-full">
                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                    <Activity size={18} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase opacity-60 mb-1 block">Y Axis Metric</label>
                                    <select 
                                        value={yMetric}
                                        onChange={(e) => setYMetric(e.target.value as MetricKey)}
                                        className={`w-full p-2 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                                    >
                                        {Object.values(METRICS).map(m => (
                                            <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Panel */}
                    {correlationStats && (
                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
                            <div className={`p-3 rounded-xl border ${borderBase} ${cardBg} flex flex-col items-center justify-center`}>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-60 mb-1">
                                    <Calculator size={12} /> Pearson (r)
                                </div>
                                <div className={`text-2xl font-mono font-bold ${correlationStats.r > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {correlationStats.r.toFixed(3)}
                                </div>
                            </div>
                             <div className={`p-3 rounded-xl border ${borderBase} ${cardBg} flex flex-col items-center justify-center`}>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-60 mb-1">
                                    <TrendingUp size={12} /> R Squared (R²)
                                </div>
                                <div className="text-2xl font-mono font-bold text-blue-500">
                                    {correlationStats.r2.toFixed(3)}
                                </div>
                            </div>
                             <div className={`p-3 rounded-xl border ${borderBase} ${cardBg} flex flex-col items-center justify-center`}>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase opacity-60 mb-1">
                                    <Info size={12} /> Interpretation
                                </div>
                                <div className="text-lg font-bold text-center">
                                    {correlationStats.desc}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scatter Chart Container */}
                    <div className="w-full h-[400px] md:h-[450px] bg-white/50 dark:bg-white/5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-2 relative flex-shrink-0">
                         {scatterData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart 
                                    margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} opacity={theme === 'dark' ? 0.4 : 1} />
                                    <XAxis 
                                        type="number" 
                                        dataKey="x" 
                                        name={METRICS[xMetric].label} 
                                        unit={METRICS[xMetric].unit}
                                        stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'}
                                        tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
                                        tickLine={{ stroke: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
                                        domain={['auto', 'auto']}
                                    >
                                        <Label 
                                            value={`${METRICS[xMetric].label} (${METRICS[xMetric].unit})`} 
                                            offset={-20} 
                                            position="insideBottom" 
                                            style={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: '12px', fontWeight: 'bold' }} 
                                        />
                                    </XAxis>
                                    <YAxis 
                                        type="number" 
                                        dataKey="y" 
                                        name={METRICS[yMetric].label} 
                                        unit={METRICS[yMetric].unit}
                                        stroke={theme === 'dark' ? '#cbd5e1' : '#64748b'}
                                        tick={{ fontSize: 12, fill: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
                                        tickLine={{ stroke: theme === 'dark' ? '#cbd5e1' : '#64748b' }}
                                        domain={['auto', 'auto']}
                                    >
                                        <Label 
                                            value={`${METRICS[yMetric].label} (${METRICS[yMetric].unit})`} 
                                            angle={-90} 
                                            position="insideLeft" 
                                            style={{ fill: theme === 'dark' ? '#cbd5e1' : '#64748b', fontSize: '12px', fontWeight: 'bold' }} 
                                        />
                                    </YAxis>
                                    <RechartsTooltip 
                                        cursor={{ strokeDasharray: '3 3', stroke: theme === 'dark' ? '#94a3b8' : '#ccc' }} 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className={`p-3 rounded shadow-lg border text-xs ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                                                        <div className="font-bold mb-1 text-cyan-500">Point ID: {d.id}</div>
                                                        <div>{METRICS[xMetric].label}: {Number(d.x).toFixed(2)} {METRICS[xMetric].unit}</div>
                                                        <div>{METRICS[yMetric].label}: {Number(d.y).toFixed(2)} {METRICS[yMetric].unit}</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Scatter 
                                        name="Correlation" 
                                        data={scatterData} 
                                        fill={theme === 'dark' ? '#22d3ee' : '#0284c7'} 
                                        fillOpacity={theme === 'dark' ? 0.8 : 0.6}
                                        isAnimationActive={false}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className={`absolute inset-0 flex items-center justify-center opacity-50 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                 No overlapping data found for these metrics.
                             </div>
                         )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default StatsModal;
