import React, { useCallback, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, Map, Clock, BarChart3, Activity, X, Database, Camera, FolderOpen, Images } from 'lucide-react';
import { parseCSVData, parseExcelFile, convertExcelToDataPoints } from '../utils/dataUtils';
import { processImageFiles } from '../utils/exifUtils';
import { DataPoint, GeoPhoto } from '../types';
import Tooltip from './Tooltip';

interface FileUploadProps {
  onDataLoaded: (data: DataPoint[]) => void;
  onSupplementaryLoaded: (rows: any[]) => void;
  onPhotosLoaded: (photos: GeoPhoto[], statusMsg?: string) => void;
  hasExistingGps: boolean;
  onClose?: () => void;
  theme: 'light' | 'dark';
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onDataLoaded, 
  onSupplementaryLoaded, 
  onPhotosLoaded,
  hasExistingGps, 
  onClose, 
  theme 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'gps' | 'sensors' | 'photos'>('gps');

  const handlePhotoFiles = async (fileList: FileList | File[]) => {
    setIsLoading(true);
    setError(null);
    const filesArray = Array.from(fileList);
    
    try {
      const result = await processImageFiles(filesArray);
      
      if (result.photos.length === 0) {
        if (result.totalProcessed === 0) {
          throw new Error("Nessun file immagine valido trovato nella selezione.");
        } else {
          throw new Error(`Analizzate ${result.totalProcessed} immagini, ma nessuna conteneva coordinate GPS nei metadati EXIF.`);
        }
      }
      
      const statusMsg = `Incorporate ${result.photos.length} foto con GPS EXIF su ${result.totalProcessed} immagini analizzate.`;
      setTimeout(() => {
        onPhotosLoaded(result.photos, statusMsg);
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Errore durante la lettura dei metadati EXIF.");
      setIsLoading(false);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const isCsv = file.name.endsWith('.csv');
      
      if (!isExcel && !isCsv) {
         throw new Error("Formato file non supportato. Carica un file .xlsx, .xls o .csv");
      }
      
      if (uploadMode === 'sensors') {
         if (!hasExistingGps) {
            throw new Error("Devi prima caricare un percorso con coordinate GPS per poter allineare questi dati.");
         }
         const arrayBuffer = await file.arrayBuffer();
         const parsedRows = await parseExcelFile(arrayBuffer);
         if (parsedRows.length === 0) {
            throw new Error("Nessun dato valido trovato nel file Excel o CSV.");
         }
         
         setTimeout(() => {
           onSupplementaryLoaded(parsedRows);
           setIsLoading(false);
         }, 800);
      } else {
         if (isExcel) {
            const arrayBuffer = await file.arrayBuffer();
            const excelRows = await parseExcelFile(arrayBuffer);
            const hasGps = excelRows.some(r => r.lat !== null && r.lng !== null);
            if (!hasGps) {
               throw new Error("Questo file non contiene coordinate GPS. Se vuoi caricare dati di sensori senza GPS, usa la scheda 'Dati Centralina'.");
            }
            const dataPoints = convertExcelToDataPoints(excelRows);
            setTimeout(() => {
              onDataLoaded(dataPoints);
              setIsLoading(false);
            }, 800);
         } else {
            const text = await file.text();
            const data = await parseCSVData(text);
            if (data.length === 0) {
              throw new Error("Nessun dato di geolocalizzazione valido trovato nel file CSV.");
            }
            setTimeout(() => {
              onDataLoaded(data);
              setIsLoading(false);
            }, 800);
         }
      }
    } catch (err: any) {
      setError(err.message || "Errore nel caricamento del file.");
      setIsLoading(false);
    }
  }, [uploadMode, hasExistingGps, onDataLoaded, onSupplementaryLoaded]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (uploadMode === 'photos') {
        handlePhotoFiles(e.dataTransfer.files);
      } else {
        handleFile(e.dataTransfer.files[0]);
      }
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (uploadMode === 'photos') {
        handlePhotoFiles(e.target.files);
      } else {
        handleFile(e.target.files[0]);
      }
    }
  };

  // Theme Variables
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-400' : 'text-slate-500';
  
  // Premium Glass Cards
  const cardBg = isDark 
    ? 'bg-gradient-to-br from-slate-900/60 to-slate-800/60 border-white/10 shadow-lg' 
    : 'bg-gradient-to-br from-white/70 to-white/40 border-white/60 shadow-lg shadow-blue-900/5';

  const headingColor = isDark ? 'text-slate-200' : 'text-slate-800';
  
  const uploadBoxBase = isDark 
    ? 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 backdrop-blur-xl' 
    : 'border-white/50 bg-white/40 hover:border-white/80 hover:bg-white/60 backdrop-blur-xl';
    
