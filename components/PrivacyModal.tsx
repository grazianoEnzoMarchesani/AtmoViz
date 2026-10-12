import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { setMapConsent, useMapConsent } from '../utils/mapConsent';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const UPDATED = 'October 2026';

// This text describes what the app really does. If a third-party service, a stored value
// or a purpose changes, change it here in the same commit. Network calls to keep in sync:
// utils/mapStyle.ts + utils/mapConsent.ts (OpenFreeMap, only after consent),
// components/ReportModal.tsx (Gemini, only when built with GEMINI_API_KEY).

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, theme }) => {
  const consent = useMapConsent();
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const ink = isDark ? 'text-slate-100' : 'text-[#1a1c1e]';
  const subText = isDark ? 'text-slate-400' : 'text-[#50565c]';
  const hairline = isDark ? 'border-white/10' : 'border-black/10';
  const link = 'underline underline-offset-2';

  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className={`text-[13px] font-semibold uppercase tracking-wide mt-6 mb-2 ${subText}`}>{children}</h3>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[15px] leading-relaxed mb-2">{children}</p>
  );
  const UL = ({ children }: { children: React.ReactNode }) => (
    <ul className="text-[15px] leading-relaxed list-disc pl-5 mb-2 space-y-1">{children}</ul>
  );
  const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={link}>{children}</a>
  );

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl ${isDark ? 'av-glass-dark' : 'av-glass'} ${ink} animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div>
            <h2 id="privacy-title" className="text-xl font-semibold">Privacy notice</h2>
            <p className={`text-sm mt-0.5 ${subText}`}>Last updated {UPDATED}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close privacy notice"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className={`px-6 pb-6 pt-2 mt-3 overflow-y-auto border-t ${hairline}`}>
          <H>In short</H>
          <P>
            AtmoViz processes your measurement files and photos <strong>entirely in your browser</strong>.
            Nothing you load — sensor readings, GPS tracks, photos or their metadata — is uploaded to a
            server. The app sets no cookies, runs no analytics, carries no advertising and does not profile
            its visitors. Fonts and styling are served from this same site: no third-party script or font is loaded.
          </P>
          <P>
            One feature reaches a third party, and <strong>it stays off until you accept it</strong>: the
            base map, whose tiles come from OpenFreeMap. If you accept, <strong>your IP address</strong> reaches
            that service and it can tell roughly <strong>where on Earth your route is</strong>. If you decline,
            the map background stays blank and the rest of the app works the same.
          </P>

          <div className={`rounded-xl border p-3 mt-3 ${hairline}`}>
            <div className={`text-[13px] font-semibold uppercase tracking-wide mb-2 ${subText}`}>Your choice</div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[15px]">
                Base map from OpenFreeMap:{' '}
                <strong>{consent === 'granted' ? 'on' : consent === 'denied' ? 'off' : 'not chosen yet'}</strong>
              </span>
              {consent === 'granted' ? (
                <button
                  onClick={() => setMapConsent('denied')}
                  className={`h-9 px-4 rounded-lg border text-sm font-semibold ${isDark ? 'border-white/20 hover:bg-white/10' : 'border-black/20 hover:bg-black/[0.06]'}`}
                >
                  Turn off
                </button>
              ) : (
                <button
                  onClick={() => setMapConsent('granted')}
                  className={`h-9 px-4 rounded-lg text-sm font-semibold ${isDark ? 'bg-slate-100 text-[#1a1c1e]' : 'bg-[#1a1c1e] text-white'}`}
                >
                  Accept and turn on
                </button>
              )}
            </div>
          </div>

          <H>1. Data controller</H>
          <P>
            The controller is <strong>Graziano Enzo Marchesani</strong>, acting as a natural person.
            Contact: <strong>graziano.marchesani [at] unicam.it</strong> (replace <code>[at]</code> with <code>@</code>).
          </P>
          <P>
            This is a personal research project. <strong>It is not an institutional site: the University of
            Camerino does not operate it or determine the purposes of the processing described here.</strong>{' '}
            No Data Protection Officer has been appointed.
          </P>

          <H>2. What stays on your device</H>
          <UL>
            <li><strong>Data files</strong> (.csv, .xlsx, .xls) are read and parsed locally.</li>
            <li>
              <strong>Photos</strong> are read locally. Geotagged photos, including FLIR thermal images, can
              contain personal data in their EXIF metadata (GPS position, date and time, camera model, sometimes
              serial number or operator name). AtmoViz reads it to place the photo on the map and never transmits it.
            </li>
            <li><strong>PDF reports</strong> are generated in the browser. The file is yours to share; where
              it shows other people’s property or people, you are responsible for how you use it.</li>
            <li>
              <strong>One stored value, and no cookies.</strong> The only thing the app writes to your browser is
              your answer about the base map (<code>atmoviz.mapConsent</code> in <code>localStorage</code>, with the
              date). It identifies nobody, it is not sent anywhere, and it expires after six months, after which you
              are asked again. You can delete it from your browser settings at any time. Everything else you
              load is held in memory and is gone when you close or reload the tab. This was checked on the built
              app: no cookie is set and nothing else is stored.
            </li>
            <li>
              <strong>No telemetry.</strong> There is no analytics, error reporting, tracking pixel, advertising
              or social-media widget, and no request carries your data to the controller or to anyone else.
            </li>
          </UL>

          <H>3. Services contacted by the page</H>
          <P>
            Only two parties are involved, and only one of them is optional. In each case the service receives what
            any web request carries: your <strong>IP address</strong>, browser information (user agent) and the
            address of this site (the <em>referrer</em>). Neither receives the contents of your files, your photos
            or their metadata.
          </P>
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className={subText}>
                  <th className={`text-left font-semibold p-2 border ${hairline}`}>Service</th>
                  <th className={`text-left font-semibold p-2 border ${hairline}`}>Why</th>
                  <th className={`text-left font-semibold p-2 border ${hairline}`}>When</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr>
                  <td className={`p-2 border ${hairline}`}>GitHub Pages (GitHub, Inc.)</td>
                  <td className={`p-2 border ${hairline}`}>Hosts the app, including its fonts and styles; keeps standard access logs.</td>
                  <td className={`p-2 border ${hairline}`}>Every visit (unavoidable: it is where the page comes from)</td>
                </tr>
                <tr>
                  <td className={`p-2 border ${hairline}`}><A href="https://openfreemap.org">OpenFreeMap</A></td>
                  <td className={`p-2 border ${hairline}`}>
                    Base-map vector tiles and map fonts. Each tile request encodes a map position and zoom, so,
                    together with your IP address, the provider can tell <strong>which area your route covers</strong>.
                    It never receives the measurements, timestamps or photos themselves.
                  </td>
                  <td className={`p-2 border ${hairline}`}><strong>Only after you accept</strong> the base map</td>
                </tr>
                <tr>
                  <td className={`p-2 border ${hairline}`}>Google Gemini API (Google LLC)</td>
                  <td className={`p-2 border ${hairline}`}>
                    Optional written summary in the PDF report. Receives computed statistics (min / mean / max,
                    date range) and the selected risk profile’s thresholds — not your files, rows or photos.
                    The service is Google’s and subject to its terms.
                  </td>
                  <td className={`p-2 border ${hairline}`}>
                    Only in a build made with an API key, when you generate a report. <strong>The public demo has
                    no key and never calls it.</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            Each provider processes these technical data as an independent controller under its own policy.
            GitHub and Google are based in the United States; transfers rely on the EU–US Data Privacy Framework
            and standard contractual clauses where applicable.
          </P>
          <UL>
            <li>
              <strong>Purposes:</strong> delivering the page; drawing the base map when you ask for it.
            </li>
            <li>
              <strong>Legal basis:</strong> for the base map, your <strong>consent</strong>, Article 6(1)(a) GDPR,
              which you can withdraw at any time from the box at the top of this notice (withdrawal does not
              undo requests already made). For hosting, the controller’s legitimate interest in providing a
              working service, Article 6(1)(f); the controller has no access to hosting logs and uses them for nothing.
            </li>
            <li>
              <strong>Not collected by the controller:</strong> the controller operates no server and receives
              neither your IP address nor anything else about you; the logs above stay with the providers.
            </li>
            <li>
              <strong>If you decline:</strong> the map background stays blank, nothing is requested from OpenFreeMap,
              and the data panels, charts, statistics and PDF reports work the same. The code is open source, so you
              can also run AtmoViz locally (see the README).
            </li>
          </UL>

          <H>4. Retention</H>
          <P>
            The controller keeps no copy of anything you load. Hosting and tile-provider logs are retained by
            those providers according to their own policies.
          </P>

          <H>5. Your rights</H>
          <P>
            You may exercise the rights in Articles 15–22 GDPR (access, rectification, erasure, restriction,
            portability, objection) by writing to the address above; you will get a reply within one month.
            As the controller holds no data about you beyond what is described here, most requests must be
            addressed to the providers in section 3. You may lodge a complaint with the Italian data protection
            authority, the <A href="https://www.garanteprivacy.it">Garante per la protezione dei dati personali</A>,
            or with the authority of your country.
          </P>
          <P>
            No profiling or automated decision-making within the meaning of Article 22 GDPR takes place. The site
            is not directed at children under fourteen.
          </P>

          <H>6. Changes</H>
          <P>
            This notice is updated when the app or the law changes; the date at the top shows the latest revision.
            The source code is public at <A href="https://github.com/grazianoEnzoMarchesani/AtmoViz">github.com/grazianoEnzoMarchesani/AtmoViz</A>,
            so every statement above can be checked.
          </P>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
