import React, { useCallback, useState } from 'react';
import { AlertCircle, X, FolderOpen, Images } from 'lucide-react';
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
          throw new Error("No valid image files found in the selection.");
        } else {
          throw new Error(`Checked ${result.totalProcessed} images, but none had GPS coordinates in their EXIF metadata.`);
        }
      }
      
      const statusMsg = `Added ${result.photos.length} of ${result.totalProcessed} photos (the ones with EXIF GPS).`;
      setTimeout(() => {
        onPhotosLoaded(result.photos, statusMsg);
        setIsLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Could not read the EXIF metadata.");
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
         throw new Error("Unsupported file format. Upload a .xlsx, .xls or .csv file.");
      }
      
      if (uploadMode === 'sensors') {
         if (!hasExistingGps) {
            throw new Error("Load a GPS route first, so these readings can be aligned to it.");
         }
         const arrayBuffer = await file.arrayBuffer();
         const parsedRows = await parseExcelFile(arrayBuffer);
         if (parsedRows.length === 0) {
            throw new Error("No valid data found in the Excel or CSV file.");
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
               throw new Error("This file has no GPS coordinates. To load sensor readings without GPS, use step 2, Sensor readings.");
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
              throw new Error("No valid geolocated data found in the CSV file.");
            }
            setTimeout(() => {
              onDataLoaded(data);
              setIsLoading(false);
            }, 800);
         }
      }
    } catch (err: any) {
      setError(err.message || "Could not load the file.");
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

  // Theme: the panel is glass only when the map is really behind it (data already loaded, onClose set)
  const isDark = theme === 'dark';
  const overMap = Boolean(onClose);
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const backdrop = overMap
    ? (isDark ? 'bg-black/40' : 'bg-black/20')
    : (isDark ? 'bg-[#121417]' : 'bg-[#eceeef]');
  const panel = overMap
    ? (isDark ? 'av-glass-dark' : 'av-glass')
    : (isDark ? 'bg-[#1b1e22] border border-white/10' : 'bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(26,28,30,0.06),0_12px_32px_rgba(26,28,30,0.08)]');
  const primaryBtn = isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black';
  const secondaryBtn = isDark ? 'border border-white/20 text-slate-100 hover:bg-white/10' : 'border border-black/20 text-[#1a1c1e] hover:bg-black/[0.04]';
  const rowActive = isDark ? 'bg-white/10' : 'bg-black/[0.04]';

  const steps: { mode: 'gps' | 'sensors' | 'photos'; title: string; hint: string }[] = [
    { mode: 'gps', title: 'GPS route', hint: 'CSV or XLSX with date, latitude and longitude' },
    { mode: 'sensors', title: 'Sensor readings', hint: hasExistingGps ? 'XLSX/XLS/CSV, aligned to the route by time' : 'Available after the route: it is needed to align the times' },
    { mode: 'photos', title: 'FLIR thermal photos', hint: 'A folder or photos with GPS coordinates in the EXIF metadata' },
  ];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${backdrop} ${ink}`}>
      {onClose && (
        <button 
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-5 right-5 z-50 w-11 h-11 flex items-center justify-center rounded-2xl ${isDark ? 'av-glass-dark' : 'av-glass'}`}
        >
          <X size={20} />
        </button>
      )}

      <div className="min-h-screen flex items-center justify-center p-4 md:p-8">
        <main
          className={`relative w-full max-w-[680px] rounded-3xl p-6 md:p-10 transition-shadow ${panel} ${isDragging ? (isDark ? 'ring-2 ring-slate-100' : 'ring-2 ring-[#1a1c1e]') : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-lg font-bold">AtmoViz</span>
            <span className={`text-sm ${muted}`}>
              {uploadMode === 'photos' ? 'Drop photos here' : 'Drop a file here'}
            </span>
          </div>

          {!overMap && (
            <>
              <h1 className="mt-6 text-[34px] md:text-[44px] leading-[1.08] font-semibold tracking-tight max-w-[16ch]">
                Colour comes with your data.
              </h1>
              <p className={`mt-3 text-base md:text-[17px] leading-relaxed max-w-[52ch] ${muted}`}>
                Sync your GPS route with the readings from your sensor station. Each panel then takes the colour of the air quality where you are.
              </p>
            </>
          )}
          {overMap && <h1 className="mt-4 text-2xl font-semibold">Add data</h1>}

          {isLoading ? (
            <div className="mt-8 flex items-center gap-4 py-6" role="status">
              <div className={`w-8 h-8 rounded-full border-[3px] animate-spin ${isDark ? 'border-white/20 border-t-slate-100' : 'border-black/10 border-t-[#1a1c1e]'}`} />
              <div>
                <p className="font-semibold">{uploadMode === 'photos' ? 'Reading EXIF GPS metadata…' : 'Reading the file…'}</p>
                <p className={`text-sm ${muted}`}>{uploadMode === 'photos' ? 'Coordinates and image previews' : 'Checking columns and timestamps'}</p>
              </div>
            </div>
          ) : (
            <ol className="mt-7 flex flex-col gap-1">
              {steps.map((step, i) => {
                const isActive = uploadMode === step.mode;
                const isBlocked = step.mode === 'sensors' && !hasExistingGps;
                return (
                  <li key={step.mode} className={`rounded-2xl transition-colors ${isActive ? rowActive : ''}`}>
                    <div className="flex items-center gap-4 p-3 md:p-4 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setUploadMode(step.mode)}
                        aria-pressed={isActive}
                        className="flex-1 min-w-[220px] flex items-start gap-3 text-left"
                      >
                        <span className={`mt-0.5 w-6 h-6 flex-shrink-0 rounded-full border text-[13px] font-semibold flex items-center justify-center ${isActive ? (isDark ? 'bg-slate-100 text-[#1a1c1e] border-slate-100' : 'bg-[#1a1c1e] text-white border-[#1a1c1e]') : (isDark ? 'border-white/30' : 'border-black/25')}`}>
                          {i + 1}
                        </span>
                        <span>
                          <span className={`block text-[17px] ${isActive ? 'font-semibold' : 'font-medium'} ${isBlocked && !isActive ? muted : ''}`}>
                            {step.title}{step.mode !== 'gps' && <span className={`font-normal ${muted}`}> · optional</span>}
                          </span>
                          <span className={`block text-sm ${muted}`}>{step.hint}</span>
                        </span>
                      </button>

                      {isActive && !isBlocked && step.mode !== 'photos' && (
                        <Tooltip content="Choose a file from your device" theme={theme} position="bottom">
                          <label className="cursor-pointer">
                            <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={onInputChange} />
                            <span className={`inline-flex items-center h-12 px-6 rounded-xl text-base font-semibold transition-colors ${primaryBtn}`}>
                              Choose file
                            </span>
                          </label>
                        </Tooltip>
                      )}

                      {isActive && step.mode === 'photos' && (
                        <div className="flex gap-2 flex-wrap">
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              multiple 
                              // @ts-ignore
                              webkitdirectory="" 
                              directory="" 
                              className="sr-only" 
                              onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)} 
                            />
                            <span className={`inline-flex items-center gap-2 h-12 px-5 rounded-xl text-[15px] font-semibold transition-colors ${primaryBtn}`}>
                              <FolderOpen size={18} />
                              Folder
                            </span>
                          </label>
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*,.jpg,.jpeg,.tif,.tiff" 
                              className="sr-only" 
                              onChange={(e) => e.target.files && handlePhotoFiles(e.target.files)} 
                            />
                            <span className={`inline-flex items-center gap-2 h-12 px-5 rounded-xl text-[15px] font-medium transition-colors ${secondaryBtn}`}>
                              <Images size={18} />
                              Single photos
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {isActive && isBlocked && (
                      <div className="px-4 pb-4 md:pl-[52px] flex items-center gap-3 flex-wrap">
                        <p className={`text-sm ${muted} max-w-[44ch]`}>
                          Load a GPS route first: each sensor reading is matched to the route point closest in time.
                        </p>
                        <button 
                          onClick={() => setUploadMode('gps')}
                          className={`h-10 px-4 rounded-xl text-sm font-semibold transition-colors ${secondaryBtn}`}
                        >
                          Go to GPS route
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {error && (
            <div role="alert" className={`mt-4 flex items-start gap-2 p-4 rounded-xl text-sm ${isDark ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-800'}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className={`mt-6 text-sm ${muted}`}>
            {uploadMode === 'photos'
              ? 'Latitude and longitude are read automatically from the FLIR/EXIF metadata.'
              : uploadMode === 'sensors' 
              ? 'Supports temperature, humidity and dew point.' 
              : 'Works with GPS tracks and standard AQS formats.'}
          </p>
        </main>
      </div>
    </div>
  );
};

export default FileUpload;
