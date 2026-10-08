import React, { useState } from 'react';
import { User, Wind, Activity, Baby, HeartPulse, ChevronRight } from 'lucide-react';
import { Persona } from '../types';
import Tooltip from './Tooltip';

interface PersonaSelectorProps {
  selectedPersona: Persona;
  onSelect: (p: Persona) => void;
  theme: 'light' | 'dark';
  className?: string; // Added for Tour targeting
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ selectedPersona, onSelect, theme, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const personas: { id: Persona; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
    { 
        id: 'standard', 
        label: 'Standard', 
        icon: <User size={18} />, 
        desc: 'General public thresholds (EPA/AQI).',
        color: 'bg-blue-500'
    },
    { 
        id: 'asthmatic', 
        label: 'Sensitive', 
        icon: <Wind size={18} />, 
        desc: 'Asthma/Lung conditions. Stricter PM limits.',
        color: 'bg-purple-500'
    },
    { 
        id: 'child', 
        label: 'Child', 
        icon: <Baby size={18} />, 
        desc: 'Developing lungs. High breath rate.',
        color: 'bg-orange-500'
    },
    { 
        id: 'athlete', 
        label: 'Athlete', 
        icon: <HeartPulse size={18} />, 
        desc: 'Outdoor training. 10x intake volume.',
        color: 'bg-red-500'
    }
  ];

  const activeItem = personas.find(p => p.id === selectedPersona) || personas[0];
  const isDark = theme === 'dark';

  // Neutral glass: the profile changes thresholds, it carries no data colour itself
  const glassTrigger = isDark ? 'av-glass-dark text-slate-100' : 'av-glass text-[#1a1c1e]';
  const glassDropdown = isDark ? 'av-glass-dark' : 'av-glass';

  return (
    <div 
      className={`relative z-30 group ${className || ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
        {/* Trigger Button (Always Visible) */}
        {/* MOBILE OPTIMIZATION: Reduced padding, hidden label on small screens */}
        <Tooltip content="Select Health Risk Profile" theme={theme} position="right">
            <div 
                className={`
                    flex items-center gap-2 md:gap-3 min-h-[44px] px-3 md:px-4 rounded-2xl cursor-pointer transition-colors
                    ${glassTrigger}
                `}
            >
                <span className={`flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-[#50565c]'}`}>{activeItem.icon}</span>
                <div className="flex items-baseline gap-1.5 min-w-0">
                    {/* Hide the "Risk profile" prefix on mobile to save horizontal space */}
                    <span className={`hidden md:inline text-[13px] ${isDark ? 'text-slate-400' : 'text-[#50565c]'}`}>Risk profile</span>
                    <span className="text-sm font-semibold leading-tight truncate">{activeItem.label}</span>
                </div>
                <ChevronRight size={16} className={`ml-1 md:ml-2 opacity-40 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
        </Tooltip>

        {/* Dropdown Menu */}
        <div className={`
            absolute top-full left-0 w-[260px] md:w-[280px] pt-2 transition-all duration-300 origin-top-left
            ${isExpanded ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
        `}>
            <div className={`
                p-1.5 rounded-2xl flex flex-col gap-0.5
                ${glassDropdown}
            `}>
                {personas.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => {
                            onSelect(p.id);
                            setIsExpanded(false);
                        }}
                        className={`
                            flex items-start gap-3 p-3 rounded-xl text-left transition-colors
                            ${selectedPersona === p.id 
                                ? (isDark ? 'bg-white/15' : 'bg-black/[0.08]') 
                                : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/[0.04]')}
                        `}
                    >
                        <span className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-[#50565c]'}`}>
                            {p.icon}
                        </span>
                        <div>
                            <div className={`text-sm ${selectedPersona === p.id ? 'font-semibold' : 'font-medium'} ${isDark ? 'text-white' : 'text-[#1a1c1e]'}`}>
                                {p.label}
                            </div>
                            <div className={`text-xs leading-snug mt-0.5 ${isDark ? 'text-slate-400' : 'text-[#50565c]'}`}>
                                {p.desc}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default PersonaSelector;
