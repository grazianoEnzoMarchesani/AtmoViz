
import React, { useState } from 'react';
import { 
  Moon, Sun, Route, CircleDot, Flame, ListFilter, 
  UploadCloud, BarChart2, Scaling, Navigation, Locate, 
  FileText, Info, Menu, X, Settings2, HelpCircle, Camera
} from 'lucide-react';
import { VisualizationMode } from '../types';
import Tooltip from './Tooltip';

interface ControlBarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  visualizationMode: VisualizationMode;
  setVisualizationMode: (mode: VisualizationMode) => void;
  useDynamicHeatmapRadius: boolean;
  toggleDynamicRadius: () => void;
  isFollowing: boolean;
  onFollowToggle: () => void;
  toggleStats: () => void;
  toggleReport: () => void;
  toggleUpload: () => void;
  toggleFilter: () => void;
  toggleGuide: () => void;
  toggleTour: () => void;
  isStatsOpen: boolean;
  isFilterOpen: boolean;
  isReportOpen: boolean;
  isGuideOpen: boolean;
  isUploadOpen: boolean;
  isPhotoLayerVisible?: boolean;
  togglePhotoLayer?: () => void;
  photoCount?: number;
}

const ControlBar: React.FC<ControlBarProps> = ({
  theme, toggleTheme,
  visualizationMode, setVisualizationMode,
  useDynamicHeatmapRadius, toggleDynamicRadius,
  isFollowing, onFollowToggle,
  toggleStats, toggleReport, toggleUpload, toggleFilter, toggleGuide, toggleTour,
  isStatsOpen, isFilterOpen, isReportOpen, isGuideOpen, isUploadOpen,
  isPhotoLayerVisible = true, togglePhotoLayer, photoCount = 0
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';
  
  // Advanced Glass Panel Style
  // Using bg-gradient-to-b and border-opacity for that "Apple-like" glass feel
  const glassPanel = isDark 
    ? 'bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-2xl' 
    : 'bg-gradient-to-b from-white/70 to-white/40 border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-2xl';
  
  const iconBase = 'p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center relative overflow-hidden group';
  
  const iconActive = isDark 
    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]';
    
  const iconInactive = isDark
    ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10'
    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent hover:border-white/40';

  const Divider = () => (
    <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-slate-900/10'}`} />
  );

  // Button Component for consistency
  const ActionBtn = ({ 
    onClick, isActive, icon: Icon, label, secondaryAction, tooltipPosition = 'bottom'
  }: { 
    onClick: () => void, isActive?: boolean, icon: any, label: string, secondaryAction?: React.ReactNode, tooltipPosition?: 'bottom' | 'bottom-end' | 'left'
  }) => (
    <Tooltip content={label} theme={theme} position={tooltipPosition}>
      <div className="relative">
         <button
          onClick={onClick}
          className={`${iconBase} ${isActive ? iconActive : iconInactive}`}
        >
          {/* Subtle shine on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <Icon size={20} className="relative z-10" />
        </button>
        {secondaryAction && (
            <div className="absolute -top-2 -right-2 z-10">
                {secondaryAction}
            </div>
        )}
      </div>
    </Tooltip>
  );

  return (
    <>
      {/* DESKTOP DOCK (Centered Top) */}
      <div className="hidden md:flex absolute top-4 right-4 z-40 flex-col items-end gap-3 pointer-events-none">
        
        {/* Main Toolbar */}
        <div className={`pointer-events-auto flex items-center gap-1 p-2 rounded-2xl ${glassPanel}`}>
          
          {/* GROUP 1: MAP CONTROLS (Visuals & Photo Layer) */}
          <div id="map-controls-group" className="flex items-center gap-1 px-1">
             <ActionBtn 
               onClick={() => setVisualizationMode('path')} 
               isActive={visualizationMode === 'path'} 
               icon={Route} 
               label="Path View" 
             />
             <ActionBtn 
               onClick={() => setVisualizationMode('points')} 
               isActive={visualizationMode === 'points'} 
               icon={CircleDot} 
               label="Point View" 
             />
             <ActionBtn 
               onClick={() => setVisualizationMode('heatmap')} 
               isActive={visualizationMode === 'heatmap'} 
               icon={Flame} 
               label="Heatmap Mode"
               secondaryAction={visualizationMode === 'heatmap' && (
                  <Tooltip content={useDynamicHeatmapRadius ? "Disable Dynamic Radius" : "Enable Dynamic Radius"} theme={theme} position="left">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleDynamicRadius(); }}
                      className={`p-1 rounded-full shadow-lg hover:scale-110 transition-transform border ${isDark ? 'border-slate-800' : 'border-white'} ${useDynamicHeatmapRadius ? 'bg-purple-500 text-white' : 'bg-slate-400 text-white'}`}
                    >
                        <Scaling size={14} />
                    </button>
                  </Tooltip>
               )}
             />
             
             {togglePhotoLayer && (
               <ActionBtn 
                 onClick={togglePhotoLayer}
                 isActive={isPhotoLayerVisible}
                 icon={Camera}
                 label={isPhotoLayerVisible ? `Layer Foto GPS On (${photoCount})` : `Layer Foto GPS Off (${photoCount})`}
                 secondaryAction={photoCount > 0 && (
                   <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold font-mono text-white bg-rose-500 rounded-full shadow-md border border-white">
                     {photoCount}
                   </span>
                 )}
               />
             )}
          </div>

          <Divider />

          {/* GROUP 2: NAVIGATION (Follow) */}
          <div className="flex items-center gap-1 px-1">
             <ActionBtn 
                onClick={onFollowToggle}
                isActive={isFollowing}
                icon={isFollowing ? Navigation : Locate}
                label={isFollowing ? "Tracking Location" : "Re-center Map"}
             />
          </div>

          <Divider />

          {/* GROUP 3: DATA TOOLS (Analysis) */}
          <div id="analysis-tools-group" className="flex items-center gap-1 px-1">
             <ActionBtn 
                onClick={toggleFilter}
                isActive={isFilterOpen}
                icon={ListFilter}
                label="Filter Data"
             />
             <ActionBtn 
                onClick={toggleStats}
                isActive={isStatsOpen}
                icon={BarChart2}
                label="Statistics & Corr"
             />
             <ActionBtn 
                onClick={toggleReport}
                isActive={isReportOpen}
                icon={FileText}
                label="Generate Report"
             />
          </div>

          <Divider />

          {/* GROUP 4: SYSTEM (Meta) - Aligned to bottom-end to prevent right overflow */}
          <div id="system-tools-group" className="flex items-center gap-1 px-1">
             <ActionBtn 
                onClick={toggleUpload}
                isActive={isUploadOpen}
                icon={UploadCloud}
                label="Upload CSV"
                tooltipPosition="bottom-end"
             />
             <ActionBtn 
                onClick={toggleGuide}
                isActive={isGuideOpen}
                icon={Info}
                label="Health Guide"
                tooltipPosition="bottom-end"
             />
             <ActionBtn 
                onClick={toggleTour}
                icon={HelpCircle}
                label="Start Tour"
                tooltipPosition="bottom-end"
             />
             <ActionBtn 
                onClick={toggleTheme}
                icon={isDark ? Sun : Moon}
                label="Toggle Theme"
                tooltipPosition="bottom-end"
             />
          </div>

        </div>
      </div>

      {/* MOBILE CONTROLS */}
      
      {/* 1. Mobile Menu Toggle (Top Right) */}
      <div id="mobile-menu-btn" className="md:hidden absolute top-3 right-3 z-50 pointer-events-auto">
         <Tooltip content="Open Menu" theme={theme} position="left">
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className={`p-3 rounded-full ${glassPanel}`}
            >
                <Menu size={24} className={isDark ? 'text-white' : 'text-slate-700'} />
            </button>
         </Tooltip>
      </div>

      {/* 2. Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200 pointer-events-auto">
           <div className={`absolute right-0 top-0 bottom-0 w-3/4 max-w-[300px] shadow-2xl flex flex-col ${isDark ? 'bg-slate-900/90 border-l border-white/10' : 'bg-white/90 border-l border-white/40'} backdrop-blur-2xl`}>
              
              <div className="p-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
                  <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Menu</h2>
                  <Tooltip content="Close Menu" theme={theme} position="left">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                        <X size={24} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                    </button>
                  </Tooltip>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  
                  {/* Section: Guides & Help */}
                  <div>
                      <div className="text-xs font-bold uppercase opacity-50 mb-3 px-2">Guides & Help</div>
                      <div className="space-y-2">
                           <button 
                               onClick={() => { toggleTour(); setIsMobileMenuOpen(false); }}
                               className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors border ${isDark ? 'bg-slate-800/50 border-white/10 hover:bg-slate-800 text-slate-200' : 'bg-white/50 border-white/50 hover:bg-white text-slate-700'}`}
                           >
                               <HelpCircle size={20} className="text-cyan-500" />
                               <span className="font-bold">Interactive Tour</span>
                           </button>

                           <button 
                               onClick={() => { toggleGuide(); setIsMobileMenuOpen(false); }}
                               className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors border ${isGuideOpen ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-500' : (isDark ? 'bg-slate-800/50 border-white/10 hover:bg-slate-800 text-slate-200' : 'bg-white/50 border-white/50 hover:bg-white text-slate-700')}`}
                           >
                               <Info size={20} className="text-cyan-500" />
                               <span className="font-bold">Health Guide</span>
                           </button>
                      </div>
                  </div>

                  {/* Section: Visuals */}
                  <div>
                      <div className="text-xs font-bold uppercase opacity-50 mb-3 px-2">Visualization & Layers</div>
                      <div className="space-y-2">
                         {togglePhotoLayer && (
                           <button 
                             onClick={() => { togglePhotoLayer(); setIsMobileMenuOpen(false); }}
                             className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors border ${isPhotoLayerVisible ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 font-bold' : (isDark ? 'bg-slate-800/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/50 text-slate-600')}`}
                           >
                             <div className="flex items-center gap-3">
                               <Camera size={20} className="text-rose-500" />
                               <span>Layer Foto GPS</span>
                             </div>
                             <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 font-mono text-rose-300">
                               {isPhotoLayerVisible ? `ON (${photoCount})` : `OFF (${photoCount})`}
                             </span>
                           </button>
                         )}
                         <Tooltip content="Show path lines" theme={theme} position="bottom">
                            <button 
                                onClick={() => { setVisualizationMode('path'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${visualizationMode === 'path' ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}
                            >
                                <Route size={20} />
                                <span className="font-bold">Path View</span>
                            </button>
                         </Tooltip>
                         <Tooltip content="Show individual points" theme={theme} position="bottom">
                            <button 
                                onClick={() => { setVisualizationMode('points'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${visualizationMode === 'points' ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}
                            >
                                <CircleDot size={20} />
                                <span className="font-bold">Point View</span>
                            </button>
                         </Tooltip>
                         
                         <div className={`w-full flex items-center rounded-xl transition-colors ${visualizationMode === 'heatmap' ? (isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-50 text-blue-600') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>
                             <Tooltip content="Show density heatmap" theme={theme} position="bottom">
                                <button 
                                    onClick={() => { setVisualizationMode('heatmap'); setIsMobileMenuOpen(false); }}
                                    className="flex-1 flex items-center gap-3 p-3 text-left"
                                >
                                    <Flame size={20} />
                                    <span className="font-bold">Heatmap Mode</span>
                                </button>
                             </Tooltip>
                             
                             {visualizationMode === 'heatmap' && (
                                <div className="pr-3 pl-1 border-l border-black/5 dark:border-white/10 ml-1">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); toggleDynamicRadius(); }}
                                       className={`p-2 rounded-lg transition-all ${useDynamicHeatmapRadius ? 'bg-purple-500 text-white shadow-md' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
                                     >
                                         <Scaling size={18} />
                                     </button>
                                </div>
                             )}
                         </div>

                      </div>
                  </div>

                  {/* Section: Tools */}
                  <div>
                      <div className="text-xs font-bold uppercase opacity-50 mb-3 px-2">Analysis Tools</div>
                      <div className="grid grid-cols-2 gap-2">
                          <Tooltip content="Filter data by time or GPS" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleFilter(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isFilterOpen ? 'border-cyan-500' : ''}`}
                             >
                                <ListFilter size={24} className={isDark ? 'text-cyan-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Filter</span>
                             </button>
                          </Tooltip>

                          <Tooltip content="View Statistics" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleStats(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isStatsOpen ? 'border-cyan-500' : ''}`}
                             >
                                <BarChart2 size={24} className={isDark ? 'text-cyan-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Stats</span>
                             </button>
                          </Tooltip>
                          
                          <Tooltip content="Generate PDF Report" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleReport(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isReportOpen ? 'border-cyan-500' : ''}`}
                             >
                                <FileText size={24} className={isDark ? 'text-cyan-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Report</span>
                             </button>
                          </Tooltip>

                           <Tooltip content="Upload new data" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleUpload(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isUploadOpen ? 'border-cyan-500' : ''}`}
                             >
                                <UploadCloud size={24} className={isDark ? 'text-cyan-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Upload</span>
                             </button>
                          </Tooltip>
                      </div>
                  </div>

                  {/* Section: Settings */}
                  <div>
                       <div className="text-xs font-bold uppercase opacity-50 mb-3 px-2">Settings</div>
                       <Tooltip content="Toggle Light/Dark Theme" theme={theme} position="top">
                           <button 
                                onClick={toggleTheme}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50 text-white' : 'border-white/50 bg-white/50 text-slate-900'}`}
                           >
                                <div className="flex items-center gap-3">
                                    {isDark ? <Moon size={20} /> : <Sun size={20} />}
                                    <span className="font-bold">Theme</span>
                                </div>
                                <div className={`text-xs font-bold uppercase px-2 py-1 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    {theme}
                                </div>
                           </button>
                       </Tooltip>
                  </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default ControlBar;
