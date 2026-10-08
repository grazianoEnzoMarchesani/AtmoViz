
import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import { toPng } from 'html-to-image';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DataPoint, MetricKey, Persona, QualityRange } from '../types';
import { METRICS, PERSONA_STANDARDS, getQualityColor } from '../utils/dataUtils';
import Tooltip from './Tooltip';
import { formatTime, formatDateTime } from '../utils/timeFormat';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataPoint[];
  theme: 'light' | 'dark';
  persona: Persona;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, data, theme, persona }) => {
  const [step, setStep] = useState<'idle' | 'analyzing' | 'capturing' | 'generating' | 'completed'>('idle');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Prepare data for charts (Downsample if necessary for performance)
  const chartData = useMemo(() => {
    if (!isOpen || data.length === 0) return [];
    
    // Target max points for charts to keep rendering fast and clean
    const MAX_POINTS = 1000;
    const step = Math.ceil(data.length / MAX_POINTS);
    
    return data.filter((_, i) => i % step === 0).map(d => ({
      name: formatTime(d.timestamp), // Just time for X axis
      ...d
    }));
  }, [data, isOpen]);

  // Calculate Stats for Report and Rendering
  const stats = useMemo(() => {
    if (!data.length) return {};
    const s: Record<string, any> = {};
    Object.values(METRICS).forEach(metric => {
      const values = data
        .map(d => d[metric.key] as number | null)
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      
      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        s[metric.key] = { min, max, avg, label: metric.label, unit: metric.unit, key: metric.key };
      }
    });
    return s;
  }, [data]);

  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setError(null);
      setAiSummary('');
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    try {
      setStep('analyzing');
      setError(null);

      const statsStr = JSON.stringify(stats, null, 2);
      const dateRange = `${formatDateTime(data[0]?.timestamp)} to ${formatDateTime(data[data.length - 1]?.timestamp)}`;

      // Determine active standards based on selected Persona
      const activeStandards = PERSONA_STANDARDS[persona];

      // Format Standards for Context
      const standardsContext = Object.entries(activeStandards).map(([key, value]) => {
        const ranges = value as QualityRange[];
        const label = METRICS[key]?.label || key;
        const rangesText = ranges.map(r => 
          `${r.min} to ${r.max} (${r.label})`
        ).join('; ');
        return `- ${label} [${METRICS[key]?.unit}]: ${rangesText}`;
      }).join('\n');

      let finalSummary = "Automated analysis skipped.";

      // 2. Call Gemini for Summary
      if (process.env.API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          You are a senior environmental data analyst using the AtmoViz tool.
          Analyze the following sensor data statistics collected from ${dateRange}.
          
          IMPORTANT: The user has selected the Risk Profile (Persona): "${persona.toUpperCase()}".
          You MUST strictly evaluate the data against the following specific Health Thresholds tailored for this persona:
          ${standardsContext}
          
          Data Statistics:
          ${statsStr}
          
          Please write a concise, professional "Executive Summary" (approx 150 words) for a formal PDF report.
          1. Start by acknowledging the selected risk profile (${persona}).
          2. Summarize the overall air quality conditions, explicitly referencing the defined standards for this persona (e.g. if PM2.5 is 15, for an 'Asthmatic' this might be 'Caution', while for 'Standard' it is 'Good').
          3. Highlight any specific metrics that exceeded the defined limits for this specific persona.
          4. Provide 2-3 brief, actionable recommendations aligned with the observed severity.
          
          Do not use markdown formatting like bold or headers, just plain text paragraphs suitable for a PDF.
        `;

        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          finalSummary = response.text || "No summary available.";
          setAiSummary(finalSummary); 
        } catch (e) {
          console.warn("AI Generation failed", e);
          finalSummary = "AI Summary unavailable. Proceeding with statistical data only.";
          setAiSummary(finalSummary);
        }
      } else {
        finalSummary = "AI Summary unavailable (Missing API Key). Proceeding with statistical data only.";
        setAiSummary(finalSummary);
      }

      setStep('capturing');

      // 3. Capture Map
      await new Promise(r => setTimeout(r, 1500)); // Wait for map tiles
      
      const mapElement = document.getElementById('map-board-container');
      if (!mapElement) throw new Error("Map element not found");

      const mapImgData = await toPng(mapElement, {
        cacheBust: true,
        filter: (node) => {
           if (node instanceof HTMLElement && node.classList.contains('maplibregl-control-container')) {
             return false;
           }
           return true;
        }
      });

      // 4. Capture Charts & Metrics
      const chartsElement = document.getElementById('report-charts-capture');
      const metricsElement = document.getElementById('report-metrics-capture');
      
      let chartsImgData = null;
      let metricsImgData = null;

      if (chartsElement && metricsElement) {
        // Wait for render stability
        await new Promise(r => setTimeout(r, 1000));
        
        const captureOptions = { 
            backgroundColor: '#ffffff',
            style: {
                opacity: '1',
                zIndex: '100',
            }
        };

        chartsImgData = await toPng(chartsElement, { ...captureOptions, width: 1000 });
        metricsImgData = await toPng(metricsElement, { ...captureOptions, width: 1000 });
      }

      setStep('generating');

      // 5. Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      // --- PAGE 1: Overview & Map ---
      doc.setFontSize(22);
      doc.setTextColor(26, 28, 30);
      doc.text("AtmoViz Environmental Report", margin, yPos);
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      doc.text(`Data Range: ${dateRange}`, margin, yPos + 5);
      doc.text(`Risk Profile Applied: ${persona.toUpperCase()}`, margin, yPos + 10);

      yPos += 20;

      // Map Image
      const imgProps = doc.getImageProperties(mapImgData);
      const pdfImgWidth = pageWidth - (margin * 2);
      const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;
      
      doc.addImage(mapImgData, 'PNG', margin, yPos, pdfImgWidth, pdfImgHeight);
      yPos += pdfImgHeight + 15;

      // AI Summary
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Executive Summary", margin, yPos);
      yPos += 7;

      doc.setFontSize(11);
      doc.setTextColor(60);
      const splitSummary = doc.splitTextToSize(finalSummary, pageWidth - (margin * 2));
      doc.text(splitSummary, margin, yPos);
      
      // --- PAGE 2: Charts ---
      if (chartsImgData) {
          doc.addPage();
          const chartImgProps = doc.getImageProperties(chartsImgData);
          const chartPdfWidth = pageWidth - (margin * 2);
          const chartPdfHeight = (chartImgProps.height * chartPdfWidth) / chartImgProps.width;
          
          // Maximize fit
          const maxChartHeight = pageHeight - 40;
          const finalChartHeight = Math.min(chartPdfHeight, maxChartHeight);
          const finalChartWidth = (chartImgProps.width * finalChartHeight) / chartImgProps.height;

          doc.addImage(chartsImgData, 'PNG', margin, 20, finalChartWidth, finalChartHeight);
      }

      // --- PAGE 3: Statistics Cards ---
      if (metricsImgData) {
          doc.addPage();
          const metricImgProps = doc.getImageProperties(metricsImgData);
          const metricPdfWidth = pageWidth - (margin * 2);
          const metricPdfHeight = (metricImgProps.height * metricPdfWidth) / metricImgProps.width;

           // Maximize fit
          const maxMetricHeight = pageHeight - 40;
          const finalMetricHeight = Math.min(metricPdfHeight, maxMetricHeight);
          const finalMetricWidth = (metricImgProps.width * finalMetricHeight) / metricImgProps.height;

          doc.addImage(metricsImgData, 'PNG', margin, 20, finalMetricWidth, finalMetricHeight);
      }

      doc.save(`AtmoViz_Report_${persona}_${new Date().toISOString().split('T')[0]}.pdf`);
      setStep('completed');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate report.");
      setStep('idle');
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const subText = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const hairline = isDark ? 'border-white/10' : 'border-black/10';
  const primaryBtn = isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black';
  const personaLabel = persona.charAt(0).toUpperCase() + persona.slice(1);
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, ''));
  const isWorking = step === 'analyzing' || step === 'generating' || step === 'capturing';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      
      {/* Hidden Container for capturing Charts & Metrics */}
      {/* 
         Strategy: 
         - Fixed positioning to keep it in viewport (solving blank PDF issue)
         - zIndex -9999 & opacity 0 to hide it from user (solving UI clutter issue)
         - html-to-image style override handles the capture visibility
         - Width fixed to 1000px for high-res capture
      */}
      {isOpen && chartData.length > 0 && (
        <div 
            id="report-content-container"
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '1000px', 
                zIndex: -9999,
                opacity: 0,
                pointerEvents: 'none',
                fontFamily: "'Familjen Grotesk', system-ui, sans-serif",
                color: '#1a1c1e',
            }}
        >
            {/* SECTION 1: CHARTS CAPTURE */}
            <div id="report-charts-capture" className="p-10 bg-white">
                <h2 className="text-3xl font-semibold mb-1">Data trends</h2>
                <p className="text-base text-[#50565c] mb-8">{formatDateTime(data[0]?.timestamp)} to {formatDateTime(data[data.length - 1]?.timestamp)}</p>
                <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                    {Object.values(METRICS).map((metric) => (
                        <div key={metric.key} className="flex flex-col border-t border-black/10 pt-4 break-inside-avoid">
                            <div className="flex items-baseline justify-between mb-3">
                                <h4 className="font-semibold text-base">{metric.label}</h4>
                                <span className="text-sm text-[#50565c]">{metric.unit}</span>
                            </div>
                            <div className="w-full flex justify-center">
                                <AreaChart 
                                    width={420} 
                                    height={180} 
                                    data={chartData}
                                >
                                    <defs>
                                        <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={metric.colorMid} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={metric.colorMid} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(26,28,30,0.08)" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        tick={{fontSize: 11, fill: '#50565c'}} 
                                        tickLine={false}
                                        axisLine={false}
                                        width={34}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey={metric.key} 
                                        stroke={metric.colorMid} 
                                        strokeWidth={2}
                                        fill={`url(#grad-${metric.key})`} 
                                        isAnimationActive={false} 
                                    />
                                </AreaChart>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: METRICS CAPTURE (same table as the Data analysis window) */}
            <div id="report-metrics-capture" className="p-10 bg-white mt-10">
                 <h2 className="text-3xl font-semibold mb-1">Key metrics</h2>
                 <p className="text-base text-[#50565c] mb-8">Classes from the {personaLabel} risk profile</p>
                 <table className="w-full text-base border-collapse">
                    <thead>
                      <tr className="text-right text-[#50565c]">
                        <th className="text-left font-medium py-2 pr-4">Metric</th>
                        <th className="font-medium py-2 px-4">Min</th>
                        <th className="font-medium py-2 px-4">Mean</th>
                        <th className="font-medium py-2 px-4">Max</th>
                        <th className="font-medium py-2 pl-6 text-left w-[34%]">Where the mean falls</th>
                      </tr>
                    </thead>
                    <tbody>
                    {Object.values(METRICS).map((metric) => {
                        const stat = stats[metric.key];
                        if (!stat) return null;

                        // IMPORTANT: Use persona specific color here for the generated image
                        const qualityColor = getQualityColor(stat.avg, metric.key, persona);
                        const range = stat.max - stat.min;
                        const avgPercent = range === 0 ? 50 : ((stat.avg - stat.min) / range) * 100;

                        return (
                            <tr key={metric.key} className="border-t border-black/10 text-right">
                                <td className="text-left py-3.5 pr-4">
                                    <span className="inline-block w-2.5 h-2.5 rounded-[2px] mr-3 align-middle" style={{ backgroundColor: qualityColor }} />
                                    <span className="font-medium">{metric.label}</span>
                                    <span className="ml-2 text-[#50565c]">{metric.unit}</span>
                                </td>
                                <td className="py-3.5 px-4 text-[#50565c]">{fmt(stat.min)}</td>
                                <td className="py-3.5 px-4 font-semibold">{fmt(stat.avg)}</td>
                                <td className="py-3.5 px-4 text-[#50565c]">{fmt(stat.max)}</td>
                                <td className="py-3.5 pl-6">
                                    <div className="h-2 w-full rounded-full relative bg-black/10">
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white"
                                            style={{ left: `${avgPercent}%`, backgroundColor: qualityColor }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                 </table>
            </div>
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className={`w-full max-w-lg flex flex-col rounded-3xl ${isDark ? 'av-glass-dark' : 'av-glass'} ${ink} animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id="report-title" className="text-xl font-semibold">PDF report</h2>
            <p className={`text-sm mt-0.5 ${subText}`}>
              Risk profile: <span className={`font-semibold ${ink}`}>{personaLabel}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close report"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
            disabled={step !== 'idle' && step !== 'completed'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col gap-4">
            {step === 'idle' && (
                <>
                   <p className="text-[15px] leading-relaxed">
                      Analyses <strong className="font-semibold">{data.length}</strong> data points against the {personaLabel} thresholds and exports a PDF with:
                   </p>
                   <ol className={`text-[15px] leading-relaxed list-decimal pl-5 space-y-1 ${subText}`}>
                      <li>the current map view and a written summary (Gemini, when an API key is set);</li>
                      <li>one trend chart per metric;</li>
                      <li>a min / mean / max table.</li>
                   </ol>
                </>
            )}

            {isWorking && (
                <div className="flex items-center gap-4 py-2" role="status">
                   <Loader2 size={28} className="animate-spin flex-shrink-0" />
                   <div>
                      <p className="font-semibold">
                        {step === 'analyzing' && `Analysing for the ${personaLabel} profile…`}
                        {step === 'capturing' && 'Capturing map and charts…'}
                        {step === 'generating' && 'Building the PDF…'}
                      </p>
                      <p className={`text-sm ${subText}`}>Keep this window open until the download starts.</p>
                   </div>
                </div>
            )}

            {step === 'completed' && (
                <div className="flex items-center gap-4 py-2" role="status">
                   <CheckCircle size={28} className="text-emerald-600 flex-shrink-0" />
                   <div>
                      <p className="font-semibold">Report downloaded</p>
                      <p className={`text-sm ${subText}`}>Check your downloads folder for the PDF.</p>
                   </div>
                </div>
            )}

            {error && (
                <div role="alert" className={`p-4 rounded-xl text-sm ${isDark ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-800'}`}>
                    <strong className="font-semibold">The report could not be created.</strong> {error}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${hairline} flex justify-end`}>
            {step === 'idle' && (
                <Tooltip content="Analyse and export" theme={theme}>
                    <button 
                        onClick={handleGenerate}
                        className={`h-11 px-6 rounded-xl text-sm font-semibold transition-colors ${primaryBtn}`}
                    >
                        Create PDF
                    </button>
                </Tooltip>
            )}
            
            {step === 'completed' && (
                <button 
                    onClick={onClose}
                    className={`h-11 px-6 rounded-xl text-sm font-medium border transition-colors ${isDark ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/[0.04]'}`}
                >
                    Close
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
