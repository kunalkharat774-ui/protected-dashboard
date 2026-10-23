import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  Radio,
  SearchCheck,
  ShieldAlert,
  ShieldOff,
} from 'lucide-react';
import {
  getThreatCountryName,
  useCheckPointThreatFeed,
  type ThreatAttack,
} from '../lib/useCheckPointThreatFeed';

interface CountryIntel {
  trend?: { attacks?: number[]; dates?: string[] };
  malware_types?: { attacksByType?: Record<string, number[]> };
}

interface NvdCve {
  id: string;
  descriptions?: Array<{ lang: string; value: string }>;
  published?: string;
  lastModified?: string;
  references?: Array<{ url: string; source?: string }>;
  metrics?: {
    cvssMetricV31?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
    cvssMetricV30?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
    cvssMetricV2?: Array<{ cvssData?: { baseScore?: number }; baseSeverity?: string }>;
  };
}

interface InvestigationResult {
  sourceCountry?: CountryIntel;
  destinationCountry?: CountryIntel;
  cve?: NvdCve;
  errors: string[];
}

interface SecurityLogEntry {
  id: number;
  occurredAt: string;
  method: string;
  path: string;
  statusCode: number;
  category: string;
  severity: 'info' | 'medium' | 'high';
  kind: 'observed' | 'detection';
}

const countryEventCount = (country: CountryIntel | undefined) => country?.trend?.attacks?.[0];
const cvePattern = /\bCVE-\d{4}-\d{4,}\b/i;

const getCveSummary = (cve: NvdCve) => {
  const cvssV31 = cve.metrics?.cvssMetricV31?.[0];
  const cvssV30 = cve.metrics?.cvssMetricV30?.[0];
  const cvssV2 = cve.metrics?.cvssMetricV2?.[0];
  return {
    score: cvssV31?.cvssData?.baseScore ?? cvssV30?.cvssData?.baseScore ?? cvssV2?.cvssData?.baseScore,
    severity: cvssV31?.cvssData?.baseSeverity ?? cvssV30?.cvssData?.baseSeverity ?? cvssV2?.baseSeverity,
    description: cve.descriptions?.find((item) => item.lang === 'en')?.value,
  };
};

