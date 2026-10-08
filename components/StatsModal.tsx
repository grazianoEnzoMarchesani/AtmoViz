
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
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

  const isDark = theme === 'dark';
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const subText = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const hairline = isDark ? 'border-white/10' : 'border-black/10';
  const inputBg = isDark
    ? 'bg-white/5 border-white/15 text-white focus:border-slate-100'
    : 'bg-white/70 border-black/15 text-[#1a1c1e] focus:border-[#1a1c1e]';
  const axis = isDark ? '#a7afb8' : '#50565c';
  const grid = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(26,28,30,0.08)';
  const dotFill = isDark ? '#e6e8ea' : '#1a1c1e';
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ''));

  const tabClass = (active: boolean) => `
    h-11 px-1 text-sm border-b-2 -mb-px transition-colors
    ${active
      ? `font-semibold ${isDark ? 'border-slate-100' : 'border-[#1a1c1e]'}`
      : `border-transparent ${subText} ${isDark ? 'hover:text-white' : 'hover:text-[#1a1c1e]'}`}
  `;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl ${isDark ? 'av-glass-dark' : 'av-glass'} ${ink} animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id="stats-title" className="text-xl font-semibold">Data analysis</h2>
            <p className={`text-sm mt-0.5 ${subText}`}>{data.length} data points in the current selection</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close analysis"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className={`flex gap-6 px-6 mt-3 border-b ${hairline}`}>
            <Tooltip content="View general statistics" theme={theme}>
                <button role="tab" aria-selected={activeTab === 'overview'} onClick={() => setActiveTab('overview')} className={tabClass(activeTab === 'overview')}>
                    Summary
                </button>
            </Tooltip>
            <Tooltip content="Compare two metrics" theme={theme}>
                <button role="tab" aria-selected={activeTab === 'correlations'} onClick={() => setActiveTab('correlations')} className={tabClass(activeTab === 'correlations')}>
                    Correlation
                </button>
            </Tooltip>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">

            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[560px]">
                    <thead>
                      <tr className={`text-right ${subText}`}>
                        <th className="text-left font-medium py-2 pr-4">Metric</th>
                        <th className="font-medium py-2 px-3">Min</th>
                        <th className="font-medium py-2 px-3">Mean</th>
                        <th className="font-medium py-2 px-3">Max</th>
                        <th className="font-medium py-2 pl-4 text-left w-[32%]">Where the mean falls</th>
                        <th className="font-medium py-2 pl-3">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(METRICS).map((metric) => {
                        const stat = statistics[metric.key];
                        if (!stat) return null;

                        const qualityColor = getQualityColor(stat.avg, metric.key);
                        const range = stat.max - stat.min;
                        const avgPercent = range === 0 ? 50 : ((stat.avg - stat.min) / range) * 100;

                        return (
                          <tr key={metric.key} className={`border-t ${hairline} text-right`}>
                            <td className="text-left py-3 pr-4 whitespace-nowrap">
                              <span className="inline-block w-2 h-2 rounded-[2px] mr-2.5 align-middle" style={{ backgroundColor: qualityColor }} />
                              <span className="font-medium">{metric.label}</span>
                              <span className={`ml-1.5 ${subText}`}>{metric.unit}</span>
                            </td>
                            <td className={`py-3 px-3 ${subText}`}>{fmt(stat.min)}</td>
                            <td className="py-3 px-3 font-semibold">{fmt(stat.avg)}</td>
                            <td className={`py-3 px-3 ${subText}`}>{fmt(stat.max)}</td>
                            <td className="py-3 pl-4">
                              <div className={`h-1.5 w-full rounded-full relative ${isDark ? 'bg-white/10' : 'bg-black/10'}`} aria-hidden="true">
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 ${isDark ? 'border-[#181b1f]' : 'border-white'}`}
                                  style={{ left: `${avgPercent}%`, backgroundColor: qualityColor }}
                                />
                              </div>
                            </td>
                            <td className={`py-3 pl-3 ${subText}`}>{stat.count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className={`mt-3 text-sm ${subText}`}>The dot colour is the standard-profile class of the mean value.</p>
                </div>
            )}

            {/* VIEW: CORRELATIONS */}
            {activeTab === 'correlations' && (
                <div className="flex flex-col h-full gap-5">
                    {/* Selectors */}
                    <div className="flex flex-col md:flex-row gap-3 md:items-end">
                        <label className="flex-1">
                            <span className={`text-sm block mb-1 ${subText}`}>X axis</span>
                            <select
                                value={xMetric}
                                onChange={(e) => setXMetric(e.target.value as MetricKey)}
                                className={`w-full h-11 px-3 rounded-xl border outline-none transition-colors ${inputBg}`}
                            >
                                {Object.values(METRICS).map(m => (
                                    <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                                ))}
                            </select>
                        </label>
                        <span className={`hidden md:block pb-3 text-sm ${subText}`}>vs</span>
                        <label className="flex-1">
                            <span className={`text-sm block mb-1 ${subText}`}>Y axis</span>
                            <select
                                value={yMetric}
                                onChange={(e) => setYMetric(e.target.value as MetricKey)}
                                className={`w-full h-11 px-3 rounded-xl border outline-none transition-colors ${inputBg}`}
                            >
                                {Object.values(METRICS).map(m => (
                                    <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {/* Statistics */}
                    {correlationStats && (
                        <dl className={`grid grid-cols-3 border-y ${hairline}`}>
                            <div className="py-3 pr-4">
                                <dt className={`text-sm ${subText}`}>Pearson r</dt>
                                <dd className="text-2xl font-semibold">{correlationStats.r.toFixed(3)}</dd>
                            </div>
                            <div className={`py-3 px-4 border-l ${hairline}`}>
                                <dt className={`text-sm ${subText}`}>R²</dt>
                                <dd className="text-2xl font-semibold">{correlationStats.r2.toFixed(3)}</dd>
                            </div>
                            <div className={`py-3 pl-4 border-l ${hairline}`}>
                                <dt className={`text-sm ${subText}`}>Interpretation</dt>
                                <dd className="text-lg font-semibold leading-tight mt-1">{correlationStats.desc}</dd>
                            </div>
                        </dl>
                    )}

                    {/* Scatter Chart Container */}
                    <div className={`w-full h-[400px] md:h-[450px] rounded-2xl p-2 relative flex-shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-white/60'}`}>
                         {scatterData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart
                                    margin={{ top: 20, right: 30, bottom: 40, left: 40 }}
                                >
                                    <CartesianGrid stroke={grid} />
                                    <XAxis
                                        type="number"
                                        dataKey="x"
                                        name={METRICS[xMetric].label}
                                        unit={METRICS[xMetric].unit}
                                        stroke={axis}
                                        tick={{ fontSize: 12, fill: axis }}
                                        tickLine={{ stroke: axis }}
                                        domain={['auto', 'auto']}
                                    >
                                        <Label
                                            value={`${METRICS[xMetric].label} (${METRICS[xMetric].unit})`}
                                            offset={-20}
                                            position="insideBottom"
                                            style={{ fill: axis, fontSize: '13px', fontWeight: 500 }}
                                        />
                                    </XAxis>
                                    <YAxis
                                        type="number"
                                        dataKey="y"
                                        name={METRICS[yMetric].label}
                                        unit={METRICS[yMetric].unit}
                                        stroke={axis}
                                        tick={{ fontSize: 12, fill: axis }}
                                        tickLine={{ stroke: axis }}
                                        domain={['auto', 'auto']}
                                    >
                                        <Label
                                            value={`${METRICS[yMetric].label} (${METRICS[yMetric].unit})`}
                                            angle={-90}
                                            position="insideLeft"
                                            style={{ fill: axis, fontSize: '13px', fontWeight: 500 }}
                                        />
                                    </YAxis>
                                    <RechartsTooltip
                                        cursor={{ strokeDasharray: '3 3', stroke: axis }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className={`px-3 py-2 rounded-xl text-xs ${isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white'}`}>
                                                        <div className="font-semibold mb-0.5">Point {d.id}</div>
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
                                        fill={dotFill}
                                        fillOpacity={0.45}
                                        isAnimationActive={false}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                         ) : (
                             <div className={`absolute inset-0 flex items-center justify-center text-sm ${subText}`}>
                                 These two metrics have no readings at the same points.
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
