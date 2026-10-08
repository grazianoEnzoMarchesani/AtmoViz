
import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-end';
  theme?: 'light' | 'dark';
  className?: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top', 
  theme = 'light', 
  className = '',
  delay = 200 
}) => {
  const isDark = theme === 'dark';
  
  // Dynamic positioning classes
  let posClasses = '';
  let arrowClasses = '';
  
  switch (position) {
    case 'top':
      posClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2.5';
      arrowClasses = 'top-full left-1/2 -translate-x-1/2 border-t-current border-l-transparent border-r-transparent border-b-transparent';
      break;
    case 'bottom':
      posClasses = 'top-full left-1/2 -translate-x-1/2 mt-2.5';
      arrowClasses = 'bottom-full left-1/2 -translate-x-1/2 border-b-current border-l-transparent border-r-transparent border-t-transparent';
      break;
    case 'left':
      posClasses = 'right-full top-1/2 -translate-y-1/2 mr-2.5';
      arrowClasses = 'left-full top-1/2 -translate-y-1/2 border-l-current border-t-transparent border-b-transparent border-r-transparent';
      break;
    case 'right':
      posClasses = 'left-full top-1/2 -translate-y-1/2 ml-2.5';
      arrowClasses = 'right-full top-1/2 -translate-y-1/2 border-r-current border-t-transparent border-b-transparent border-l-transparent';
      break;
    case 'bottom-end':
      posClasses = 'top-full right-0 mt-2.5';
      // Arrow positioned slightly inwards from the right to align with typical icon centers
      arrowClasses = 'bottom-full right-3 border-b-current border-l-transparent border-r-transparent border-t-transparent';
      break;
  }

  // Colors
  const bgClass = isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white';
  const borderClass = isDark ? 'text-slate-100' : 'text-[#1a1c1e]'; // For the arrow (using text color for border trick)

  return (
    <div className={`relative group flex items-center justify-center ${className}`}>
      {children}
      <div 
        className={`
          absolute ${posClasses} px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-lg z-[9999] pointer-events-none
          whitespace-nowrap transition-all duration-200 ease-out transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100
          ${bgClass}
        `}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {content}
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-[5px] ${arrowClasses} ${borderClass}`} />
      </div>
    </div>
  );
};

export default Tooltip;
