import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock3, Monitor, RefreshCw, ShieldCheck, Smartphone, Tablet } from 'lucide-react';

type DeviceType = 'desktop' | 'mobile' | 'tablet';
type Browser = 'Chrome' | 'Edge' | 'Firefox' | 'Opera' | 'Safari' | 'Other';
type OperatingSystem = 'Android' | 'ChromeOS' | 'iOS' | 'Linux' | 'macOS' | 'Other' | 'Windows';
type ConsentStatus = 'unknown' | 'granted' | 'denied';

interface DeviceVisit {
  visitedAt: string;
  deviceType: DeviceType;
  browser: Browser;
  operatingSystem: OperatingSystem;
}

const consentKey = 'securewatch-device-intelligence-consent';
const sessionRecordedKey = 'securewatch-device-intelligence-recorded';

function getCoarseDeviceProfile(): Omit<DeviceVisit, 'visitedAt'> {
  const userAgent = navigator.userAgent;
  const deviceType: DeviceType = /ipad|tablet|kindle|silk/i.test(userAgent)
    ? 'tablet'
    : /android/i.test(userAgent) && !/mobile/i.test(userAgent)
      ? 'tablet'
      : /mobile|iphone|ipod|android/i.test(userAgent)
        ? 'mobile'
        : 'desktop';
  const browser: Browser = / opr\/|opera/i.test(userAgent)
    ? 'Opera'
    : /edg\//i.test(userAgent)
      ? 'Edge'
      : /firefox\//i.test(userAgent)
        ? 'Firefox'
        : /chrome\//i.test(userAgent)
          ? 'Chrome'
          : /safari\//i.test(userAgent) && !/chrome|chromium|android/i.test(userAgent)
            ? 'Safari'
            : 'Other';
  const operatingSystem: OperatingSystem = /android/i.test(userAgent)
    ? 'Android'
    : /iphone|ipad|ipod/i.test(userAgent)
      ? 'iOS'
      : /cros/i.test(userAgent)
        ? 'ChromeOS'
        : /windows/i.test(userAgent)
          ? 'Windows'
          : /macintosh|mac os x/i.test(userAgent)
            ? 'macOS'
            : /linux/i.test(userAgent)
              ? 'Linux'
              : 'Other';

  return { deviceType, browser, operatingSystem };
}

export const DeviceIntelligence: React.FC = () => {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(
    () => (localStorage.getItem(consentKey) as ConsentStatus | null) ?? 'unknown'
  );
  const [visits, setVisits] = useState<DeviceVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const captureInProgress = useRef(false);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const response = await fetch('/api/device-intelligence/visits');
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const result = (await response.json()) as { visits: DeviceVisit[] };
      setVisits(result.visits);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Could not load visit records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const recordVisit = useCallback(async () => {
    if (captureInProgress.current || sessionStorage.getItem(sessionRecordedKey) === 'true') return;
    captureInProgress.current = true;
    setCaptureError(null);
    try {
      const response = await fetch('/api/device-intelligence/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, ...getCoarseDeviceProfile() }),
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      sessionStorage.setItem(sessionRecordedKey, 'true');
      await loadVisits();
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Could not record this visit.');
    } finally {
      captureInProgress.current = false;
    }
  }, [loadVisits]);

  useEffect(() => {
    void loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (consentStatus === 'granted') void recordVisit();
  }, [consentStatus, recordVisit]);

  const chooseConsent = (choice: Exclude<ConsentStatus, 'unknown'>) => {
    localStorage.setItem(consentKey, choice);
    setConsentStatus(choice);
  };

  const deviceIcon = (deviceType: DeviceType) => {
    if (deviceType === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (deviceType === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-cyan-900/60 bg-[#0b0d10] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Consent-based Device Intelligence</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Understand broad visitor device trends. No names, IP addresses, exact screen dimensions, precise location,
              persistent device IDs, or full browser fingerprints are collected.
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300">
            <ShieldCheck className="mr-1.5 inline h-4 w-4" />
            30-day retention · 1,000-record limit
          </div>
        </div>

        {consentStatus === 'unknown' && (
          <div className="mt-5 rounded-lg border border-zinc-800 bg-black/40 p-4">
            <p className="text-sm text-zinc-300">
              Allow this site to store one anonymous visit record per browser session containing only device category,
              browser family, operating system family, and visit time?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => chooseConsent('granted')}
                className="rounded-lg border border-cyan-700 bg-cyan-950/50 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50"
              >
                Allow &amp; record this visit
              </button>
              <button
                type="button"
                onClick={() => chooseConsent('denied')}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {consentStatus === 'granted' && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Anonymous device-category collection is enabled for this browser.
            </div>
            <button
              type="button"
              onClick={() => chooseConsent('denied')}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Stop future collection
            </button>
          </div>
        )}

        {consentStatus === 'denied' && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
            <p className="text-sm text-zinc-400">This browser has declined collection. No visit is recorded.</p>
            <button
              type="button"
              onClick={() => chooseConsent('granted')}
              className="rounded-lg border border-cyan-800 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-950/40"
            >
              Allow collection
            </button>
          </div>
        )}

        {captureError && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rose-900/60 bg-rose-950/20 p-3 text-xs text-rose-300">
            <span><AlertCircle className="mr-2 inline h-4 w-4" />Could not record this consented visit: {captureError}</span>
            <button type="button" onClick={() => void recordVisit()} className="underline underline-offset-2">Retry</button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-[#0c0c0e]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 p-4 sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-white">Recent consented visits</h3>
            <p className="mt-1 text-xs text-zinc-500">Anonymous coarse categories only. Records expire after 30 days.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadVisits()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-cyan-800 hover:text-cyan-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {listError ? (
          <div className="p-5 text-sm text-rose-300"><AlertCircle className="mr-2 inline h-4 w-4" />Could not load records: {listError}</div>
        ) : visits.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No consented device visits recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="bg-zinc-950/70 font-mono uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Device type</th>
                  <th className="px-5 py-3 font-medium">Browser</th>
                  <th className="px-5 py-3 font-medium">Operating system</th>
                  <th className="px-5 py-3 font-medium">Visit time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {visits.map((visit, index) => (
                  <tr key={`${visit.visitedAt}-${index}`} className="text-zinc-300">
                    <td className="px-5 py-3"><span className="inline-flex items-center gap-2">{deviceIcon(visit.deviceType)}{visit.deviceType}</span></td>
                    <td className="px-5 py-3">{visit.browser}</td>
                    <td className="px-5 py-3">{visit.operatingSystem}</td>
                    <td className="px-5 py-3 text-zinc-400"><Clock3 className="mr-1.5 inline h-3.5 w-3.5" />{new Date(visit.visitedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
