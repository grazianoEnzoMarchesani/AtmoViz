import React, { useState, useEffect, useMemo } from 'react';
import { Activity, AlertTriangle, CopyPlus, RefreshCw, Maximize2, Minimize2, CheckCircle2 } from 'lucide-react';
import { AppState, DataPoint, MetricKey, VisualizationMode, FilterState, Persona, GeoPhoto } from './types';
import { METRICS, isDataComplete, alignSupplementaryData } from './utils/dataUtils';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import Timeline from './components/Timeline';
import ReferenceGuide from './components/ReferenceGuide';
import FilterPanel from './components/FilterPanel';
import StatsModal from './components/StatsModal';
import ReportModal from './components/ReportModal';
import PersonaSelector from './components/PersonaSelector';
import ControlBar from './components/ControlBar';
import Tooltip from './components/Tooltip';
import TourGuide, { TourStep } from './components/TourGuide';

// MapLibre is large and only needed once data is loaded: fetch it on demand
const MapBoard = React.lazy(() => import('./components/MapBoard'));

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    allData: [],
    data: [],
    photos: [],
    isPhotoLayerVisible: true,
    isPlaying: false,
    currentIndex: 0,
    playbackSpeed: 1,
    theme: 'light',
    selectedMetric: 'pm25',
    visualizationMode: 'points',
    useDynamicHeatmapRadius: false,
    isDragActive: false,
    isGuideOpen: false,
    isFilterOpen: false,
    filters: {
        startTime: null,
        endTime: null,
        hideNoGps: true,
        onlyCompleteData: false
    },
    selectedPersona: 'standard'
  });

  // State for managing additional uploads
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [pendingData, setPendingData] = useState<DataPoint[] | null>(null);
  
  // State for Stats Modal
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // State for Report Modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // State for Map Following
  const [isFollowing, setIsFollowing] = useState(true);

  // State for Mobile Fullscreen Map (Zen Mode)
  const [isZenMode, setIsZenMode] = useState(false);

  // State for Tour
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Status Notification Toast
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const { 
      allData, 
      data, 
      photos = [],
      isPhotoLayerVisible = true,
      isPlaying, 
      currentIndex, 
      playbackSpeed, 
      theme, 
      selectedMetric, 
      visualizationMode,
      useDynamicHeatmapRadius,
      isGuideOpen, 
      isFilterOpen, 
      filters,
      selectedPersona
  } = state;

  const handlePhotosLoaded = (newPhotos: GeoPhoto[], statusMsg?: string) => {
    setState(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
      isPhotoLayerVisible: true
    }));
    setIsUploadOpen(false);
    if (statusMsg) {
      setStatusMessage(statusMsg);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const togglePhotoLayer = () => {
    setState(prev => ({
      ...prev,
      isPhotoLayerVisible: !prev.isPhotoLayerVisible
    }));
  };

  // Apply filters whenever allData or filters change
  useEffect(() => {
    if (allData.length === 0) {
        setState(prev => ({ ...prev, data: [] }));
        return;
    }

    let filtered = allData;

    // Time Filter
    if (filters.startTime) {
        filtered = filtered.filter(d => d.timestamp >= filters.startTime!);
    }
    if (filters.endTime) {
        filtered = filtered.filter(d => d.timestamp <= filters.endTime!);
    }

    // GPS Filter
    if (filters.hideNoGps) {
        filtered = filtered.filter(d => d.lat !== null && d.lng !== null);
    }

    // Complete Data Filter (Strict Mode)
    if (filters.onlyCompleteData) {
        filtered = filtered.filter(isDataComplete);
    }

    setState(prev => ({
        ...prev,
        data: filtered,
        currentIndex: 0, // Reset playback
        isPlaying: false // Stop playback to avoid index out of bounds issues during transition
    }));

  }, [allData, filters]);

  const handleDataLoaded = (newData: DataPoint[]) => {
    if (allData.length === 0) {
        // First load - just set it
        updateDataState(newData);
        setIsUploadOpen(false);
    } else {
        // Subsequent load - Prompt user
        setPendingData(newData);
        setIsUploadOpen(false);
    }
  };

  const handleSupplementaryLoaded = (rows: any[]) => {
    if (allData.length === 0) return;
    
    // Align rows with the current georeferenced route based on closest timestamp
    const alignedData = alignSupplementaryData(allData, rows);
    
    // Update state. This reactive change triggers the useEffect filters
    setState(prev => ({
      ...prev,
      allData: alignedData
    }));
    setIsUploadOpen(false);
  };

  const updateDataState = (newData: DataPoint[]) => {
      if (newData.length > 0) {
        const minTime = newData[0].timestamp;
        const maxTime = newData[newData.length - 1].timestamp;

        setState(prev => ({
            ...prev,
            allData: newData,
            // Reset filters to show full new range, keeping default logic
            filters: {
                startTime: minTime,
                endTime: maxTime,
                hideNoGps: true,
                onlyCompleteData: false
            }
        }));
    }
  };

  const handleMergeDecision = (action: 'append' | 'replace') => {
    if (!pendingData) return;

    if (action === 'replace') {
        updateDataState(pendingData);
    } else {
        // Append
        const combined = [...allData, ...pendingData];
        // Re-sort by timestamp to ensure timeline correctness
        combined.sort((a, b) => a.timestamp - b.timestamp);
        
        // We need to re-index to keep IDs unique/consistent if they were just array indices
        const reindexed = combined.map((d, i) => ({...d, id: i}));
        updateDataState(reindexed);
    }
    setPendingData(null);
  };

  useEffect(() => {
    let interval: number;
    if (isPlaying && data.length > 0) {
      interval = window.setInterval(() => {
        setState(prev => {
          const nextIndex = prev.currentIndex + 1;
          if (nextIndex >= prev.data.length) {
            return { ...prev, isPlaying: false, currentIndex: prev.data.length - 1 };
          }
          return { ...prev, currentIndex: nextIndex };
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, data.length]);

  const togglePlay = () => setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  
  const handleSeek = (index: number) => {
    setState(prev => ({ ...prev, currentIndex: Math.min(Math.max(0, index), prev.data.length - 1) }));
  };

  const handleSpeedChange = (speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
  };

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const selectMetric = (key: MetricKey) => {
    setState(prev => ({ ...prev, selectedMetric: key }));
  };

  const selectPersona = (persona: Persona) => {
      setState(prev => ({ ...prev, selectedPersona: persona }));
  };

  const setVisualizationMode = (mode: VisualizationMode) => {
    setState(prev => ({ ...prev, visualizationMode: mode }));
  };

  const toggleDynamicRadius = () => {
    setState(prev => ({ ...prev, useDynamicHeatmapRadius: !prev.useDynamicHeatmapRadius }));
  };

  const toggleGuide = () => {
    setState(prev => ({ ...prev, isGuideOpen: !prev.isGuideOpen }));
  };
  
  const toggleFilter = () => {
    setState(prev => ({ ...prev, isFilterOpen: !prev.isFilterOpen }));
  };
  
  const toggleUpload = () => {
    setIsUploadOpen(!isUploadOpen);
  };
  
  const toggleStats = () => {
    setIsStatsOpen(!isStatsOpen);
  };

  const toggleReport = () => {
    setIsReportOpen(!isReportOpen);
  };

  const handleApplyFilters = (newFilters: FilterState) => {
      setState(prev => ({ ...prev, filters: newFilters }));
  };
  
  const handleFollowToggle = () => {
      setIsFollowing(true);
  };
  
  // Toggle for button (on/off) rather than one-way set
  const toggleFollowMode = () => {
      setIsFollowing(!isFollowing);
  }

  const minMaxTimestamps = useMemo(() => {
      if (allData.length === 0) return { min: 0, max: 0 };
      return {
          min: allData[0].timestamp,
          max: allData[allData.length - 1].timestamp
      };
  }, [allData]);

  // Styles for the Zen Button to match ControlBar Menu Button
  const zenButtonClass = theme === 'dark' 
    ? 'bg-slate-900/90 border-slate-700 text-white shadow-black/50' 
    : 'bg-white/90 border-slate-200 text-slate-700 shadow-slate-200/50';

  // --- TOUR CONFIGURATION ---
  const tourSteps: TourStep[] = [
    {
        target: '.tour-target-persona', // Class based target
        title: 'Define Risk Profile',
        content: 'Start here by selecting a persona (e.g., Athlete, Asthmatic). The app automatically adjusts safety thresholds and colors for all metrics based on this choice.',
        position: 'right'
    },
    {
        target: '.tour-target-dashboard', // Class based target
        title: 'Live Metrics',
        content: 'View real-time sensor readings for the current timestamp. Click any card to visualize that specific metric on the map.',
        position: 'right'
    },
    {
        target: '#map-controls-group',
        title: 'Visualization Modes',
        content: 'Switch between Path (line), Points (dots), or Heatmap views. You can also toggle dynamic radius scaling for heatmaps here.',
        position: 'left'
    },
    {
        target: '#analysis-tools-group',
        title: 'Deep Analysis',
        content: 'Access powerful tools: Filter data by time/GPS, view statistical correlations, or generate a full PDF report.',
        position: 'left'
    },
    {
        target: '#timeline-container',
        title: 'Time Travel',
        content: 'Play, pause, or drag the timeline to replay your journey. Use the brush at the bottom to zoom into specific time ranges.',
        position: 'top'
    },
    {
        target: '#mobile-menu-btn',
        title: 'Mobile Menu',
        content: 'On smaller screens, all your tools and settings are tucked away in this menu.',
        position: 'left'
    }
  ];

  return (
    <div className={`w-full h-screen relative overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Tour Guide Overlay */}
      <TourGuide 
        steps={tourSteps}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        theme={theme}
      />

      {/* 1. BASE LAYER: The Map */}
      <div id="map-board-container" className="w-full h-full absolute inset-0 z-0">
          {(allData.length > 0 || photos.length > 0) && (
            <React.Suspense fallback={null}>
              <MapBoard 
                data={data} 
                currentIndex={currentIndex} 
                isPlaying={isPlaying}
                theme={theme} 
                metricConfig={METRICS[selectedMetric]}
                visualizationMode={visualizationMode}
                useDynamicHeatmapRadius={useDynamicHeatmapRadius}
                onPointSelect={handleSeek}
                isFollowing={isFollowing}
                onFollowChange={setIsFollowing}
                persona={selectedPersona}
                photos={photos}
                isPhotoLayerVisible={isPhotoLayerVisible}
              />
            </React.Suspense>
          )}
      </div>

      {/* 2. UI LAYER: Floating Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Mobile Zen Mode Toggle (Persistent) */}
        {allData.length > 0 && (
            <div className={`md:hidden absolute top-3 z-50 pointer-events-auto transition-all duration-300 ease-in-out ${isZenMode ? 'right-3' : 'right-20'}`}>
                <Tooltip content={isZenMode ? "Show Controls" : "Fullscreen Map"} theme={theme} position="left">
                    <button 
                        onClick={() => setIsZenMode(!isZenMode)}
                        className={`p-3 rounded-full shadow-lg border backdrop-blur-md transition-colors ${zenButtonClass}`}
                    >
                        {isZenMode ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                    </button>
                </Tooltip>
            </div>
        )}

        {/* TOP SECTION: Header, Theme Toggle, Dashboard */}
        <div className={`
            flex-col md:flex-row md:items-start md:justify-between p-2 md:p-4 gap-2 
            bg-gradient-to-b from-black/20 to-transparent md:bg-none
            transition-all duration-500 ease-in-out
            ${isZenMode ? 'hidden md:flex' : 'flex'}
        `}>
          
          {/* 
             MOBILE OPTIMIZATION:
             Unified Top Bar for Mobile (Logo + Persona) to save vertical space.
          */}
          <div className="flex md:hidden items-center gap-2 pointer-events-auto w-full pr-32"> 
             {/* Logo */}
             <div className={`text-sm font-bold flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm flex-shrink-0 ${theme === 'dark' ? 'bg-slate-900/50 text-white' : 'bg-white/50 text-slate-900'}`}>
               <Activity size={16} className="text-cyan-500" />
               <span className="hidden sm:inline">Atmo Viz</span>
             </div>
             
             {/* Persona Selector (Compact on Mobile) */}
             <div className="flex-1 min-w-0">
                <PersonaSelector 
                    className="tour-target-persona"
                    selectedPersona={selectedPersona}
                    onSelect={selectPersona}
                    theme={theme}
                />
             </div>
          </div>

          {/* DESKTOP SIDEBAR AREA (Dashboard & Persona) */}
          <div className="hidden md:flex flex-col gap-2 pointer-events-auto">
             <div className="md:w-64">
                <PersonaSelector 
                    className="tour-target-persona"
                    selectedPersona={selectedPersona}
                    onSelect={selectPersona}
                    theme={theme}
                />
             </div>

             {data.length > 0 && (
                <Dashboard 
                  className="tour-target-dashboard"
                  currentData={data[currentIndex]} 
                  selectedMetric={selectedMetric}
                  onSelectMetric={selectMetric}
                  theme={theme}
                  persona={selectedPersona}
                />
             )}
          </div>
          
          {/* MOBILE DASHBOARD (Floating below the top bar) */}
          {data.length > 0 && (
              <div className="md:hidden pointer-events-auto mt-1 w-full overflow-hidden">
                 <Dashboard 
                    className="tour-target-dashboard"
                    currentData={data[currentIndex]} 
                    selectedMetric={selectedMetric}
                    onSelectMetric={selectMetric}
                    theme={theme}
                    persona={selectedPersona}
                 />
              </div>
          )}

          {/* Desktop Controls (Replaced by ControlBar) */}
          <ControlBar 
            theme={theme}
            toggleTheme={toggleTheme}
            visualizationMode={visualizationMode}
            setVisualizationMode={setVisualizationMode}
            useDynamicHeatmapRadius={useDynamicHeatmapRadius}
            toggleDynamicRadius={toggleDynamicRadius}
            isFollowing={isFollowing}
            onFollowToggle={toggleFollowMode}
            toggleStats={toggleStats}
            toggleReport={toggleReport}
            toggleUpload={toggleUpload}
            toggleFilter={toggleFilter}
            toggleGuide={toggleGuide}
            toggleTour={() => setIsTourOpen(true)}
            isStatsOpen={isStatsOpen}
            isReportOpen={isReportOpen}
            isUploadOpen={isUploadOpen}
            isFilterOpen={isFilterOpen}
            isGuideOpen={isGuideOpen}
            isPhotoLayerVisible={isPhotoLayerVisible}
            togglePhotoLayer={togglePhotoLayer}
            photoCount={photos.length}
          />

        </div>

        {/* BOTTOM SECTION: Timeline */}
        {data.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-auto">
            <Timeline 
              allData={allData}
              filteredData={data}
              currentIndex={currentIndex}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              metricConfig={METRICS[selectedMetric]}
              filters={filters}
              onTogglePlay={togglePlay}
              onSeek={handleSeek}
              onSpeedChange={handleSpeedChange}
              onFilterChange={handleApplyFilters}
              theme={theme}
              persona={selectedPersona}
            />
          </div>
        )}
        
        {/* Empty State if Filter removes everything */}
        {allData.length > 0 && data.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none absolute inset-0">
                <div className="p-6 rounded-xl backdrop-blur-md bg-black/50 text-white text-center pointer-events-auto">
                    <h3 className="text-xl font-bold mb-2">No Data Found</h3>
                    <p className="text-sm opacity-80 mb-4">Your filters are too strict.</p>
                    <button 
                        onClick={() => handleApplyFilters({...filters, startTime: minMaxTimestamps.min, endTime: minMaxTimestamps.max, onlyCompleteData: false})}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>
        )}

      </div>

      {/* 3. MODALS LAYER */}
      
      {/* FileUpload: Show if no data OR if explicit open requested */}
      {(allData.length === 0 || isUploadOpen) && (
        <div className="absolute inset-0 z-50 pointer-events-auto">
           <FileUpload 
                onDataLoaded={handleDataLoaded} 
                onSupplementaryLoaded={handleSupplementaryLoaded}
                onPhotosLoaded={handlePhotosLoaded}
                hasExistingGps={allData.length > 0}
                onClose={(allData.length > 0 || photos.length > 0) ? () => setIsUploadOpen(false) : undefined}
                theme={theme}
           />
        </div>
      )}

      {/* Status Message Toast */}
      {statusMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl border border-emerald-400/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={22} className="text-emerald-200" />
          <span className="text-sm">{statusMessage}</span>
        </div>
      )}

      {/* Append/Replace Decision Modal */}
      {pendingData && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto p-4">
              <div className={`max-w-md w-full rounded-2xl shadow-2xl border p-6 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className="p-4 rounded-full bg-yellow-500/20 text-yellow-500">
                          <AlertTriangle size={32} />
                      </div>
                      <h2 className="text-2xl font-bold">Data Detected</h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                          You are loading <strong>{pendingData.length}</strong> new data points. Do you want to append them to your existing dataset or replace it entirely?
                      </p>

                      <div className="flex flex-col w-full gap-3 mt-4">
                          <button 
                            onClick={() => handleMergeDecision('append')}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-colors"
                          >
                              <CopyPlus size={18} />
                              Append to Existing ({allData.length} pts)
                          </button>
                          <button 
                            onClick={() => handleMergeDecision('replace')}
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold border transition-colors ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
                          >
                              <RefreshCw size={18} />
                              Replace Existing
                          </button>
                          <button 
                            onClick={() => setPendingData(null)}
                            className="text-sm text-slate-500 hover:underline mt-2"
                          >
                              Cancel
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Reference Guide Modal */}
      <ReferenceGuide 
        isOpen={isGuideOpen} 
        onClose={toggleGuide} 
        currentData={data.length > 0 ? data[currentIndex] : null}
        currentMetric={selectedMetric}
        theme={theme}
        persona={selectedPersona}
      />
      
      {/* Filter Panel Modal */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={toggleFilter}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        theme={theme}
        minTimestamp={minMaxTimestamps.min}
        maxTimestamp={minMaxTimestamps.max}
      />
      
      {/* Stats Panel Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={toggleStats}
        data={data}
        theme={theme}
      />

      {/* PDF Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={toggleReport}
        data={data}
        theme={theme}
        persona={selectedPersona}
      />

    </div>
  );
};

export default App;
