
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
  
  // Neutral glass: tools carry no data colour (only reading panels are tinted)
  const glassPanel = isDark ? 'av-glass-dark' : 'av-glass';
  
  const iconBase = 'w-10 h-10 rounded-xl transition-colors flex items-center justify-center relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1';
  
  // Active = solid ink, the same selected state used everywhere else
  const iconActive = isDark 
    ? 'bg-slate-100 text-[#1a1c1e]' 
    : 'bg-[#1a1c1e] text-white';
    
  const iconInactive = isDark
    ? 'text-slate-200 hover:bg-white/10'
    : 'text-[#1a1c1e] hover:bg-black/[0.06]';

  const Divider = () => (
    <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
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
          <Icon size={20} strokeWidth={1.8} />
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
        <div className={`pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl ${glassPanel}`}>
          
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
                      className={`p-1 rounded-full border-2 ${isDark ? 'border-[#181b1f]' : 'border-white'} ${useDynamicHeatmapRadius ? (isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white') : 'bg-slate-400 text-white'}`}
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
                 label={isPhotoLayerVisible ? `Hide GPS photos (${photoCount})` : `Show GPS photos (${photoCount})`}
                 secondaryAction={photoCount > 0 && (
                   <span className={`flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold rounded-full border-2 ${isDark ? 'bg-slate-100 text-[#1a1c1e] border-[#181b1f]' : 'bg-[#1a1c1e] text-white border-white'}`}>
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
                className={`w-11 h-11 flex items-center justify-center rounded-2xl ${glassPanel}`}
            >
                <Menu size={22} className={isDark ? 'text-white' : 'text-[#1a1c1e]'} />
            </button>
         </Tooltip>
      </div>

      {/* 2. Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200 pointer-events-auto">
           <div className={`absolute right-0 top-0 bottom-0 w-3/4 max-w-[300px] shadow-2xl flex flex-col ${isDark ? 'av-glass-dark text-slate-100' : 'av-glass text-[#1a1c1e]'}`}>
              
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
                      <div className="text-[13px] font-medium opacity-60 mb-2 px-2">Guides & Help</div>
                      <div className="space-y-2">
                           <button 
                               onClick={() => { toggleTour(); setIsMobileMenuOpen(false); }}
                               className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors border ${isDark ? 'bg-slate-800/50 border-white/10 hover:bg-slate-800 text-slate-200' : 'bg-white/50 border-white/50 hover:bg-white text-slate-700'}`}
                           >
                               <HelpCircle size={20} className="" />
                               <span className="font-bold">Interactive Tour</span>
                           </button>

                           <button 
                               onClick={() => { toggleGuide(); setIsMobileMenuOpen(false); }}
                               className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors border ${isGuideOpen ? (isDark ? 'bg-white/15 border-white/20' : 'bg-black/[0.08] border-black/10') : (isDark ? 'bg-slate-800/50 border-white/10 hover:bg-slate-800 text-slate-200' : 'bg-white/50 border-white/50 hover:bg-white text-slate-700')}`}
                           >
                               <Info size={20} className="" />
                               <span className="font-bold">Health Guide</span>
                           </button>
                      </div>
                  </div>

                  {/* Section: Visuals */}
                  <div>
                      <div className="text-[13px] font-medium opacity-60 mb-2 px-2">Visualization & Layers</div>
                      <div className="space-y-2">
                         {togglePhotoLayer && (
                           <button 
                             onClick={() => { togglePhotoLayer(); setIsMobileMenuOpen(false); }}
                             className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors border ${isPhotoLayerVisible ? (isDark ? 'bg-white/15 border-white/20 font-semibold' : 'bg-black/[0.08] border-black/10 font-semibold') : (isDark ? 'bg-slate-800/50 border-white/10 text-slate-400' : 'bg-white/50 border-white/50 text-slate-600')}`}
                           >
                             <div className="flex items-center gap-3">
                               <Camera size={20} className="" />
                               <span>GPS photos</span>
                             </div>
                             <span className="text-xs px-2 py-0.5 rounded-full bg-black/10">
                               {isPhotoLayerVisible ? `ON (${photoCount})` : `OFF (${photoCount})`}
                             </span>
                           </button>
                         )}
                         <Tooltip content="Show path lines" theme={theme} position="bottom">
                            <button 
                                onClick={() => { setVisualizationMode('path'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${visualizationMode === 'path' ? (isDark ? 'bg-white/15 font-semibold' : 'bg-black/[0.08] font-semibold') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}
                            >
                                <Route size={20} />
                                <span className="font-bold">Path View</span>
                            </button>
                         </Tooltip>
                         <Tooltip content="Show individual points" theme={theme} position="bottom">
                            <button 
                                onClick={() => { setVisualizationMode('points'); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${visualizationMode === 'points' ? (isDark ? 'bg-white/15 font-semibold' : 'bg-black/[0.08] font-semibold') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}
                            >
                                <CircleDot size={20} />
                                <span className="font-bold">Point View</span>
                            </button>
                         </Tooltip>
                         
                         <div className={`w-full flex items-center rounded-xl transition-colors ${visualizationMode === 'heatmap' ? (isDark ? 'bg-white/15 font-semibold' : 'bg-black/[0.08] font-semibold') : (isDark ? 'text-slate-300' : 'text-slate-600')}`}>
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
                                       className={`p-2 rounded-lg transition-all ${useDynamicHeatmapRadius ? (isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white') : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
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
                      <div className="text-[13px] font-medium opacity-60 mb-2 px-2">Analysis Tools</div>
                      <div className="grid grid-cols-2 gap-2">
                          <Tooltip content="Filter data by time or GPS" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleFilter(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isFilterOpen ? (isDark ? '!border-slate-100' : '!border-[#1a1c1e]') : ''}`}
                             >
                                <ListFilter size={24}  />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Filter</span>
                             </button>
                          </Tooltip>

                          <Tooltip content="View Statistics" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleStats(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isStatsOpen ? (isDark ? '!border-slate-100' : '!border-[#1a1c1e]') : ''}`}
                             >
                                <BarChart2 size={24}  />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Stats</span>
                             </button>
                          </Tooltip>
                          
                          <Tooltip content="Generate PDF Report" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleReport(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isReportOpen ? (isDark ? '!border-slate-100' : '!border-[#1a1c1e]') : ''}`}
                             >
                                <FileText size={24}  />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Report</span>
                             </button>
                          </Tooltip>

                           <Tooltip content="Upload new data" theme={theme} position="bottom">
                             <button 
                                onClick={() => { toggleUpload(); setIsMobileMenuOpen(false); }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-white/50 bg-white/50'} ${isUploadOpen ? (isDark ? '!border-slate-100' : '!border-[#1a1c1e]') : ''}`}
                             >
                                <UploadCloud size={24}  />
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Upload</span>
                             </button>
                          </Tooltip>
                      </div>
                  </div>

                  {/* Section: Settings */}
                  <div>
                       <div className="text-[13px] font-medium opacity-60 mb-2 px-2">Settings</div>
                       <Tooltip content="Toggle Light/Dark Theme" theme={theme} position="top">
                           <button 
                                onClick={toggleTheme}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border ${isDark ? 'border-white/10 bg-slate-800/50 text-white' : 'border-white/50 bg-white/50 text-slate-900'}`}
                           >
                                <div className="flex items-center gap-3">
                                    {isDark ? <Moon size={20} /> : <Sun size={20} />}
                                    <span className="font-bold">Theme</span>
                                </div>
                                <div className={`text-xs font-medium px-2 py-1 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
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
