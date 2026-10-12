import React from 'react';
import { MapPinned } from 'lucide-react';
import { setMapConsent, useMapConsent } from '../utils/mapConsent';

interface MapConsentDialogProps {
  theme: 'light' | 'dark';
  onOpenPrivacy: () => void;
}

// Shown until the visitor chooses. Nothing leaves the page before they do.
const MapConsentDialog: React.FC<MapConsentDialogProps> = ({ theme, onOpenPrivacy }) => {
  const consent = useMapConsent();
  if (consent !== 'unset') return null;

  const isDark = theme === 'dark';
  const subText = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const solid = isDark ? 'bg-slate-100 text-[#1a1c1e] hover:bg-white' : 'bg-[#1a1c1e] text-white hover:bg-black';
  const outline = isDark ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/[0.06]';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
        className={`w-full max-w-md rounded-3xl p-6 ${isDark ? 'av-glass-dark text-slate-100' : 'av-glass text-[#1a1c1e]'}`}
      >
        <MapPinned size={28} strokeWidth={1.6} className="mb-3" />
        <h2 id="consent-title" className="text-xl font-semibold">Load the base map?</h2>
        <div id="consent-desc" className="text-[15px] leading-relaxed mt-2 space-y-2">
          <p>
            Your files and photos never leave your browser. To draw the map, though, AtmoViz downloads map
            tiles from <strong>OpenFreeMap</strong>, which then receives your <strong>IP address</strong> and
            can tell <strong>which area your route covers</strong>.
          </p>
          <p className={subText}>
            If you decline, the map background stays blank and no request is made to anyone; all the data
            panels, charts and reports work the same. You can change your mind at any time from the privacy
            notice.
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
          <button
            onClick={() => setMapConsent('denied')}
            className={`flex-1 h-11 rounded-xl border font-semibold transition-colors ${outline}`}
          >
            Decline
          </button>
          <button
            onClick={() => setMapConsent('granted')}
            className={`flex-1 h-11 rounded-xl font-semibold transition-colors ${solid}`}
          >
            Accept
          </button>
        </div>
        <button onClick={onOpenPrivacy} className={`mt-3 text-sm underline underline-offset-2 ${subText}`}>
          Read the privacy notice
        </button>
      </div>
    </div>
  );
};

export default MapConsentDialog;
