import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, FileJson, FileSpreadsheet, FileText, RefreshCw, ShieldAlert } from 'lucide-react';
import { useCheckPointThreatFeed, type ThreatAttack } from '../lib/useCheckPointThreatFeed';

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

interface ReportRow {
  source: 'This app request log' | 'Check Point ThreatCloud';
  occurredAt: string;
  eventType: string;
  severity: string;
  details: string;
  method: string;
  path: string;
  statusCode: string;
  sourceCountry: string;
  destinationCountry: string;
  providerCount: string;
}

type ReportRange = '1h' | '24h' | 'all';
type ReportFormat = 'json' | 'csv' | 'pdf';

const rangeLabels: Record<ReportRange, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  all: 'All available records',
};

const csvColumns: Array<keyof ReportRow> = [
  'source', 'occurredAt', 'eventType', 'severity', 'details', 'method', 'path',
  'statusCode', 'sourceCountry', 'destinationCountry', 'providerCount',
];

const countryName = (code?: string | null) =>
  code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code : 'Not supplied';

const escapeCsv = (value: string) => {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
};

const pdfText = (value: string) =>
  value
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const createPdf = (lines: string[]) => {
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 48) {
    pages.push(lines.slice(index, index + 48));
  }
  if (!pages.length) pages.push(['No records matched this report range.']);

  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index];
    const contentId = pageId + 1;
    const commands = [
      'BT',
      '/F1 8 Tf',
      '40 755 Td',
      ...pageLines.flatMap((line, lineIndex) => [
        `(${pdfText(line.slice(0, 150))}) Tj`,
        ...(lineIndex < pageLines.length - 1 ? ['0 -14 Td'] : []),
      ]),
      'ET',
    ].join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${new TextEncoder().encode(commands).length} >>\nstream\n${commands}\nendstream`;
  });

  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = new TextEncoder().encode(document).length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(document).length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    document += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([document], { type: 'application/pdf' });
};

export const SecurityReports: React.FC = () => {
  const { attacks, feedState } = useCheckPointThreatFeed();
  const [requestLogs, setRequestLogs] = useState<SecurityLogEntry[]>([]);
  const [requestLogError, setRequestLogError] = useState<string | null>(null);
  const [requestLogWarning, setRequestLogWarning] = useState<string | null>(null);
  const [range, setRange] = useState<ReportRange>('24h');
  const [refreshing, setRefreshing] = useState(false);

  const refreshLogs = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/security-logs', { cache: 'no-store' });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : response.statusText;
        throw new Error(`Could not load this app's request log: ${message}`);
      }
      if (!payload || typeof payload !== 'object' || !('items' in payload) || !Array.isArray(payload.items)) {
        throw new Error('The request log returned an invalid response.');
      }
      setRequestLogs(payload.items as SecurityLogEntry[]);
      setRequestLogError(null);
      setRequestLogWarning(
        'storageAvailable' in payload && payload.storageAvailable === false && 'warning' in payload && typeof payload.warning === 'string'
          ? payload.warning
          : null
      );
    } catch (error) {
      setRequestLogError(error instanceof Error ? error.message : 'Could not load this app request log.');
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch('/api/security-logs', { cache: 'no-store' });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : response.statusText;
          throw new Error(`Could not load this app's request log: ${message}`);
        }
        if (!payload || typeof payload !== 'object' || !('items' in payload) || !Array.isArray(payload.items)) {
          throw new Error('The request log returned an invalid response.');
        }
        if (active) {
          setRequestLogs(payload.items as SecurityLogEntry[]);
          setRequestLogError(null);
          setRequestLogWarning(
            'storageAvailable' in payload && payload.storageAvailable === false && 'warning' in payload && typeof payload.warning === 'string'
              ? payload.warning
              : null
          );
        }
      } catch (error) {
        if (active) setRequestLogError(error instanceof Error ? error.message : 'Could not load this app request log.');
      } finally {
        if (active) timer = window.setTimeout(poll, 5000);
      }
    };
    void poll();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  const rows = useMemo(() => {
    const minimumTime = range === 'all'
      ? 0
      : Date.now() - (range === '1h' ? 60 : 24 * 60) * 60 * 1000;
    const localRows: ReportRow[] = requestLogs
      .filter((entry) => Date.parse(entry.occurredAt) >= minimumTime)
      .map((entry) => ({
        source: 'This app request log',
        occurredAt: entry.occurredAt,
        eventType: entry.category,
        severity: entry.severity,
        details: `${entry.kind === 'detection' ? 'Rule detection' : 'Observed request'}; HTTP ${entry.statusCode}`,
        method: entry.method,
        path: entry.path,
        statusCode: String(entry.statusCode),
        sourceCountry: '',
        destinationCountry: '',
        providerCount: '',
      }));
    const providerRows: ReportRow[] = attacks
      .filter((attack) => Date.parse(attack.receivedAt) >= minimumTime)
      .map((attack: ThreatAttack) => ({
        source: 'Check Point ThreatCloud',
        occurredAt: attack.receivedAt,
        eventType: attack.a_t,
        severity: 'provider category; severity not supplied',
        details: attack.a_n,
        method: '',
        path: '',
        statusCode: '',
        sourceCountry: attack.s_co ? `${countryName(attack.s_co)} (${attack.s_co})` : 'Not supplied',
        destinationCountry: attack.d_co ? `${countryName(attack.d_co)} (${attack.d_co})` : 'Not supplied',
        providerCount: attack.a_c === undefined ? 'Not supplied' : String(attack.a_c),
      }));
    return [...localRows, ...providerRows].sort(
      (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    );
  }, [attacks, range, requestLogs]);

  const detections = rows.filter((row) => row.source === 'This app request log' && row.severity !== 'info').length;

  const downloadReport = (format: ReportFormat) => {
    const report = {
      title: 'Web Application & API Security Activity Report',
      generatedAt: new Date().toISOString(),
      period: rangeLabels[range],
      sources: {
        localRequestLog: 'Actual requests handled by this app server; maximum 250 records, in memory, cleared at restart. Client IPs, request bodies, and query strings are not included.',
        checkPointThreatCloud: 'Provider-reported global threat events received by this browser session. These events are not evidence of attacks against this app.',
      },
      detectionNote: 'Local detections are heuristic indicators based on sensitive-path probes, unusual HTTP methods, or repeated client-error responses; they are not proof of compromise.',
      recordCount: rows.length,
      records: rows,
    };
    let blob: Blob;
    let extension: string;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
      extension = 'json';
    } else if (format === 'csv') {
      const heading = csvColumns.map((column) => escapeCsv(column)).join(',');
      const dataRows = rows.map((row) => csvColumns.map((column) => escapeCsv(row[column])).join(','));
      blob = new Blob([[heading, ...dataRows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
      extension = 'csv';
    } else {
      const lines = [
        'WEB APPLICATION & API SECURITY ACTIVITY REPORT',
        `Generated: ${report.generatedAt}`,
        `Period: ${report.period}`,
        `Records: ${report.recordCount} | Local detections: ${detections}`,
        'Sources: app request log and browser-session Check Point ThreatCloud feed.',
        'Global provider events do not confirm attacks against this app.',
        'Detections are heuristics, not proof of compromise. Client IPs are not included.',
        '--------------------------------------------------------------------------',
        ...rows.map((row) => {
          const local = row.source === 'This app request log'
            ? `${row.method} ${row.path} | HTTP ${row.statusCode}`
            : `${row.sourceCountry} -> ${row.destinationCountry} | count: ${row.providerCount}`;
          return `${row.occurredAt} | ${row.source} | ${row.eventType} | ${row.severity} | ${local} | ${row.details}`;
        }),
      ];
      blob = createPdf(lines);
      extension = 'pdf';
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `security-activity-report-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-cyan-900/60 bg-[#070b11] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-300" />
              <h1 className="text-lg font-bold text-white">Security Activity Reports</h1>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Export actual server requests and provider-reported events currently available to this dashboard.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-zinc-400">
            Period
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as ReportRange)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200"
            >
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="all">All available records</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">App request records</p>
            <p className="mt-1 font-mono text-lg font-bold text-cyan-200">
              {rows.filter((row) => row.source === 'This app request log').length}
            </p>
            <p className="text-[9px] text-zinc-600">Latest 250 · Supabase · 90-day retention</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Local rule detections</p>
            <p className="mt-1 font-mono text-lg font-bold text-rose-300">{detections}</p>
            <p className="text-[9px] text-zinc-600">Heuristic indicators, not confirmed incidents</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">ThreatCloud events</p>
            <p className="mt-1 flex items-center gap-2 font-mono text-lg font-bold text-amber-200">
              {rows.filter((row) => row.source === 'Check Point ThreatCloud').length}
              <span className={`h-2 w-2 rounded-full ${feedState === 'live' ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`} />
            </p>
            <p className="text-[9px] text-zinc-600">Provider global events · {feedState}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#070b11] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
              <Download className="h-4 w-4 text-cyan-300" /> Download report
            </h2>
            <p className="mt-1 text-[10px] text-zinc-500">
              {rows.length} actual record{rows.length === 1 ? '' : 's'} · {rangeLabels[range]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadReport('pdf')} className="inline-flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/20 px-3 py-2 text-xs text-rose-200 hover:bg-rose-950/40">
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button type="button" onClick={() => downloadReport('csv')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950/40">
              <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
            </button>
            <button type="button" onClick={() => downloadReport('json')} className="inline-flex items-center gap-2 rounded-lg border border-cyan-900/60 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-950/40">
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
            <button type="button" onClick={() => void refreshLogs()} disabled={refreshing} aria-label="Refresh server request log" className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-cyan-700 disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/15 p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p className="text-[10px] leading-relaxed text-amber-100/80">
            The app request log includes up to 250 recent Supabase records. Check Point events are
            global threat intelligence received in this browser session, not app-specific attack evidence. No records
            are fabricated to fill gaps; missing provider fields remain unavailable.
          </p>
        </div>
        {requestLogError && (
          <p role="alert" className="mt-3 rounded border border-rose-900/60 bg-rose-950/20 p-2 text-[10px] text-rose-200">
            {requestLogError}
          </p>
        )}
        {requestLogWarning && (
          <p role="status" className="mt-3 rounded border border-amber-900/60 bg-amber-950/20 p-2 text-[10px] text-amber-200">
            {requestLogWarning} Request-history records cannot be included in this report.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-[#070b11]">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Report records</h2>
          </div>
          <span className="text-[9px] text-zinc-500">App request logs and global provider events are labeled separately.</span>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Activity className="mx-auto h-6 w-6 text-zinc-600" />
            <p className="mt-3 text-xs text-zinc-400">
              {requestLogError || requestLogWarning ? 'Server request records are currently unavailable.' : 'No real records are available for this period.'}
            </p>
            <p className="mt-1 text-[10px] text-zinc-600">The report will not substitute demo or sample activity.</p>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="sticky top-0 bg-[#090d13] text-[9px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Event / rule</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.source}-${row.occurredAt}-${index}`} className="border-t border-zinc-800/70 align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[9px] text-zinc-500">{new Date(row.occurredAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[9px] text-cyan-200">{row.source}</td>
                    <td className="px-4 py-3 text-[10px] text-zinc-200">{row.eventType}</td>
                    <td className={`px-4 py-3 text-[9px] uppercase ${
                      row.severity === 'high' ? 'text-rose-300' :
                        row.severity === 'medium' ? 'text-amber-300' : 'text-zinc-400'
                    }`}>{row.severity}</td>
                    <td className="max-w-md break-all px-4 py-3 font-mono text-[9px] text-zinc-400">
                      {row.source === 'This app request log'
                        ? `${row.method} ${row.path} · HTTP ${row.statusCode} · ${row.details}`
                        : `${row.sourceCountry} → ${row.destinationCountry} · ${row.details}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
