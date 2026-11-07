import React, { useState } from 'react';
import { AlertTriangle, CircleHelp, ExternalLink, LoaderCircle, Search, ShieldAlert, ShieldCheck } from 'lucide-react';

interface ReputationResult {
  provider: string;
  providerUrl: string;
  checkedAt: string;
  feedCachedAt: string;
  feedEntryCount: number;
  submittedUrl: string;
  verdict: 'malicious' | 'suspicious' | 'no_match';
  riskScore: number | null;
  riskLabel: string;
  riskBasis: string;
  findings: string[];
  sourcesChecked: string[];
  sourcesNotConfigured: string[];
  sourceErrors: string[];
  matchType: 'exact_url' | 'listed_host' | null;
  matchedIndicator: string | null;
  limitations: string;
}

export const UrlReputation: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ReputationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkUrl = async (event: React.FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/url-reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : response.statusText;
        throw new Error(message);
      }
      if (!payload || typeof payload !== 'object' || !('verdict' in payload) ||
        (payload.verdict !== 'malicious' && payload.verdict !== 'suspicious' && payload.verdict !== 'no_match') ||
        !('submittedUrl' in payload) || typeof payload.submittedUrl !== 'string' ||
        !('riskScore' in payload) ||
        (payload.riskScore !== null && (typeof payload.riskScore !== 'number' ||
          !Number.isFinite(payload.riskScore) || payload.riskScore < 0 || payload.riskScore > 100)) ||
        !('riskLabel' in payload) || typeof payload.riskLabel !== 'string' ||
        !('riskBasis' in payload) || typeof payload.riskBasis !== 'string' ||
        !('findings' in payload) || !Array.isArray(payload.findings) ||
        !('sourcesChecked' in payload) || !Array.isArray(payload.sourcesChecked) ||
        !('sourcesNotConfigured' in payload) || !Array.isArray(payload.sourcesNotConfigured) ||
        !('sourceErrors' in payload) || !Array.isArray(payload.sourceErrors)) {
        throw new Error('The reputation provider returned an invalid response.');
      }
      setResult(payload as ReputationResult);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Live URL reputation lookup failed.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-rose-900/50 bg-[#070b11] p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
          <div>
            <h1 className="text-lg font-bold text-white">URL Reputation</h1>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Check an HTTP or HTTPS URL against available phishing and malware feeds. Optional providers are
              checked when configured. This service does not visit the submitted website.
            </p>
          </div>
        </div>

        <form onSubmit={checkUrl} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="url-reputation-input">URL to check</label>
          <input
            id="url-reputation-input"
            type="url"
            required
            maxLength={4096}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            autoComplete="url"
            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-3 font-mono text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-800/70 bg-rose-950/30 px-5 py-3 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-950/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {checking ? 'Checking live feed...' : 'Check URL'}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
          <span>The submitted website is not opened; its URL is sent only to configured providers for lookup.</span>
          <span className="flex flex-wrap gap-3">
            {[
              ['OpenPhish', 'https://openphish.com/'],
              ['URLhaus', 'https://urlhaus.abuse.ch/'],
              ['Phishing.Database', 'https://github.com/mitchellkrogza/Phishing.Database'],
            ].map(([name, sourceUrl]) => (
              <a
                key={name}
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100"
              >
                {name} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </span>
        </div>
      </section>

      {error && (
        <section role="alert" className="flex items-start gap-3 rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-xs text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Live reputation check unavailable</p>
            <p className="mt-1 text-rose-100/80">{error}</p>
            <p className="mt-2 text-[10px] text-rose-100/60">No safe or malicious verdict was inferred because the feed lookup did not complete.</p>
          </div>
        </section>
      )}

      {result && (() => {
        const hasNoMatch = result.verdict === 'no_match';
        const displayRiskScore = result.riskScore;
        const displayLabel = result.riskLabel;
        const barColorClass = result.verdict === 'malicious' ? 'bg-rose-500' : 'bg-amber-500';
        const ringClass = result.verdict === 'malicious'
          ? 'border-rose-500/70 bg-rose-950/50 text-rose-200'
          : 'border-amber-500/60 bg-amber-950/30 text-amber-100';
        const pillClass = result.verdict === 'malicious'
          ? 'border-rose-700/70 bg-rose-950/50'
          : 'border-amber-700/70 bg-amber-950/50';
        const pillTextClass = result.verdict === 'malicious' ? 'text-rose-200' : 'text-amber-100';

        return (
          <section className={`rounded-xl border p-4 sm:p-5 ${
            result.verdict === 'malicious'
              ? 'border-rose-800/60 bg-rose-950/20'
              : 'border-amber-800/50 bg-amber-950/15'
          }`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                role="status"
                aria-label={hasNoMatch
                  ? 'No threat match found; safety is unverified'
                  : `URL risk score ${displayRiskScore} out of 100`}
                className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center self-center rounded-full border-4 ${ringClass}`}
              >
                <span className="font-mono text-3xl font-bold">{displayRiskScore ?? 'N/A'}</span>
                <span className="text-[9px] uppercase tracking-widest">
                  {hasNoMatch ? 'no score' : 'risk / 100'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${pillClass}`}>
                  {isSafeResult
                    ? <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
                    : result.verdict === 'malicious'
                      ? <ShieldAlert className="h-5 w-5 shrink-0 text-rose-300" />
                      : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" />}
                  <p className={`text-base font-bold leading-tight tracking-normal sm:text-lg ${pillTextClass}`}>
                    {displayLabel}
                  </p>
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-zinc-200">{result.submittedUrl}</p>
                {displayRiskScore !== null && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
                    <div
                      className={`h-full rounded-full transition-all ${barColorClass}`}
                      style={{ width: `${Math.min(100, displayRiskScore)}%` }}
                    />
                  </div>
                )}
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-300">{result.riskBasis}</p>
                {result.findings.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {result.findings.map((finding) => (
                      <li key={finding} className="flex gap-2 text-[10px] text-zinc-200">
                        <span className="text-rose-300" aria-hidden="true">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                )}
                {result.matchType && (
                  <p className="mt-3 text-xs text-rose-200">
                    Match: {result.matchType === 'exact_url' ? 'exact URL' : 'another URL on this host'}
                  </p>
                )}
                {result.matchedIndicator && (
                  <p className="mt-1 break-all font-mono text-[10px] text-zinc-400">
                    Feed indicator: {result.matchedIndicator}
                  </p>
                )}
                <p className="mt-3 max-w-3xl text-[10px] leading-relaxed text-zinc-400">{result.limitations}</p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-3">
              <div>
                <dt className="text-[9px] uppercase tracking-widest text-zinc-500">Threat feeds checked</dt>
                <dd className="mt-1 text-[10px] text-zinc-200">{result.sourcesChecked.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-widest text-zinc-500">Feed fetched by this service</dt>
                <dd className="mt-1 text-[10px] text-zinc-200">{new Date(result.feedCachedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-widest text-zinc-500">Indicators checked</dt>
                <dd className="mt-1 text-[10px] text-zinc-200">{result.feedEntryCount.toLocaleString()}</dd>
              </div>
            </dl>
            {result.sourceErrors.length > 0 && (
              <div className="mt-3 rounded border border-amber-800/50 bg-amber-950/20 p-2">
                <p className="text-[9px] font-semibold text-amber-200">Some threat sources could not be checked:</p>
                {result.sourceErrors.map((sourceError) => (
                  <p key={sourceError} className="mt-1 text-[9px] text-amber-100/70">{sourceError}</p>
                ))}
              </div>
            )}
            {result.sourcesNotConfigured.length > 0 && (
              <p className="mt-3 text-[10px] text-zinc-400">
                Coverage is limited to the threat feeds listed above. Optional provider checks are not configured.
              </p>
            )}
            <p className="mt-3 text-[9px] text-zinc-600">
              Lookup completed {new Date(result.checkedAt).toLocaleString()}.
            </p>
          </section>
        );
      })()}

      {!result && !error && (
        <section className="rounded-xl border border-zinc-800 bg-[#070b11] p-4">
          <p className="text-xs font-semibold text-zinc-200">How to interpret the result</p>
          <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-zinc-500">
            <li>Malicious means the URL or hostname matched a phishing or malware threat feed.</li>
            <li>Suspicious means an explainable signal (such as temporary tunnel hosting or phishing-like hostname words) was found, not that malicious activity is confirmed.</li>
            <li>No match means no known indicator was found in the checked sources; the URL is not verified safe.</li>
            <li>Risk scores are only shown when suspicious indicators or threat matches are found; they are not probabilities.</li>
          </ul>
        </section>
      )}
    </div>
  );
};
