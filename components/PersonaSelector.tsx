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

  // Premium Glass Styles
  const glassTrigger = isDark 
    ? 'bg-slate-900/60 border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:bg-slate-800/60' 
    : 'bg-white/60 border-white/40 text-slate-900 shadow-[0_4px_20px_rgba(31,38,135,0.1)] hover:bg-white/70';

  const glassDropdown = isDark
    ? 'bg-slate-900/90 border-white/10'
    : 'bg-white/90 border-white/50';

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
                    flex items-center gap-2 md:gap-3 p-1.5 pr-3 md:p-2 md:pr-4 rounded-full backdrop-blur-xl border cursor-pointer transition-all duration-300
                    ${glassTrigger}
                `}
            >
                <div className={`p-1.5 md:p-2 rounded-full text-white ${activeItem.color} shadow-sm ring-1 ring-white/20`}>
                    {/* Clone icon to adjust size on mobile if needed, though size 18 is usually fine */}
                    {activeItem.icon}
                </div>
                <div className="flex flex-col">
                    {/* Hide the label "Risk Profile" on mobile to save vertical/horizontal space */}
                    <span className={`hidden md:block text-[10px] uppercase font-bold leading-none mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risk Profile</span>
                    <span className="text-xs md:text-sm font-bold leading-tight">{activeItem.label}</span>
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
                p-2 rounded-2xl border shadow-2xl flex flex-col gap-1 backdrop-blur-2xl
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
                            flex items-start gap-3 p-3 rounded-xl text-left transition-colors relative overflow-hidden
                            ${selectedPersona === p.id 
                                ? (isDark ? 'bg-white/10' : 'bg-black/5') 
                                : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}
                        `}
                    >
                         {/* Selection Indicator */}
                         {selectedPersona === p.id && (
                            <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${p.color}`} />
                        )}

                        <div className={`p-2 rounded-lg mt-0.5 ${p.color} text-white shadow-sm ring-1 ring-white/20`}>
                            {p.icon}
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {p.label}
                            </div>
                            <div className={`text-xs leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
