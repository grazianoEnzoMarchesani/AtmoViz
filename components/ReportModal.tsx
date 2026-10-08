
import React, { useState, useEffect, useMemo } from 'react';
import { X, FileText, Download, Loader2, BrainCircuit, CheckCircle, BarChart3, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from "jspdf";
import { toPng } from 'html-to-image';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DataPoint, MetricKey, Persona, QualityRange } from '../types';
import { METRICS, PERSONA_STANDARDS, getQualityColor } from '../utils/dataUtils';
import Tooltip from './Tooltip';

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
      name: d.dateStr.split(' ')[1], // Just time for X axis
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
        .filter((v): v is number => v !== null);
      
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
      const dateRange = `${data[0]?.dateStr} to ${data[data.length - 1]?.dateStr}`;

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
           if (node instanceof HTMLElement && node.classList.contains('leaflet-control-container')) {
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
      doc.setTextColor(0, 150, 255);
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

  const bgBase = theme === 'dark' ? 'bg-slate-900/95' : 'bg-white/95';
  const textBase = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const borderBase = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      
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
            }}
        >
            {/* SECTION 1: CHARTS CAPTURE */}
            <div id="report-charts-capture" className="p-10 bg-white">
                <h2 className="text-3xl font-bold text-slate-800 mb-8 border-b pb-4">Detailed Data Trends</h2>
                <div className="grid grid-cols-2 gap-8">
                    {Object.values(METRICS).map((metric) => (
                        <div key={metric.key} className="flex flex-col border border-slate-200 rounded-2xl p-5 bg-slate-50/50 shadow-sm break-inside-avoid">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-slate-700 uppercase text-sm">{metric.label}</h4>
                                <span className="text-xs font-mono font-bold text-slate-500 bg-white px-2 py-1 rounded border">{metric.unit}</span>
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        tick={{fontSize: 10, fill: '#94a3b8'}} 
                                        tickLine={false}
                                        axisLine={false}
                                        width={30}
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

            {/* SECTION 2: METRICS CAPTURE (Styled like App Cards) */}
            <div id="report-metrics-capture" className="p-10 bg-white mt-10">
                 <h2 className="text-3xl font-bold text-slate-800 mb-8 border-b pb-4">Key Metrics Analysis ({persona.toUpperCase()})</h2>
                 <div className="grid grid-cols-3 gap-6">
                    {Object.values(METRICS).map((metric) => {
                        const stat = stats[metric.key];
                        if (!stat) return null;

                        // IMPORTANT: Use persona specific color here for the generated image
                        const qualityColor = getQualityColor(stat.avg, metric.key, persona);
                        const range = stat.max - stat.min;
                        const avgPercent = range === 0 ? 50 : ((stat.avg - stat.min) / range) * 100;

                        return (
                            <div 
                                key={metric.key}
                                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-4 relative overflow-hidden"
                            >
                                {/* Card Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                        {metric.unit}
                                    </span>
                                </div>

                                {/* Big Value */}
                                <div className="flex items-baseline gap-1">
                                    <span 
                                        className="text-4xl font-bold font-mono tracking-tight" 
                                        style={{ color: qualityColor }}
                                    >
                                        {stat.avg.toFixed(1)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase">AVG</span>
                                </div>

                                {/* Min/Max Stats */}
                                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <ArrowDownToLine size={14} className="text-slate-400" />
                                        <span className="font-mono font-bold">{stat.min}</span>
                                        <span className="text-[10px] opacity-60">MIN</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-[10px] opacity-60">MAX</span>
                                        <span className="font-mono font-bold">{stat.max}</span>
                                        <ArrowUpToLine size={14} className="text-slate-400" />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-1 h-2 w-full bg-slate-100 rounded-full relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: qualityColor }}></div>
                                    <div 
                                        className="absolute top-0 bottom-0 w-1.5 bg-white shadow-sm ring-1 ring-black/10 rounded-full"
                                        style={{ left: `${avgPercent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
      )}

      <div className={`
        w-full max-w-lg flex flex-col rounded-2xl shadow-2xl border
        ${bgBase} ${borderBase} ${textBase} animate-in fade-in zoom-in-95 duration-200
      `}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${borderBase}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-full text-red-500">
               <FileText size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold">Generate Report</h2>
                <p className={`text-sm ${subText}`}>
                    Create a PDF summary tailored to: <span className="font-bold uppercase text-cyan-500">{persona}</span>
                </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-slate-500/20 transition-colors`}
            disabled={step !== 'idle' && step !== 'completed'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center space-y-6">
            
            {step === 'idle' && (
                <>
                   <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                      <FileText size={40} className="text-slate-400" />
                   </div>
                   <p className={`${subText}`}>
                      This will analyze <strong>{data.length}</strong> data points against the <strong>{persona}</strong> health standards, generate a professional summary using Gemini AI, capture charts & maps, and export a complete PDF file.
                   </p>
                </>
            )}

            {(step === 'analyzing' || step === 'generating' || step === 'capturing') && (
                <>
                   <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                      <Loader2 size={48} className="text-cyan-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <BrainCircuit size={20} className="text-cyan-500" />
                      </div>
                   </div>
                   <div>
                      <h3 className="font-bold text-lg animate-pulse">
                        {step === 'analyzing' && `Analyzing for ${persona}...`}
                        {step === 'capturing' && "Capturing Visuals..."}
                        {step === 'generating' && "Compiling PDF..."}
                      </h3>
                      <p className={`text-sm ${subText} mt-2`}>Please do not close this window.</p>
                   </div>
                </>
            )}

            {step === 'completed' && (
                <>
                   <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle size={40} className="text-green-500" />
                   </div>
                   <h3 className="font-bold text-lg">Report Ready!</h3>
                   <p className={`${subText}`}>
                      Your PDF report has been downloaded successfully.
                   </p>
                </>
            )}

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-left w-full">
                    <strong>Error:</strong> {error}
                </div>
            )}

        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${borderBase} flex justify-end`}>
            {step === 'idle' && (
                <Tooltip content="Analyze with Gemini AI & Export" theme={theme}>
                    <button 
                        onClick={handleGenerate}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 transition-colors"
                    >
                        <BrainCircuit size={18} />
                        Generate AI Report
                    </button>
                </Tooltip>
            )}
            
            {step === 'completed' && (
                <button 
                    onClick={onClose}
                    className={`px-6 py-3 rounded-xl font-bold border transition-colors ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
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