  const uploadBoxDrag = isDark
    ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
    : 'border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]';

  const iconContainerBg = isDark 
    ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/10' 
    : 'bg-gradient-to-br from-white to-slate-50 border-white/60 shadow-sm';

  const closeBtnStyle = isDark
    ? 'bg-white/10 border-white/10 text-slate-400 hover:text-white hover:bg-white/20'
    : 'bg-white/40 border-white/40 text-slate-500 hover:text-slate-900 hover:bg-white/80';

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto scroll-smooth ${bgColor} ${textColor}`}>
      {/* Background Decoration (Always visible but subtle) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
      </div>

      {/* Close Button (only if onClose is provided) */}
      {onClose && (
        <button 
          onClick={onClose}
          className={`absolute top-6 right-6 z-50 p-3 rounded-full border transition-all backdrop-blur-md shadow-lg ${closeBtnStyle}`}
        >
          <X size={24} />
        </button>
      )}

      <div className="min-h-screen flex flex-col md:flex-row items-center justify-center p-6 md:p-12 relative z-10 gap-12 max-w-7xl mx-auto">
        
        {/* Left Column: Copy & Features */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
          
          {/* Branding */}
          <div>
             <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-xl backdrop-blur-xl mb-6 ${isDark ? 'bg-slate-900/40 border-white/10 text-cyan-400' : 'bg-white/40 border-white/40 text-blue-600'}`}>
                <Activity size={18} />
                <span className="font-bold tracking-wider text-sm uppercase">Environmental Intelligence</span>
             </div>
             <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight mb-4 ${textColor} drop-shadow-sm`}>
               Atmo <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Viz</span>
             </h1>
             <p className={`text-lg md:text-xl max-w-lg leading-relaxed ${subTextColor}`}>
               Sincronizza e visualizza i dati del tuo percorso GPS con i parametri ambientali misurati dalla tua centralina.
             </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-xl mt-4">
             <div className={`p-5 rounded-2xl backdrop-blur-md flex flex-col items-center md:items-start gap-3 border transition-transform hover:-translate-y-1 ${cardBg}`}>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl ring-1 ring-blue-500/20">
                   <Map size={24} />
                </div>
                <h3 className={`font-bold ${headingColor}`}>Mappe Geografiche</h3>
                <p className={`text-xs ${subTextColor}`}>Visualizza percorsi, mappe termiche e sensori sul territorio.</p>
             </div>
             <div className={`p-5 rounded-2xl backdrop-blur-md flex flex-col items-center md:items-start gap-3 border transition-transform hover:-translate-y-1 ${cardBg}`}>
                <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl ring-1 ring-cyan-500/20">
                   <Clock size={24} />
                </div>
                <h3 className={`font-bold ${headingColor}`}>Viaggio nel Tempo</h3>
                <p className={`text-xs ${subTextColor}`}>Riproduci l'esatto percorso temporale con i controlli di playback.</p>
             </div>
             <div className={`p-5 rounded-2xl backdrop-blur-md flex flex-col items-center md:items-start gap-3 border transition-transform hover:-translate-y-1 ${cardBg}`}>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl ring-1 ring-purple-500/20">
                   <BarChart3 size={24} />
                </div>
                <h3 className={`font-bold ${headingColor}`}>Analisi Dati</h3>
                <p className={`text-xs ${subTextColor}`}>Misura e correla VOC, PM2.5, Temperatura e Dew Point.</p>
             </div>
          </div>
        </div>

        {/* Right Column: Upload Area */}
        <div className="w-full md:w-[450px] flex-shrink-0 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-200">
          
          {/* Tabs Mode Selector */}
          <div className={`flex rounded-xl p-1 mb-4 gap-1 ${isDark ? 'bg-slate-950/80 border border-white/5' : 'bg-slate-200/50 shadow-inner'}`}>
            <button
              onClick={() => setUploadMode('gps')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'gps'
                  ? (isDark ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/10' : 'bg-white text-blue-600 shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Map size={13} />
              Percorso GPS
            </button>
            <button
              onClick={() => setUploadMode('sensors')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'sensors'
                  ? (isDark ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/10' : 'bg-white text-blue-600 shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Database size={13} />
              Sensori
            </button>
            <button
              onClick={() => setUploadMode('photos')}
              className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                uploadMode === 'photos'
                  ? (isDark ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-rose-600 shadow-sm')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              <Camera size={13} />
              Foto FLIR/GPS
            </button>
          </div>

          <div 
            className={`
              relative w-full rounded-3xl border transition-all duration-300 p-8 md:p-10 flex flex-col items-center text-center shadow-2xl
              ${isDragging ? `${uploadBoxDrag} scale-[1.02]` : uploadBoxBase}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {/* Dashed Border Overlay */}
             <div className={`absolute inset-4 rounded-2xl border-2 border-dashed pointer-events-none ${isDark ? 'border-white/10' : 'border-slate-300'}`} />

            {isLoading ? (
              <div className="flex flex-col items-center py-12 relative z-10">
                <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-6 shadow-[0_0_20px_rgba(244,63,94,0.4)]"></div>
                <p className={`text-xl font-bold ${textColor}`}>Estraggo Metadati EXIF GPS...</p>
                <p className="text-sm text-rose-400 mt-2 animate-pulse">Lettura coordinate e anteprime immagini...</p>
              </div>
            ) : (
              <div className="relative z-10 w-full flex flex-col items-center">
                
                {uploadMode === 'sensors' && !hasExistingGps ? (
                  <div className="py-6 flex flex-col items-center">
                    <div className="p-4 bg-red-500/10 text-red-500 rounded-full mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Percorso GPS Mancante</h3>
                    <p className={`text-sm ${subTextColor} mb-4 max-w-xs leading-relaxed`}>
                      Carica prima un file georeferenziato nella scheda <strong>'Percorso GPS'</strong> per poter allineare questi dati basandoti sull'orario più vicino.
                    </p>
                    <button 
                      onClick={() => setUploadMode('gps')}
                      className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors text-xs"
                    >
                      Vai a Percorso GPS
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`w-20 h-20 mb-6 rounded-2xl flex items-center justify-center shadow-inner border ${iconContainerBg}`}>
                      {uploadMode === 'sensors' ? (
                        <Database className={`w-10 h-10 ${isDragging ? 'text-cyan-500' : 'text-slate-400'}`} />
                      ) : uploadMode === 'photos' ? (
                        <Camera className={`w-10 h-10 ${isDragging ? 'text-rose-500' : 'text-rose-400'}`} />
                      ) : (
                        <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-cyan-500' : 'text-slate-400'}`} />
                      )}
                    </div>
                    
                    <h2 className={`text-2xl font-bold mb-2 ${textColor}`}>
                      {uploadMode === 'photos' ? "Carica Foto GPS" : uploadMode === 'sensors' ? "Carica Rilevazioni" : (onClose ? "Aggiungi Percorso" : "Carica File Percorso")}
                    </h2>
                    <p className={`${subTextColor} mb-6 text-sm leading-relaxed`}>
                      {uploadMode === 'photos'
                        ? "Seleziona una cartella completa o un gruppo di foto termiche/JPEG. Verranno posizionate sulla mappa in base all'EXIF GPS."
                        : uploadMode === 'sensors' 
                        ? "Trascina qui il file Excel (XLSX/XLS/CSV) della centralina per allinearlo al percorso." 
                        : "Trascina qui il file georeferenziato del tuo percorso (CSV/XLSX)."}
                    </p>

                    {uploadMode === 'photos' ? (
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        {/* Folder Selection Input */}
                        <label className="cursor-pointer group flex-1">
                          <input 
                            type="file" 
                            multiple 
                            // @ts-ignore
                            webkitdirectory="" 
                            directory="" 
                            className="hidden" 
                            onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)} 
                          />
                          <span className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all transform group-hover:scale-[1.02]">
                            <FolderOpen size={16} />
                            Seleziona Cartella
                          </span>
                        </label>

                        {/* Multiple File Selection Input */}
                        <label className="cursor-pointer group flex-1">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*,.jpg,.jpeg,.tif,.tiff" 
                            className="hidden" 
                            onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)} 
                          />
                          <span className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-white/10 shadow-lg transition-all transform group-hover:scale-[1.02]">
                            <Images size={16} />
                            Seleziona Foto
                          </span>
                        </label>
                      </div>
                    ) : (
                      <Tooltip content="Seleziona file dal tuo dispositivo" theme={theme} position="bottom">
                          <label className="cursor-pointer group w-full">
                          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInputChange} />
                          <span className="block w-full py-4 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/25 transition-all transform group-hover:scale-[1.02]">
                              Sfoglia File
                          </span>
                          </label>
                      </Tooltip>
                    )}

                    {error && (
                      <div className="mt-6 w-full flex items-start text-left text-red-500 bg-red-500/10 p-4 rounded-lg border border-red-500/20 backdrop-blur-sm">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}

                    <div className={`mt-8 pt-6 border-t w-full flex justify-center text-xs items-center gap-2 ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                      <FileText className="w-4 h-4" />
                      <span>
                        {uploadMode === 'photos'
                          ? "Estraggo automaticamente Latitudine e Longitudine dai metadati FLIR/EXIF"
                          : uploadMode === 'sensors' 
                          ? "Supporta Temperature, Humidity e Dew Point" 
                          : "Compatibile con tracciati GPS e formati standard AQS"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FileUpload;
