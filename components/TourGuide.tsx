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

  const bgClass = theme === 'dark' ? 'bg-slate-800 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-200';

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
            fill="rgba(0,0,0,0.6)" 
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
            stroke={theme === 'dark' ? '#22d3ee' : '#2563eb'}
            strokeWidth="3"
            className="animate-pulse"
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
            absolute rounded-xl shadow-2xl p-5 border flex flex-col gap-3 transition-all duration-300
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
          <h3 className="font-bold text-lg flex items-center gap-2">
            <div className="bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
               {currentStepIndex + 1}
            </div>
            <span>{currentStep?.title}</span>
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
            <X size={16} className="opacity-50" />
          </button>
        </div>
        
        <p className="text-sm leading-relaxed opacity-80 relative z-10">
          {currentStep?.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-black/5 dark:border-white/5 relative z-10">
           <button 
             onClick={handlePrev}
             disabled={isFirstStep}
             className={`text-xs font-bold uppercase py-2 px-3 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isFirstStep ? 'opacity-30 cursor-not-allowed' : ''}`}
           >
             Back
           </button>
           
           <div className="flex items-center gap-2">
             <div className="flex gap-1 mr-2">
                {steps.map((_, i) => (
                    <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === currentStepIndex ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'}`} 
                    />
                ))}
             </div>
             <button 
                onClick={handleNext}
                className="flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold uppercase py-2 px-4 rounded-lg shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
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