export const SecurityAlerts: React.FC = () => {
  const { attacks, feedState, totalToday } = useCheckPointThreatFeed();
  const [securityLogs, setSecurityLogs] = useState<SecurityLogEntry[]>([]);
  const [securityLogError, setSecurityLogError] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<ThreatAttack | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const filteredAttacks = useMemo(
    () => filter === 'all' ? attacks : attacks.filter((attack) => attack.a_t.toLowerCase() === filter),
    [attacks, filter]
  );
  const cveId = selectedAttack?.a_n.match(cvePattern)?.[0].toUpperCase() ?? null;
  const chartBuckets = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => ({ observed: 0, detections: 0 }));
    const now = Date.now();
    for (const entry of securityLogs) {
      const age = now - Date.parse(entry.occurredAt);
      if (!Number.isFinite(age) || age < 0 || age >= 60 * 60 * 1000) continue;
      const index = 11 - Math.floor(age / (5 * 60 * 1000));
      if (entry.kind === 'detection') buckets[index].detections += 1;
      else buckets[index].observed += 1;
    }
    return buckets;
  }, [securityLogs]);
  const chartMax = Math.max(1, ...chartBuckets.map((bucket) => bucket.observed + bucket.detections));

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const loadSecurityLogs = async () => {
      try {
        const response = await fetch('/api/security-logs', { cache: 'no-store' });
        const data: unknown = await response.json();
        if (!response.ok) {
          const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : response.statusText;
          throw new Error(`Security request log: ${message}`);
        }
        if (!data || typeof data !== 'object' || !('items' in data) || !Array.isArray(data.items)) {
          throw new Error('Security request log returned an invalid response.');
        }
        if (active) {
          setSecurityLogs(data.items as SecurityLogEntry[]);
          setSecurityLogError(null);
        }
      } catch (error) {
        if (active) {
          setSecurityLogError(error instanceof Error ? error.message : 'Unable to retrieve security request logs.');
        }
      } finally {
        if (active) timer = window.setTimeout(loadSecurityLogs, 5000);
      }
    };

    void loadSecurityLogs();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedAttack) {
      setInvestigation(null);
      setInvestigationError(null);
      setInvestigating(false);
      return;
    }

    const controller = new AbortController();
    const investigate = async () => {
      setInvestigation(null);
      setInvestigationError(null);
      setInvestigating(true);
      const result: InvestigationResult = { errors: [] };
      const countryRequests: Array<{ role: 'sourceCountry' | 'destinationCountry'; code: string | null }> = [
        { role: 'sourceCountry', code: selectedAttack.s_co ?? null },
        { role: 'destinationCountry', code: selectedAttack.d_co ?? null },
      ];
      const tasks = countryRequests.map(async ({ role, code }) => {
        if (!code) return;
        const response = await fetch(`/api/threat-map/countries/${encodeURIComponent(code)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`${getThreatCountryName(code)} country intelligence: ${data.error || response.statusText}`);
        result[role] = data as CountryIntel;
      });

      if (cveId) {
        tasks.push((async () => {
          const response = await fetch(`/api/threat-map/cves/${encodeURIComponent(cveId)}`, {
            signal: controller.signal,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(`NVD ${cveId}: ${data.error || response.statusText}`);
          const item = (data.vulnerabilities as Array<{ cve: NvdCve }> | undefined)?.[0]?.cve;
          if (!item) throw new Error(`NVD returned no vulnerability record for ${cveId}.`);
          result.cve = item;
        })());
      }

      const outcomes = await Promise.allSettled(tasks);
      if (controller.signal.aborted) return;
      result.errors = outcomes.flatMap((outcome) =>
        outcome.status === 'rejected'
          ? [outcome.reason instanceof Error ? outcome.reason.message : 'An investigation lookup failed.']
          : []
      );
      setInvestigation(result);
      if (result.errors.length && !result.sourceCountry && !result.destinationCountry && !result.cve) {
        setInvestigationError(result.errors.join(' '));
      }
      setInvestigating(false);
    };

    void investigate().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        console.error('Unexpected failure while investigating a live security alert:', error);
        setInvestigationError(error instanceof Error ? error.message : 'Unexpected investigation failure.');
        setInvestigating(false);
      }
    });
    return () => controller.abort();
  }, [selectedAttack, cveId]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-cyan-900/60 bg-[#070b11] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <h1 className="text-lg font-bold text-white">Security Alerts</h1>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Live provider events from Check Point ThreatCloud—not generated demo alerts.
            </p>
          </div>
          <a
            href="https://threatmap.checkpoint.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-cyan-700 hover:text-cyan-200"
          >
            Official threat map <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Feed status</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <span className={`h-2 w-2 rounded-full ${feedState === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
              {feedState === 'live' ? 'Live' : feedState === 'connecting' ? 'Connecting' : 'Reconnecting'}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Provider attacks today</p>
            <p className="mt-1 font-mono text-lg font-bold text-rose-300">
              {totalToday === null ? 'Not received' : totalToday.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Events held in this view</p>
            <p className="mt-1 font-mono text-lg font-bold text-cyan-200">{attacks.length}</p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
              Check Point&apos;s public feed provides country and approximate coordinates, not source IP addresses.
              No firewall/WAF is connected. Blocking by country or guessed IP would not be a verified response.
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#070b11]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">This app · live request security log</h2>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">
              Actual requests handled by this server; detections use transparent path, method, and error-rate rules.
            </p>
          </div>
          <span className="rounded border border-zinc-700 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-400">
            In-memory · latest 250 · no IPs or query strings
          </span>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-4 text-[9px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-cyan-400" /> Requests observed</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-rose-400" /> Rule detections</span>
              <span className="ml-auto">Last hour · 5-minute buckets</span>
            </div>
            <svg
              viewBox="0 0 720 180"
              role="img"
              aria-label="Observed server requests and rule detections over the last hour"
              className="h-40 w-full"
            >
              {[0, 1, 2, 3].map((line) => {
                const y = 138 - line * 34;
                return <line key={line} x1="24" x2="704" y1={y} y2={y} stroke="#27272a" strokeDasharray="3 5" />;
              })}
              {chartBuckets.map((bucket, index) => {
                const x = 34 + index * 56;
                const observedHeight = bucket.observed / chartMax * 102;
                const detectionHeight = bucket.detections / chartMax * 102;
                return (
                  <g key={index}>
                    <rect x={x} y={138 - observedHeight} width="24" height={observedHeight} rx="2" fill="#22d3ee" opacity="0.8">
                      <title>{bucket.observed} observed requests</title>
                    </rect>
                    <rect x={x} y={138 - observedHeight - detectionHeight} width="24" height={detectionHeight} rx="2" fill="#fb7185">
                      <title>{bucket.detections} detected requests</title>
                    </rect>
                    {index % 3 === 0 && (
                      <text x={x + 12} y="158" textAnchor="middle" fill="#71717a" fontSize="9">
                        {`${55 - index * 5}m`}
                      </text>
                    )}
                    {index === 11 && <text x={x + 12} y="158" textAnchor="middle" fill="#71717a" fontSize="9">now</text>}
                  </g>
                );
              })}
            </svg>
            {securityLogs.length === 0 && !securityLogError && (
              <p className="mt-1 text-center text-[10px] text-zinc-500">
                Waiting for real requests to this server. No generated events are shown.
              </p>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800 bg-black/20">
            <div className="sticky top-0 z-10 border-b border-zinc-800 bg-[#090d13] px-3 py-2">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Latest server events</h3>
            </div>
            {securityLogError ? (
              <p role="alert" className="p-3 text-[10px] text-rose-300">{securityLogError}</p>
            ) : securityLogs.length === 0 ? (
              <p className="p-3 text-[10px] text-zinc-500">No requests captured yet.</p>
            ) : securityLogs.slice(0, 25).map((entry) => (
              <div key={entry.id} className="border-b border-zinc-800/70 px-3 py-2 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[9px] font-semibold uppercase ${
                    entry.severity === 'high' ? 'text-rose-300' :
                      entry.severity === 'medium' ? 'text-amber-300' : 'text-cyan-200'
                  }`}>{entry.category}</span>
                  <span className="shrink-0 font-mono text-[9px] text-zinc-500">{entry.statusCode}</span>
                </div>
                <p className="mt-1 break-all font-mono text-[9px] text-zinc-300">
                  {entry.method} {entry.path}
                </p>
                <p className="mt-1 text-[9px] text-zinc-600">{new Date(entry.occurredAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#070b11]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-rose-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Live attack events</h2>
            </div>
            <label className="flex items-center gap-2 text-[10px] text-zinc-500">
              Type
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
              >
                <option value="all">All types</option>
                {[...new Set(attacks.map((attack) => attack.a_t.toLowerCase()))].sort().map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="max-h-[650px] overflow-y-auto">
            {filteredAttacks.map((attack) => (
              <article key={attack.id} className="border-b border-zinc-800/70">
                <button
                  type="button"
                  onClick={() => setSelectedAttack(attack)}
                  aria-pressed={selectedAttack?.id === attack.id}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-900/70 ${
                    selectedAttack?.id === attack.id ? 'bg-cyan-950/25' : ''
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block break-words text-xs font-medium text-zinc-100">{attack.a_n}</span>
                      <span className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-400">
                        {attack.s_co ? getThreatCountryName(attack.s_co) : 'Source country unavailable'}
                        <span aria-hidden="true">→</span>
                        {attack.d_co ? getThreatCountryName(attack.d_co) : 'Destination unavailable'}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase ${
                      attack.a_t === 'phishing' ? 'border-amber-800/60 text-amber-300' : 'border-rose-900/70 text-rose-300'
                    }`}>{attack.a_t}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-zinc-600">
                    <span>Received {new Date(attack.receivedAt).toLocaleString()}</span>
                    {attack.a_c !== undefined && <span>Provider count {attack.a_c.toLocaleString()}</span>}
                  </span>
                </button>
              </article>
            ))}
            {filteredAttacks.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Activity className="mx-auto h-6 w-6 text-zinc-600" />
                <p className="mt-3 text-xs text-zinc-400">
                  {feedState === 'live' ? 'Waiting for matching live events…' : 'Connecting to the official Check Point event feed…'}
                </p>
                <p className="mt-1 text-[10px] text-zinc-600">No sample or simulated alerts are shown.</p>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-[360px] overflow-hidden rounded-xl border border-zinc-800 bg-[#070b11]">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
            <SearchCheck className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Evidence-based investigation</h2>
          </div>
          {!selectedAttack ? (
            <div className="px-5 py-12 text-center">
              <Fingerprint className="mx-auto h-6 w-6 text-zinc-600" />
              <p className="mt-3 text-xs text-zinc-400">Select a live provider event to investigate.</p>
              <p className="mt-1 text-[10px] text-zinc-600">Country history and NVD records are fetched only for the selected event.</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-zinc-500">Observed provider signature</p>
                <p className="mt-1 break-words text-sm font-semibold text-white">{selectedAttack.a_n}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Check Point category: <span className="capitalize text-rose-200">{selectedAttack.a_t}</span>
                  {' · '}received {new Date(selectedAttack.receivedAt).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Provider-supplied event evidence</h3>
                <dl className="grid grid-cols-[115px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-[10px]">
                  <dt className="text-zinc-500">Source country</dt>
                  <dd className="text-zinc-200">{selectedAttack.s_co ? `${getThreatCountryName(selectedAttack.s_co)} (${selectedAttack.s_co})` : 'Not supplied'}</dd>
                  <dt className="text-zinc-500">Destination</dt>
                  <dd className="text-zinc-200">{selectedAttack.d_co ? `${getThreatCountryName(selectedAttack.d_co)} (${selectedAttack.d_co})` : 'Not supplied'}</dd>
                  <dt className="text-zinc-500">Source coordinates</dt>
                  <dd className="text-zinc-200">
                    {typeof selectedAttack.s_la === 'number' && typeof selectedAttack.s_lo === 'number'
                      ? `${selectedAttack.s_la}, ${selectedAttack.s_lo}` : 'Not supplied'}
                  </dd>
                  <dt className="text-zinc-500">Target location</dt>
                  <dd className="text-zinc-200">
                    {selectedAttack.d_s || (typeof selectedAttack.d_la === 'number' && typeof selectedAttack.d_lo === 'number'
                      ? `${selectedAttack.d_la}, ${selectedAttack.d_lo}` : 'Not supplied')}
                  </dd>
                  <dt className="text-zinc-500">Count / timestamp</dt>
                  <dd className="text-zinc-200">
                    {selectedAttack.a_c?.toLocaleString() ?? 'Count unavailable'}
                    {' · '}{selectedAttack.t || 'Provider timestamp unavailable'}
                  </dd>
                  <dt className="text-zinc-500">Source IP</dt>
                  <dd className="text-amber-200">Not present in Check Point&apos;s public feed</dd>
                </dl>
              </div>

              {investigating && (
                <p className="flex items-center gap-2 text-[11px] text-cyan-200">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Querying Check Point country history{cveId ? ' and NVD vulnerability records' : ''}…
                </p>
              )}
              {investigationError && (
                <p role="alert" className="rounded border border-rose-900/60 bg-rose-950/20 p-2 text-[10px] text-rose-200">
                  {investigationError}
                </p>
              )}

              {investigation && (
                <>
                  <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Country context · Check Point</h3>
                    {[
                      ['Source', selectedAttack.s_co, investigation.sourceCountry],
                      ['Destination', selectedAttack.d_co, investigation.destinationCountry],
                    ].filter(([, code]) => Boolean(code)).map(([label, code, country]) => {
                      const info = country as CountryIntel | undefined;
                      const count = countryEventCount(info);
                      const date = info?.trend?.dates?.[0];
                      const topMalware = Object.entries(info?.malware_types?.attacksByType || {})
                        .map(([name, values]) => ({ name, value: values[0] }))
                        .filter((item) => typeof item.value === 'number')
                        .sort((a, b) => (b.value || 0) - (a.value || 0))
                        .slice(0, 3);
                      return (
                        <div key={label as string} className="border-t border-zinc-800/70 py-2 first:border-0 first:pt-0">
                          <p className="text-[10px] font-semibold text-zinc-200">{label as string}: {getThreatCountryName(code as string)}</p>
                          {info ? (
                            <>
                              <p className="mt-1 text-[10px] text-zinc-400">
                                {count !== undefined ? `${count.toLocaleString()} reported attacks on ${date || 'latest reported day'}` : 'No daily count available'}
                              </p>
                              {topMalware.length > 0 && (
                                <p className="mt-1 text-[9px] text-zinc-500">
                                  Malware trend percentages: {topMalware.map((item) => `${item.name} ${item.value}%`).join(' · ')}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="mt-1 text-[10px] text-zinc-500">Country context unavailable for this request.</p>
                          )}
                        </div>
                      );
                    })}
                    {investigation.errors.filter((error) => error.includes('country intelligence')).map((error) => (
                      <p key={error} className="mt-1 text-[9px] text-amber-300">{error}</p>
                    ))}
                  </div>

                  {cveId ? (
                    <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/15 p-3">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-200">NVD CVE correlation</h3>
                      {investigation.cve ? (() => {
                        const summary = getCveSummary(investigation.cve);
                        return (
                          <>
                            <p className="mt-2 text-xs font-semibold text-white">{cveId}</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-zinc-300">
                              {summary.description || 'NVD did not provide an English description.'}
                            </p>
                            {(summary.score !== undefined || summary.severity) && (
                              <p className="mt-2 text-[10px] text-zinc-400">
                                CVSS {summary.score ?? '—'} {summary.severity ? `· ${summary.severity}` : ''}
                              </p>
                            )}
                            <p className="mt-2 text-[9px] text-amber-200/80">
                              CVE metadata is reference context; it does not independently confirm that this event exploited that vulnerability.
                            </p>
                            <a
                              href={`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cveId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-100"
                            >
                              Verify in NVD <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        );
                      })() : (
                        <p className="mt-2 text-[10px] text-amber-200">
                          {investigation.errors.find((error) => error.includes('NVD')) || 'No NVD record was returned for this CVE.'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 p-3 text-[10px] text-zinc-400">
                      No CVE identifier was included in this provider signature. No vulnerability match has been inferred.
                    </div>
                  )}
                </>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/15 p-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <p className="text-[10px] leading-relaxed text-amber-100/80">
                  This event contains no source IP and the dashboard has no connected enforcement system. No block has
                  been attempted. A country/coordinate is not an IP indicator.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
