import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface TourStep {
  target: string; // CSS selector (e.g., "#my-id")
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const TourGuide: React.FC<TourGuideProps> = ({ steps, isOpen, onClose, theme }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Layout state
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [layout, setLayout] = useState<{
    x: number;
    y: number;
    arrowX?: number;
    arrowY?: number;
    placement: string;
    opacity: number;
  }>({ x: 0, y: 0, placement: 'bottom', opacity: 0 });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Helper: Find the first visible DOM element matching the selector
  // This handles cases where components are duplicated for responsive layouts (one hidden, one visible)
  const getVisibleElement = useCallback((selector: string): Element | null => {
    const elements = document.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rect = el.getBoundingClientRect();
      
      // Basic visibility check: must have dimensions
      if (rect.width > 0 && rect.height > 0) {
        // Advanced visibility check: check computed style
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            return el;
        }
      }
    }
    return null;
  }, []);

  // Helper: Find next visible step index
  const findNextVisibleStep = useCallback((startIndex: number, direction: 1 | -1): number => {
    let nextIndex = startIndex + direction;
    while (nextIndex >= 0 && nextIndex < steps.length) {
      const step = steps[nextIndex];
      const el = getVisibleElement(step.target);
      if (el) {
          return nextIndex;
      }
      nextIndex += direction;
    }
    return -1;
  }, [steps, getVisibleElement]);

  // Main Calculation Logic
  const calculatePosition = useCallback(() => {
    const step = steps[currentStepIndex];
    if (!step || !tooltipRef.current) return;

    const element = getVisibleElement(step.target);
    
    if (!element) {
        // Fallback: If current element is gone, try to move to next
        const next = findNextVisibleStep(currentStepIndex, 1);
        if (next !== -1) setCurrentStepIndex(next);
        else onClose();
        return;
    }

    const tRect = element.getBoundingClientRect();
    setTargetRect(tRect);

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 16; // Screen edge padding
    const gap = 16;     // Gap between target and tooltip

    // Preferred position
    let placement = step.position || 'bottom';
    
    // Force mobile to bottom usually, unless target is at very bottom
    if (window.innerWidth < 768) {
       placement = tRect.bottom > window.innerHeight - 250 ? 'top' : 'bottom';
    }

    // Initial Coordinates
    let x = 0;
    let y = 0;

    // Helper to center alignment
    const centerH = tRect.left + (tRect.width / 2) - (tooltipRect.width / 2);
    const centerV = tRect.top + (tRect.height / 2) - (tooltipRect.height / 2);

    switch (placement) {
        case 'top':
            x = centerH;
            y = tRect.top - gap - tooltipRect.height;
            break;
        case 'bottom':
            x = centerH;
            y = tRect.bottom + gap;
            break;
        case 'left':
            x = tRect.left - gap - tooltipRect.width;
            y = centerV;
            break;
        case 'right':
            x = tRect.right + gap;
            y = centerV;
            break;
    }

    // --- Boundary Logic & Clamping ---
    
    // 1. Vertical Flip Check (if sticking out top/bottom)
    if (placement === 'top' && y < padding) {
        placement = 'bottom';
        y = tRect.bottom + gap;
    } else if (placement === 'bottom' && y + tooltipRect.height > window.innerHeight - padding) {
        placement = 'top';
        y = tRect.top - gap - tooltipRect.height;
    }

    // 2. Horizontal Flip Check (if sticking out left/right)
    if (placement === 'left' && x < padding) {
        placement = 'right';
        x = tRect.right + gap;
    } else if (placement === 'right' && x + tooltipRect.width > window.innerWidth - padding) {
        placement = 'left';
        x = tRect.left - gap - tooltipRect.width;
    }

    // 3. Hard Clamping (keep it on screen)
    // Shift X
    if (x < padding) x = padding;
    if (x + tooltipRect.width > window.innerWidth - padding) {
        x = window.innerWidth - padding - tooltipRect.width;
    }

    // Shift Y
    if (y < padding) y = padding;
    if (y + tooltipRect.height > window.innerHeight - padding) {
        y = window.innerHeight - padding - tooltipRect.height;
    }

    // --- Arrow Calculation ---
    // The arrow needs to point to the center of the target, relative to the tooltip box
    let arrowX: number | undefined;
    let arrowY: number | undefined;

    // Target center in viewport coords
    const targetCenterX = tRect.left + tRect.width / 2;
    const targetCenterY = tRect.top + tRect.height / 2;

    // Relative to tooltip (top-left is 0,0)
    // We clamp arrow position so it doesn't detach from the tooltip corners
    const cornerRadius = 12; 

    if (placement === 'top' || placement === 'bottom') {
        arrowX = targetCenterX - x; // relative X
        // Clamp arrow to be within tooltip width
        arrowX = Math.max(cornerRadius, Math.min(tooltipRect.width - cornerRadius, arrowX));
    } else {
        arrowY = targetCenterY - y; // relative Y
        // Clamp arrow to be within tooltip height
        arrowY = Math.max(cornerRadius, Math.min(tooltipRect.height - cornerRadius, arrowY));
    }

    setLayout({ x, y, arrowX, arrowY, placement, opacity: 1 });
    setIsTransitioning(false);

  }, [currentStepIndex, steps, onClose, getVisibleElement, findNextVisibleStep]);


  // Effect: Scroll to element and trigger calc
  useEffect(() => {
    if (!isOpen) {
        // Safety Reset
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
    }
    
    setIsTransitioning(true);
    // Hide while calculating
    setLayout(prev => ({ ...prev, opacity: 0 }));

    const step = steps[currentStepIndex];
    if (!step) return;

    const el = getVisibleElement(step.target);
    if (el) {
        // CRITICAL FIX: inline: 'nearest' prevents the horizontal viewport shift
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    // Wait for scroll/render
    const timer = setTimeout(() => {
        calculatePosition();
    }, 400);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isOpen, steps, calculatePosition, getVisibleElement]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => requestAnimationFrame(calculatePosition);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePosition]);


  // Navigation Handlers
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransitioning) return;
    
    const next = findNextVisibleStep(currentStepIndex, 1);
    if (next !== -1) {
      setCurrentStepIndex(next);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransitioning) return;

    const prev = findNextVisibleStep(currentStepIndex, -1);
    if (prev !== -1) {
      setCurrentStepIndex(prev);
    }
  };

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];
  
  // Check if prev/next exist (using visible check logic)
  const isLastStep = findNextVisibleStep(currentStepIndex, 1) === -1;
  const isFirstStep = findNextVisibleStep(currentStepIndex, -1) === -1;

  const isDark = theme === 'dark';
  // Solid card: it sits on the dimmed overlay, not directly on the map
  const bgClass = isDark ? 'bg-[#1b1e22] text-slate-100 border-white/10' : 'bg-white text-[#1a1c1e] border-black/10';
  const muted = isDark ? 'text-slate-400' : 'text-[#50565c]';
  // Count only the steps whose target is on screen (e.g. the mobile menu is hidden on desktop)
  const visibleSteps = steps.map((st, i) => (getVisibleElement(st.target) ? i : -1)).filter(i => i !== -1);
  const visibleCount = visibleSteps.length || steps.length;
  const visiblePosition = Math.max(0, visibleSteps.indexOf(currentStepIndex)) + 1;

  return createPortal(
    <div className="fixed inset-0 z-[99998] pointer-events-auto">
      
      {/* SVG Mask & Highlight */}
      {targetRect && (
        <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none transition-all duration-300">
            <defs>
            <mask id="tour-mask" x="0" y="0" width="100%" height="100%">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect 
                x={targetRect.left - 4} 
                y={targetRect.top - 4} 
                width={targetRect.width + 8} 
                height={targetRect.height + 8} 
                rx="8" 
                fill="black" 
                />
            </mask>
            </defs>
            <rect 
            x="0" 
            y="0" 
            width="100%" 
            height="100%" 
            fill="rgba(0,0,0,0.45)" 
            mask="url(#tour-mask)" 
            />
            {/* Highlight Border */}
            <rect 
            x={targetRect.left - 4} 
            y={targetRect.top - 4} 
            width={targetRect.width + 8} 
            height={targetRect.height + 8} 
            rx="8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            />
        </svg>
      )}
      
      {/* Tooltip Card */}
      <div 
        ref={tooltipRef}
        style={{
            position: 'fixed',
            left: layout.x,
            top: layout.y,
            width: '320px', // Fixed width for consistency
            maxWidth: 'calc(100vw - 32px)',
            opacity: layout.opacity,
            transform: `scale(${layout.opacity === 0 ? 0.95 : 1})`,
        }}
        className={`
            absolute rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.25)] p-5 border flex flex-col gap-3 transition-all duration-300
            ${bgClass}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow Element */}
        {layout.opacity > 0 && (
           <div 
             className={`absolute w-4 h-4 transform rotate-45 border border-l-0 border-t-0 ${bgClass}`}
             style={{
                 left: layout.placement === 'left' || layout.placement === 'right' ? (layout.placement === 'left' ? 'auto' : '-9px') : (layout.arrowX ? layout.arrowX - 8 : '50%'),
                 right: layout.placement === 'left' ? '-9px' : 'auto',
                 top: layout.placement === 'top' || layout.placement === 'bottom' ? (layout.placement === 'top' ? 'auto' : '-9px') : (layout.arrowY ? layout.arrowY - 8 : '50%'),
                 bottom: layout.placement === 'top' ? '-9px' : 'auto',
                 // Specific border overrides to match orientation
                 borderLeftWidth: (layout.placement === 'right') ? '0' : '1px',
                 borderTopWidth: (layout.placement === 'bottom') ? '0' : '1px',
                 borderRightWidth: (layout.placement === 'left') ? '0' : '1px',
                 borderBottomWidth: (layout.placement === 'top') ? '0' : '1px',
                 backgroundColor: 'inherit' // Inherits bg color from parent
             }}
           />
        )}

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className={`text-[13px] ${muted}`}>Step {visiblePosition} of {visibleCount}</div>
            <h3 className="font-semibold text-lg leading-snug mt-0.5">{currentStep?.title}</h3>
          </div>
          <button onClick={onClose} aria-label="Close tour" className={`w-9 h-9 -mr-2 -mt-1 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}>
            <X size={18} />
          </button>
        </div>
        
        <p className={`text-[15px] leading-relaxed relative z-10 ${isDark ? 'text-slate-300' : 'text-[#3d4248]'}`}>
          {currentStep?.content}
        </p>

        <div className={`flex items-center justify-between mt-1 pt-3 border-t relative z-10 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
           <button 
             onClick={handlePrev}
             disabled={isFirstStep}
             className={`h-10 px-3 -ml-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'} ${isFirstStep ? 'opacity-30 cursor-not-allowed' : ''}`}
           >
             Back
           </button>
           
           <div className="flex items-center gap-2">
             <div className="flex gap-1 mr-2" aria-hidden="true">
                {(visibleSteps.length ? visibleSteps : steps.map((_, i) => i)).map((i) => (
                    <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === currentStepIndex ? (isDark ? 'bg-slate-100' : 'bg-[#1a1c1e]') : (isDark ? 'bg-white/20' : 'bg-black/15')}`} 
                    />
                ))}
             </div>
             <button 
                onClick={handleNext}
                className={`flex items-center gap-1 h-10 px-4 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black'}`}
             >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight size={14} />}
             </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TourGuide;
