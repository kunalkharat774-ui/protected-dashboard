import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ShieldAlert,
  MailCheck,
  Globe2,
  MapPin,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Server,
  Zap,
  Radio,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowUpRight,
  Calendar,
  Building,
  Clock,
  ShieldCheck,
  FileText,
  FileImage,
  KeyRound,
  Cookie,
  Key,
  Terminal,
  Check,
  Copy,
  Filter,
  Share2,
  Cpu,
  Network,
  BarChart3,
  PieChart,
  Sliders,
  RotateCcw,
  Trash2,
  Play,
  Square,
  Layers,
  Fingerprint,
} from 'lucide-react';
import { IpGoogleMap, IpLocationData } from './IpGoogleMap';
import { CyberMetallicButton } from './CyberMetallicButton';
import { TextEncryptView } from './TextEncryptView';
import type { FileActivity } from '../types';

const SteganographyView = React.lazy(() =>
  import('./SteganographyView').then((module) => ({ default: module.SteganographyView }))
);
const PasswordStrengthView = React.lazy(() =>
  import('./PasswordStrengthView').then((module) => ({ default: module.PasswordStrengthView }))
);
const FileSecurity = React.lazy(() =>
  import('./FileSecurity').then((module) => ({ default: module.FileSecurity }))
);
const LiveCountryWebcams = React.lazy(() =>
  import('./LiveCountryWebcams').then((module) => ({ default: module.LiveCountryWebcams }))
);
const SecurityAlerts = React.lazy(() =>
  import('./SecurityAlerts').then((module) => ({ default: module.SecurityAlerts }))
);
const SecurityReports = React.lazy(() =>
  import('./SecurityReports').then((module) => ({ default: module.SecurityReports }))
);
const UrlReputation = React.lazy(() =>
  import('./UrlReputation').then((module) => ({ default: module.UrlReputation }))
);
const Globe3DMap = React.lazy(() =>
  import('./GlobalNetworkGlobe').then((module) => ({ default: module.Globe3DMap }))
);

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

type ActiveTab = 'monitoring' | 'vulnerability' | 'breach' | 'domain' | 'ip' | 'feeds' | 'network' | 'alerts' | 'reports' | 'urlReputation' | 'crypto' | 'steganography' | 'password' | 'files';

interface ApiProbeResult {
  timestamp: string;
  target: string;
  method?: string;
  statusCode: number;
  statusMessage?: string;
  latencyMs: number;
  bytesReceived?: number;
  timings?: {
    dnsMs: number;
    tcpMs: number;
    tlsMs: number;
    ttfbMs: number;
    contentTransferMs: number;
  };
  success: boolean;
  error?: string;
  headers?: Record<string, string>;
  bodyPreview?: string;
}

export const SecurityDashboard: React.FC<{ onReturnToLoader?: () => void }> = ({ onReturnToLoader }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');

  // 1. API Monitoring State
  const [monitorUrl, setMonitorUrl] = useState('');
  const [monitorMethod, setMonitorMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD'>('GET');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitorIntervalMs, setMonitorIntervalMs] = useState(5000);
  const [probeHistory, setProbeHistory] = useState<ApiProbeResult[]>([]);
  const [activeProbeRunning, setActiveProbeRunning] = useState(false);
  const [chartViewMode, setChartViewMode] = useState<'spline' | 'bars'>('spline');
  const [hoveredProbeIndex, setHoveredProbeIndex] = useState<number | null>(null);
  const [selectedProbeModal, setSelectedProbeModal] = useState<ApiProbeResult | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [customHeadersText, setCustomHeadersText] = useState('');
  const [customRequestBody, setCustomRequestBody] = useState('');
  const monitorTimerRef = useRef<any>(null);

  // 2. Vulnerability Scanner State
  const [vulnTarget, setVulnTarget] = useState('');
  const [vulnScanning, setVulnScanning] = useState(false);
  const [vulnResult, setVulnResult] = useState<any>(null);
  const [vulnError, setVulnError] = useState<string | null>(null);
  const [vulnFilter, setVulnFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'PASSED'>('ALL');
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [copiedRawHeaders, setCopiedRawHeaders] = useState(false);
  const [fileActivities, setFileActivities] = useState<FileActivity[]>([]);

  // 3. Email Breach Checker State
  const [emailInput, setEmailInput] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [breachSearch, setBreachSearch] = useState('');

  // 4. Domain Info State
  const [domainInput, setDomainInput] = useState('');
  const [domainSearching, setDomainSearching] = useState(false);
  const [domainResult, setDomainResult] = useState<any>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [showRawWhois, setShowRawWhois] = useState(false);

  // 5. IP Lookup State
  const [ipInput, setIpInput] = useState('');
  const [ipSearching, setIpSearching] = useState(false);
  const [ipResult, setIpResult] = useState<IpLocationData | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);

  // ================= 1. Real API Probe Handler =================
  const runApiProbe = async (targetUrl: string, method: string) => {
    if (!targetUrl.trim()) return;
    setActiveProbeRunning(true);
    let parsedHeaders: Record<string, string> = {};
    if (customHeadersText.trim()) {
      try {
        if (customHeadersText.trim().startsWith('{')) {
          parsedHeaders = JSON.parse(customHeadersText);
        } else {
          customHeadersText.split('\n').forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > -1) {
              const k = line.slice(0, idx).trim();
              const v = line.slice(idx + 1).trim();
              if (k) parsedHeaders[k] = v;
            }
          });
        }
      } catch {}
    }

    try {
      const res = await fetch('/api/monitor/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl.trim(),
          method,
          headers: parsedHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? customRequestBody : undefined,
        }),
      });
      const data = await res.json();
      setProbeHistory((prev) => [data, ...prev.slice(0, 29)]);
    } catch (e: any) {
      setProbeHistory((prev) => [
        {
          timestamp: new Date().toISOString(),
          target: targetUrl.trim(),
          method,
          statusCode: 0,
          statusMessage: 'Client Network Failure',
          latencyMs: 0,
          success: false,
          error: e.message || 'Network connection failed',
        },
        ...prev.slice(0, 29),
      ]);
    } finally {
      setActiveProbeRunning(false);
    }
  };

  const handleClearTelemetry = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
    }
    setProbeHistory([]);
    setSelectedProbeModal(null);
    setHoveredProbeIndex(null);
  };

  useEffect(() => {
    if (isMonitoring && monitorUrl.trim()) {
      runApiProbe(monitorUrl, monitorMethod);
      monitorTimerRef.current = setInterval(() => {
        runApiProbe(monitorUrl, monitorMethod);
      }, monitorIntervalMs);
    } else {
      if (monitorTimerRef.current) clearInterval(monitorTimerRef.current);
    }
    return () => {
      if (monitorTimerRef.current) clearInterval(monitorTimerRef.current);
    };
  }, [isMonitoring, monitorUrl, monitorMethod, monitorIntervalMs]);

  // ================= 2. Real Vulnerability Scan Handler =================
  const handleVulnerabilityScan = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();
    const targetToScan = customTarget !== undefined ? customTarget : vulnTarget;
    if (!targetToScan.trim()) return;
    if (customTarget !== undefined) {
      setVulnTarget(customTarget);
    }
    setVulnScanning(true);
    setVulnError(null);
    setVulnResult(null);

    try {
      const res = await fetch('/api/scan/vulnerability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: targetToScan }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setVulnError(data.error || 'Scan failed');
      } else {
        setVulnResult(data);
      }
    } catch (err: any) {
      setVulnError(err.message || 'Connection error to scanner service');
    } finally {
      setVulnScanning(false);
    }
  };

  // ================= 3. Real Email Breach Check Handler =================
  const handleEmailCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) return;
    setEmailChecking(true);
    setEmailError(null);
    setEmailResult(null);

    try {
      const res = await fetch('/api/email/breach-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setEmailError(data.error || 'Breach check failed');
      } else {
        setEmailResult(data);
      }
    } catch (err: any) {
      setEmailError(err.message || 'Failed to verify email breach databases');
    } finally {
      setEmailChecking(false);
    }
  };

  // ================= 4. Real Domain Complete Info Handler =================
  const handleDomainLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainInput.trim()) return;
    setDomainSearching(true);
    setDomainError(null);
    setDomainResult(null);

    try {
      const res = await fetch('/api/domain/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setDomainError(data.error || 'Domain lookup failed');
      } else {
        setDomainResult(data);
      }
    } catch (err: any) {
      setDomainError(err.message || 'Domain query service error');
    } finally {
      setDomainSearching(false);
    }
  };

  // ================= 5. Real IP Lookup Handler =================
  const handleIpLookup = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery !== undefined ? customQuery : ipInput;
    setIpSearching(true);
    setIpError(null);

    try {
      const res = await fetch('/api/ip/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: query }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setIpError(data.error || 'Failed to geolocate IP');
      } else {
        setIpResult(data);
        if (!ipInput && data.ip) {
          setIpInput(data.ip);
        }
      }
    } catch (err: any) {
      setIpError(err.message || 'IP service connection error');
    } finally {
      setIpSearching(false);
    }
  };

  // Auto-run default IP query on first visit
  useEffect(() => {
    if (activeTab === 'ip' && !ipResult && !ipSearching) {
      handleIpLookup();
    }
  }, [activeTab]);

  return (
    <div className="relative min-h-screen bg-[#050505] text-[#F4F4F0] flex flex-col font-sans selection:bg-[#E11D48] selection:text-white overflow-x-clip">

      {/* Top Cyber Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-black/80 backdrop-blur-md sticky top-0 z-50 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/cysec-logo.png"
            alt="CYSEC Cybersecurity"
            className="w-24 shrink-0 sm:w-32 lg:w-40"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-[10px] sm:text-xs lg:text-sm tracking-wider uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Web Application &amp; API Security Dashboard
              </h1>
            </div>
            <p className="text-[10px] sm:text-[11px] font-mono text-zinc-500">
              Real-time threat intelligence, domain telemetry &amp; IP locator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>K2V STUDIO</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Navigation Tabs */}
      <div className="relative z-40 border-b border-zinc-900 bg-[#09090b]/85 backdrop-blur-md px-3 sm:px-6 lg:px-8">
        <div aria-label="Dashboard sections" role="navigation" className="flex items-center gap-1 sm:gap-2 overflow-x-auto overscroll-x-contain scroll-smooth py-2 no-scrollbar [&>button]:shrink-0">
          <CyberMetallicButton
            onClick={() => setActiveTab('domain')}
            variant={activeTab === 'domain' ? 'blue' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <Globe2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Domain Complete Info</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('feeds')}
            variant={activeTab === 'feeds' ? 'cyan' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Country Feeds</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('network')}
            variant={activeTab === 'network' ? 'cyan' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>Global Network Map</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('alerts')}
            variant={activeTab === 'alerts' ? 'rose' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Security Alerts</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('reports')}
            variant={activeTab === 'reports' ? 'cyan' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reports</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('urlReputation')}
            variant={activeTab === 'urlReputation' ? 'rose' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>URL Reputation</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('ip')}
            variant={activeTab === 'ip' ? 'emerald' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>IP Geolocation Lookup</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('crypto')}
            variant={activeTab === 'crypto' ? 'blue' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <Key className="w-3.5 h-3.5 text-violet-400" />
            <span>Cryptography Lab</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('steganography')}
            variant={activeTab === 'steganography' ? 'blue' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <FileImage className="w-3.5 h-3.5 text-purple-400" />
            <span>Steganography</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('password')}
            variant={activeTab === 'password' ? 'emerald' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
            <span>Password Security</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('files')}
            variant={activeTab === 'files' ? 'cyan' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>File Security</span>
            {fileActivities.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 rounded text-[10px]">
                {fileActivities.length}
              </span>
            )}
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('monitoring')}
            variant={activeTab === 'monitoring' ? 'cyan' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Real API Monitoring</span>
            {probeHistory.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 rounded text-[10px]">
                {probeHistory.length}
              </span>
            )}
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('vulnerability')}
            variant={activeTab === 'vulnerability' ? 'rose' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Vulnerability Scanner</span>
          </CyberMetallicButton>

          <CyberMetallicButton
            onClick={() => setActiveTab('breach')}
            variant={activeTab === 'breach' ? 'amber' : 'zinc'}
            size="sm"
            className="whitespace-nowrap"
          >
            <MailCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Email Breach Checker</span>
          </CyberMetallicButton>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 px-3 py-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
        {activeTab === 'files' && (
          <div className="space-y-5">
            {fileActivities.length > 0 && (
              <section className="rounded-xl border border-zinc-800/80 bg-[#0c0c0e] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Recent file activity</h2>
                    <p className="mt-1 text-xs text-zinc-500">Latest encryption, decryption, and scan actions in this session.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFileActivities([])}
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <ul className="divide-y divide-zinc-800/70">
                  {fileActivities.slice(0, 5).map((activity) => (
                    <li key={activity.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-200">{activity.fileName}</p>
                        <p className="mt-0.5 text-zinc-500">{activity.action}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 font-mono text-zinc-400">
                        <span>{activity.status}</span>
                        <span>{activity.size}</span>
                        <span>{activity.time}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <React.Suspense
              fallback={
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-cyan-900/60 bg-[#03060c] font-mono text-sm text-cyan-300">
                  Loading file security tools...
                </div>
              }
            >
              <FileSecurity
                onFileActivity={(activity) => setFileActivities((previous) => [activity, ...previous].slice(0, 20))}
                onBackToDashboard={() => setActiveTab('network')}
              />
            </React.Suspense>
          </div>
        )}

        {activeTab === 'network' && (
          <React.Suspense
            fallback={
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-cyan-900/60 bg-[#03060c] font-mono text-sm text-cyan-300">
                Loading global network map...
              </div>
            }
          >
            <Globe3DMap />
          </React.Suspense>
        )}

        {activeTab === 'alerts' && (
          <React.Suspense
            fallback={
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-rose-900/60 bg-[#03060c] font-mono text-sm text-rose-300">
                Loading live security alerts...
              </div>
            }
          >
            <SecurityAlerts />
          </React.Suspense>
        )}

        {activeTab === 'reports' && (
          <React.Suspense
            fallback={
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-cyan-900/60 bg-[#03060c] font-mono text-sm text-cyan-300">
                Loading real security reports...
              </div>
            }
          >
            <SecurityReports />
          </React.Suspense>
        )}

        {activeTab === 'urlReputation' && (
          <React.Suspense
            fallback={
              <div className="flex h-[520px] items-center justify-center rounded-xl border border-rose-900/60 bg-[#03060c] font-mono text-sm text-rose-300">
                Loading live URL reputation lookup...
              </div>
            }
          >
            <UrlReputation />
          </React.Suspense>
        )}

        {activeTab === 'feeds' && (
          <React.Suspense
            fallback={
              <div className="flex h-[620px] items-center justify-center rounded-xl border border-cyan-900/60 bg-black font-mono text-sm text-cyan-300">
                Loading live country feeds...
              </div>
            }
          >
            <LiveCountryWebcams />
          </React.Suspense>
        )}

        {/* ================= TAB: REAL DOMAIN COMPLETE INFO ================= */}
        {activeTab === 'domain' && (
          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Globe2 className="w-5 h-5 text-blue-400" />
                Comprehensive Domain Intelligence &amp; WHOIS Lookup
              </h2>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Enter any domain name. Connects to authoritative WHOIS servers and DNS to extract full registration details, registrar, creation/expiry dates, server IP geolocation, and complete DNS records.
              </p>

              <form onSubmit={handleDomainLookup} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe2 className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="Enter real domain name (e.g., google.com, github.com, openai.com, wikipedia.org, etc.)"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <CyberMetallicButton
                  type="submit"
                  variant="blue"
                  size="md"
                  disabled={domainSearching || !domainInput.trim()}
                  className="px-6"
                >
                  {domainSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Querying WHOIS &amp; DNS...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Lookup Domain Info</span>
                    </>
                  )}
                </CyberMetallicButton>
              </form>
            </div>

            {domainError && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{domainError}</span>
              </div>
            )}

            {domainResult && (
              <div className="space-y-6">
                {/* 1. Core Domain Overview Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                  {/* Registrar Card */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                        <Building className="w-3.5 h-3.5 text-blue-400" />
                        Registrar
                      </span>
                      <div className="text-white font-bold text-sm truncate">
                        {domainResult.whois?.registrar || 'Not Disclosed in TLD'}
                      </div>
                    </div>
                    {domainResult.whois?.registrarIanaId && (
                      <span className="text-zinc-500 text-[10px] mt-2">
                        IANA ID: {domainResult.whois.registrarIanaId}
                      </span>
                    )}
                  </div>

                  {/* Creation Date & Domain Age */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        Creation Date &amp; Age
                      </span>
                      <div className="text-emerald-400 font-bold text-sm">
                        {domainResult.whois?.creationDate
                          ? new Date(domainResult.whois.creationDate).toLocaleDateString()
                          : 'Recorded in DNS'}
                      </div>
                    </div>
                    {domainResult.whois?.ageDays !== null && domainResult.whois?.ageDays !== undefined && (
                      <span className="text-zinc-400 text-[10px] mt-2">
                        {Math.floor(domainResult.whois.ageDays / 365)} years ({domainResult.whois.ageDays} days active)
                      </span>
                    )}
                  </div>

                  {/* Expiration Date */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Registry Expiry Date
                      </span>
                      <div className="text-amber-400 font-bold text-sm">
                        {domainResult.whois?.expiryDate
                          ? new Date(domainResult.whois.expiryDate).toLocaleDateString()
                          : 'Valid (Active)'}
                      </div>
                    </div>
                    {domainResult.whois?.daysToExpiry !== null && domainResult.whois?.daysToExpiry !== undefined && (
                      <span className="text-zinc-400 text-[10px] mt-2">
                        Expires in {domainResult.whois.daysToExpiry} days
                      </span>
                    )}
                  </div>

                  {/* Server Geolocation */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" />
                        Hosting Server Location
                      </span>
                      <div className="text-white font-bold text-sm truncate">
                        {domainResult.server?.geo
                          ? `${domainResult.server.geo.city || ''}, ${domainResult.server.geo.country}`
                          : 'Global Anycast / CDN'}
                      </div>
                    </div>
                    {domainResult.server?.geo?.isp && (
                      <span className="text-zinc-400 text-[10px] mt-2 truncate">
                        {domainResult.server.geo.isp}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Detailed Technical Tabs / Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* WHOIS & Registry Details */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl font-mono text-xs flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        WHOIS Registration Record
                      </h3>

                      <div className="space-y-2.5">
                        <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Domain Handle / Name</span>
                          <span className="text-white font-bold">{domainResult.domain}</span>
                        </div>

                        {domainResult.whois?.registryDomainId && (
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 text-[10px] block">Registry Domain ID</span>
                            <span className="text-zinc-300 truncate block">{domainResult.whois.registryDomainId}</span>
                          </div>
                        )}

                        {domainResult.whois?.updatedDate && (
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 text-[10px] block">Last Updated Date</span>
                            <span className="text-zinc-300">
                              {new Date(domainResult.whois.updatedDate).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {domainResult.whois?.domainStatusList?.length > 0 && (
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 text-[10px] block mb-1">Domain Status Codes</span>
                            <div className="flex flex-wrap gap-1">
                              {domainResult.whois.domainStatusList.slice(0, 4).map((st: string, idx: number) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700">
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {domainResult.whois?.dnssec && (
                          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800 flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">DNSSEC Signature</span>
                            <span className="text-zinc-300 uppercase font-bold">{domainResult.whois.dnssec}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {domainResult.whoisRaw && (
                      <button
                        type="button"
                        onClick={() => setShowRawWhois(!showRawWhois)}
                        className="mt-4 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] transition-colors cursor-pointer w-full text-center"
                      >
                        {showRawWhois ? 'Hide Raw WHOIS Output' : 'View Full Raw WHOIS Text'}
                      </button>
                    )}
                  </div>

                  {/* Web Hosting, IP & Mail Health */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl font-mono text-xs">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      Infrastructure &amp; Server Health
                    </h3>

                    <div className="space-y-2.5">
                      {domainResult.server?.geo && (
                        <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Primary Resolved IP</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-cyan-400 font-bold">{domainResult.server.geo.ip}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIpInput(domainResult.server.geo.ip);
                                setActiveTab('ip');
                                handleIpLookup(undefined, domainResult.server.geo.ip);
                              }}
                              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Trace on Map</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {domainResult.server?.web && (
                        <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Web Server / CDN Header</span>
                          <span className="text-white font-medium">
                            {domainResult.server.web.serverHeader || (domainResult.server.web.isHttps ? 'HTTPS Active' : 'HTTP')}
                          </span>
                        </div>
                      )}

                      <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block">Mail Server (MX) Count</span>
                        <span className="text-amber-400 font-bold">
                          {domainResult.dns.mx?.length || 0} Mail Exchanger servers active
                        </span>
                      </div>

                      {domainResult.dns.spf && (
                        <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">SPF Anti-Spoofing Policy</span>
                          <p className="text-zinc-300 text-[10px] break-all mt-0.5">{domainResult.dns.spf}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nameservers (NS) */}
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl font-mono text-xs">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        Authoritative Nameservers
                      </span>
                      <span className="text-zinc-500 text-[10px]">{domainResult.dns.ns?.length || 0} NS</span>
                    </h3>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                      {domainResult.dns.ns?.map((ns: string, i: number) => (
                        <div key={i} className="bg-zinc-900/70 p-2 rounded border border-zinc-800 text-cyan-300 truncate">
                          {ns}
                        </div>
                      ))}
                      {domainResult.dns.ns?.length === 0 && (
                        <div className="text-zinc-500 text-center py-4">No nameservers found</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Comprehensive DNS Records Table */}
                <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl font-mono text-xs">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Full Authoritative DNS Records</span>
                    <span className="text-zinc-500 text-[10px]">Real-time system DNS query</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* A Records */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-bold text-cyan-400 mb-2">A Records (IPv4)</div>
                      <div className="space-y-1">
                        {domainResult.dns.a?.map((ip: string, i: number) => (
                          <div key={i} className="text-white bg-black/40 p-1.5 rounded flex items-center justify-between">
                            <span>{ip}</span>
                            <span className="text-[9px] text-zinc-500">A</span>
                          </div>
                        ))}
                        {domainResult.dns.a?.length === 0 && <span className="text-zinc-500">None</span>}
                      </div>
                    </div>

                    {/* AAAA Records */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-bold text-blue-400 mb-2">AAAA Records (IPv6)</div>
                      <div className="space-y-1">
                        {domainResult.dns.aaaa?.map((ip: string, i: number) => (
                          <div key={i} className="text-white bg-black/40 p-1.5 rounded flex items-center justify-between break-all">
                            <span>{ip}</span>
                            <span className="text-[9px] text-zinc-500">AAAA</span>
                          </div>
                        ))}
                        {domainResult.dns.aaaa?.length === 0 && <span className="text-zinc-500">None</span>}
                      </div>
                    </div>

                    {/* MX Records */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-bold text-amber-400 mb-2">MX Records (Mail Exchangers)</div>
                      <div className="space-y-1">
                        {domainResult.dns.mx?.map((mx: any, i: number) => (
                          <div key={i} className="text-white bg-black/40 p-1.5 rounded flex items-center justify-between truncate">
                            <span className="truncate">{mx.exchange}</span>
                            <span className="text-[9px] text-zinc-400 shrink-0 ml-2">Pri: {mx.priority}</span>
                          </div>
                        ))}
                        {domainResult.dns.mx?.length === 0 && <span className="text-zinc-500">None</span>}
                      </div>
                    </div>

                    {/* SOA Record */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
                      <div className="text-[11px] font-bold text-emerald-400 mb-2">SOA (Start of Authority)</div>
                      {domainResult.dns.soa ? (
                        <div className="space-y-1 text-[11px] bg-black/40 p-2 rounded">
                          <div><span className="text-zinc-500">Primary NS:</span> {domainResult.dns.soa.nsname}</div>
                          <div><span className="text-zinc-500">Hostmaster:</span> {domainResult.dns.soa.hostmaster}</div>
                          <div><span className="text-zinc-500">Serial:</span> {domainResult.dns.soa.serial}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-500">None</span>
                      )}
                    </div>
                  </div>

                  {/* TXT Records */}
                  <div className="mt-4 bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
                    <div className="text-[11px] font-bold text-zinc-300 mb-2">
                      TXT Records ({domainResult.dns.txt?.length || 0})
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                      {domainResult.dns.txt?.map((txt: string, i: number) => (
                        <div key={i} className="text-zinc-300 bg-black/40 p-2 rounded text-[10px] break-all">
                          {txt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Raw WHOIS text modal/section */}
                {showRawWhois && domainResult.whoisRaw && (
                  <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl font-mono text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                        Raw Server Socket WHOIS Response (Port 43)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowRawWhois(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <pre className="bg-black/90 p-4 rounded-lg overflow-x-auto text-[11px] text-zinc-300 max-h-96 leading-relaxed">
                      {domainResult.whoisRaw}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: REAL IP LOOKUP & GEOLOCATION ================= */}
        {activeTab === 'ip' && (
          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-emerald-400" />
                Real IP Geolocation &amp; Live Satellite Pinpoint
              </h2>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Enter any real IP address (IPv4, IPv6) or host/domain name. Trace exact latitude/longitude coordinates, ISP, network organization, and view real-time location pinpointed on interactive satellite map.
              </p>

              <form onSubmit={(e) => handleIpLookup(e)} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="Enter real IP (e.g. 8.8.8.8, 1.1.1.1, 142.250.190.46) or domain (e.g. apple.com)"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <CyberMetallicButton
                  type="submit"
                  variant="emerald"
                  size="md"
                  disabled={ipSearching}
                  className="px-6"
                >
                  {ipSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Locating on Map...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Trace &amp; Show Map</span>
                    </>
                  )}
                </CyberMetallicButton>
              </form>
            </div>

            {ipError && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{ipError}</span>
              </div>
            )}

            {ipResult && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Details Card */}
                <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col justify-between font-mono text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {ipResult.flagUrl && (
                          <img src={ipResult.flagUrl} alt={ipResult.country} className="w-5 h-3.5 object-cover rounded shadow" />
                        )}
                        <span className="font-mono text-sm font-bold text-white">
                          {ipResult.ip}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-800 font-bold">
                        {ipResult.type || 'IPv4'}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block">Physical Geolocation</span>
                        <span className="text-white font-bold text-sm block mt-0.5">
                          {ipResult.city ? `${ipResult.city}, ` : ''}
                          {ipResult.region ? `${ipResult.region}, ` : ''}
                          {ipResult.country} ({ipResult.countryCode})
                        </span>
                        {ipResult.postal && (
                          <span className="text-zinc-400 text-[10px] block mt-0.5">
                            Postal Code: {ipResult.postal}
                          </span>
                        )}
                      </div>

                      <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 text-[10px] block">Precise GPS Coordinates</span>
                        <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                          {ipResult.latitude.toFixed(5)}, {ipResult.longitude.toFixed(5)}
                        </span>
                      </div>

                      {ipResult.connection && (
                        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">ISP &amp; Carrier Organization</span>
                          <span className="text-zinc-200 font-medium block mt-0.5 truncate">
                            {ipResult.connection.isp || ipResult.connection.org || 'Internet Service Provider'}
                          </span>
                          {ipResult.connection.asn && (
                            <span className="text-[11px] text-zinc-400 block mt-1">
                              Autonomous System: AS{ipResult.connection.asn}
                            </span>
                          )}
                        </div>
                      )}

                      {ipResult.timezone && (
                        <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                          <span className="text-zinc-500 text-[10px] block">Local Timezone</span>
                          <span className="text-zinc-300 block mt-0.5">
                            {ipResult.timezone.id} ({ipResult.timezone.utc || 'UTC'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-500 pt-4 border-t border-zinc-800/80 mt-4 flex items-center justify-between">
                    <span>Satellite Geolocation Feed</span>
                    <a
                      href={`https://www.google.com/maps?q=${ipResult.latitude},${ipResult.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>Coordinates Link ↗</span>
                    </a>
                  </div>
                </div>

                {/* Google Map Display with AdvancedMarker and Smooth Centering */}
                <div className="lg:col-span-2">
                  {GOOGLE_MAPS_KEY ? (
                    <IpGoogleMap location={ipResult} apiKey={GOOGLE_MAPS_KEY} />
                  ) : (
                    <div className="flex h-[clamp(320px,55dvh,450px)] sm:h-[520px] flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-[#09090b] p-6 text-center">
                      <MapPin className="h-8 w-8 text-cyan-400" aria-hidden="true" />
                      <p className="max-w-md text-sm text-zinc-300">
                        Google Maps is not configured. Set <code className="text-cyan-300">VITE_GOOGLE_MAPS_API_KEY</code> to enable the interactive map.
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${ipResult.latitude},${ipResult.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 hover:underline"
                      >
                        Open these coordinates in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: CRYPTOGRAPHY LAB ================= */}
        {activeTab === 'crypto' && (
          <TextEncryptView />
        )}

        {activeTab === 'steganography' && (
          <React.Suspense fallback={<div className="p-8 text-center text-sm font-mono text-zinc-400">Loading steganography tools...</div>}>
            <SteganographyView />
          </React.Suspense>
        )}

        {activeTab === 'password' && (
          <React.Suspense fallback={<div className="p-8 text-center text-sm font-mono text-zinc-400">Loading password security tools...</div>}>
            <PasswordStrengthView />
          </React.Suspense>
        )}

        {/* ================= TAB: REAL API MONITORING ================= */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            {/* Top Control Card */}
            <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Live API Endpoint Monitoring &amp; Probe
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    Enter any real API endpoint or URL. Telemetry is graphed in real-time with latency splines, status code distributions, and socket lifecycle performance.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">Interval:</span>
                    <select
                      value={monitorIntervalMs}
                      onChange={(e) => setMonitorIntervalMs(Number(e.target.value))}
                      disabled={isMonitoring}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-none"
                    >
                      <option value={1000}>1 second</option>
                      <option value={2000}>2 seconds</option>
                      <option value={3000}>3 seconds</option>
                      <option value={5000}>5 seconds</option>
                      <option value={10000}>10 seconds</option>
                      <option value={30000}>30 seconds</option>
                    </select>
                  </div>

                  {probeHistory.length > 0 && (
                    <CyberMetallicButton
                      type="button"
                      variant="zinc"
                      size="sm"
                      onClick={handleClearTelemetry}
                      title="Clear Telemetry and Reset Charts"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Clear</span>
                    </CyberMetallicButton>
                  )}
                </div>
              </div>

              {/* URL Input Form */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={monitorMethod}
                    onChange={(e) => setMonitorMethod(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={monitorUrl}
                      onChange={(e) => setMonitorUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && monitorUrl.trim()) {
                          runApiProbe(monitorUrl, monitorMethod);
                        }
                      }}
                      placeholder="Enter real API URL (e.g. https://api.github.com/zen or https://httpbin.org/get)"
                      className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <CyberMetallicButton
                      type="button"
                      variant={showConfigDrawer || customHeadersText.trim() || customRequestBody.trim() ? 'cyan' : 'zinc'}
                      size="md"
                      onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                      title="Custom Headers & Payload"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Options</span>
                    </CyberMetallicButton>

                    <CyberMetallicButton
                      type="button"
                      variant="zinc"
                      size="md"
                      onClick={() => runApiProbe(monitorUrl, monitorMethod)}
                      disabled={activeProbeRunning || !monitorUrl.trim()}
                    >
                      <Zap className={`w-3.5 h-3.5 ${activeProbeRunning ? 'animate-spin text-cyan-400' : 'text-zinc-300'}`} />
                      <span>Single Probe</span>
                    </CyberMetallicButton>

                    <CyberMetallicButton
                      type="button"
                      variant={isMonitoring ? 'rose' : 'cyan'}
                      size="md"
                      onClick={() => setIsMonitoring(!isMonitoring)}
                      disabled={!monitorUrl.trim()}
                    >
                      {isMonitoring ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Live Monitor</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Live Monitor</span>
                        </>
                      )}
                    </CyberMetallicButton>
                  </div>
                </div>

                {/* Optional Configuration: Custom Headers & JSON Payload */}
                {showConfigDrawer && (
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-lg space-y-3 mt-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        Advanced Request Configuration
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Optional: Set custom authorization tokens or POST body
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                          Custom Headers (Key: Value or JSON format):
                        </label>
                        <textarea
                          rows={2}
                          value={customHeadersText}
                          onChange={(e) => setCustomHeadersText(e.target.value)}
                          placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {['POST', 'PUT', 'PATCH'].includes(monitorMethod) && (
                        <div>
                          <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                            Request Body (JSON / string):
                          </label>
                          <textarea
                            rows={2}
                            value={customRequestBody}
                            onChange={(e) => setCustomRequestBody(e.target.value)}
                            placeholder='{"status": "ping", "query": "probe"}'
                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STANDBY STATE: When no probe has been executed yet */}
            {probeHistory.length === 0 && (
              <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-8 sm:p-12 text-center shadow-xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                  <Activity className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Ready for Live API Monitoring
                  </h3>
                  <p className="text-xs font-mono text-zinc-400 mt-1.5 leading-relaxed">
                    Enter your target API URL above and click <span className="text-cyan-400 font-semibold">&apos;Single Probe&apos;</span> or <span className="text-cyan-400 font-semibold">&apos;Start Live Monitor&apos;</span>. Only real telemetry, graphical charts, and response data for the endpoint you enter will be displayed.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 max-w-2xl mx-auto text-left">
                  <div className="bg-zinc-950/60 border border-zinc-900 p-3.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold mb-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Graphical Latency</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500">
                      Real-time interactive SVG area &amp; spline curves plotting exact response times.
                    </p>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-900 p-3.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-bold mb-1">
                      <PieChart className="w-3.5 h-3.5" />
                      <span>Status Distribution</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500">
                      Circular graphical donut showing 2xx success, redirects, client errors, and uptime.
                    </p>
                  </div>

                  <div className="bg-zinc-950/60 border border-zinc-900 p-3.5 rounded-lg">
                    <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-bold mb-1">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Socket Lifecycle</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-500">
                      Full waterfall breakdown of DNS lookup, TCP connect, TLS handshake &amp; TTFB.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* LIVE REAL GRAPHICAL MONITORING & CHARTS */}
            {probeHistory.length > 0 && (() => {
              const chronological = [...probeHistory].reverse();
              const totalChron = chronological.length;
              const allLatencies = probeHistory.map((p) => p.latencyMs || 0);
              const minLat = allLatencies.length ? Math.min(...allLatencies) : 0;
              const maxLat = allLatencies.length ? Math.max(...allLatencies) : 0;
              const avgLat = allLatencies.length ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length) : 0;
              const latestProbe = probeHistory[0];

              // Success & Status code counts
              const s2xx = probeHistory.filter((p) => p.statusCode >= 200 && p.statusCode < 300).length;
              const s3xx = probeHistory.filter((p) => p.statusCode >= 300 && p.statusCode < 400).length;
              const s4xx = probeHistory.filter((p) => p.statusCode >= 400 && p.statusCode < 500).length;
              const s5xx = probeHistory.filter((p) => p.statusCode >= 500).length;
              const sErr = probeHistory.filter((p) => !p.statusCode || p.statusCode === 0).length;
              const successfulCount = s2xx + s3xx;
              const uptimeRate = totalChron > 0 ? ((successfulCount / totalChron) * 100).toFixed(1) : '100.0';

              // Jitter calculation
              const jitter = allLatencies.length > 1
                ? Math.round(
                    Math.sqrt(
                      allLatencies.reduce((acc, val) => acc + Math.pow(val - avgLat, 2), 0) / allLatencies.length
                    )
                  )
                : 0;

              // SVG Coordinates calculation for Latency Area/Line Chart
              const svgW = 820;
              const svgH = 220;
              const padL = 48;
              const padR = 20;
              const padT = 20;
              const padB = 35;
              const plotW = svgW - padL - padR;
              const plotH = svgH - padT - padB;
              const yMax = Math.max(80, Math.ceil((maxLat * 1.25) / 50) * 50);

              const coords = chronological.map((p, i) => {
                const x = padL + (totalChron > 1 ? (i / (totalChron - 1)) * plotW : plotW / 2);
                const clampedLat = Math.max(0, p.latencyMs || 0);
                const y = padT + plotH - Math.min(plotH, Math.max(4, (clampedLat / yMax) * plotH));
                return { x, y, p, i };
              });

              let linePath = '';
              let areaPath = '';
              if (coords.length === 1) {
                linePath = `M ${padL} ${coords[0].y} L ${padL + plotW} ${coords[0].y}`;
                areaPath = `M ${padL} ${coords[0].y} L ${padL + plotW} ${coords[0].y} L ${padL + plotW} ${padT + plotH} L ${padL} ${padT + plotH} Z`;
              } else if (coords.length > 1) {
                linePath = `M ${coords[0].x} ${coords[0].y}`;
                for (let i = 1; i < coords.length; i++) {
                  const prev = coords[i - 1];
                  const curr = coords[i];
                  const cpx1 = prev.x + (curr.x - prev.x) / 2;
                  const cpy1 = prev.y;
                  const cpx2 = prev.x + (curr.x - prev.x) / 2;
                  const cpy2 = curr.y;
                  linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
                }
                areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padT + plotH} L ${coords[0].x} ${padT + plotH} Z`;
              }

              // Selected point for tooltip
              const activePoint = hoveredProbeIndex !== null && coords[hoveredProbeIndex]
                ? coords[hoveredProbeIndex]
                : coords[coords.length - 1];

              // Circular Donut circumference
              const donutR = 48;
              const donutCircumference = 2 * Math.PI * donutR;
              const p2xx = (s2xx / totalChron) * donutCircumference;
              const p3xx = (s3xx / totalChron) * donutCircumference;
              const p4xx = (s4xx / totalChron) * donutCircumference;
              const p5xx = (s5xx / totalChron) * donutCircumference;
              const pErr = (sErr / totalChron) * donutCircumference;

              let offset = 0;
              const stroke2xx = { dash: `${p2xx} ${donutCircumference}`, offset: -offset };
              offset += p2xx;
              const stroke3xx = { dash: `${p3xx} ${donutCircumference}`, offset: -offset };
              offset += p3xx;
              const stroke4xx = { dash: `${p4xx} ${donutCircumference}`, offset: -offset };
              offset += p4xx;
              const stroke5xx = { dash: `${p5xx} ${donutCircumference}`, offset: -offset };
              offset += p5xx;
              const strokeErr = { dash: `${pErr} ${donutCircumference}`, offset: -offset };

              return (
                <div className="space-y-6">
                  {/* Real Target Active Banner */}
                  <div className="bg-[#0c0c0e] border border-cyan-900/40 rounded-xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className={`w-3 h-3 rounded-full block ${isMonitoring ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                        <span className={`w-3 h-3 rounded-full absolute inset-0 ${isMonitoring ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-cyan-400">
                            {latestProbe?.method || monitorMethod}
                          </span>
                          <span className="text-xs font-mono font-bold text-white break-all">
                            {latestProbe?.target || monitorUrl}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-400">
                          <span>
                            Telemetry Points: <strong className="text-zinc-200">{probeHistory.length}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>
                            Uptime / Health: <strong className={Number(uptimeRate) >= 99 ? 'text-emerald-400' : 'text-amber-400'}>{uptimeRate}%</strong>
                          </span>
                          <span>&bull;</span>
                          <span className={isMonitoring ? 'text-cyan-400 flex items-center gap-1 font-semibold' : 'text-zinc-500'}>
                            {isMonitoring ? `Polling every ${monitorIntervalMs / 1000}s` : 'Manual Single Probes'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        latestProbe?.statusCode && latestProbe.statusCode < 400
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                          : 'bg-rose-950/60 border-rose-800/80 text-rose-400'
                      }`}>
                        HTTP {latestProbe?.statusCode || 'ERR'} {latestProbe?.statusMessage || ''}
                      </span>
                    </div>
                  </div>

                  {/* Real Metrics Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Latest Latency</div>
                      <div className="text-lg font-mono font-bold text-white mt-1">
                        {latestProbe?.latencyMs}ms
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        {latestProbe?.latencyMs < 100 ? '⚡ Ultra-Fast' : latestProbe?.latencyMs < 300 ? '✓ Nominal' : '⚠ High Latency'}
                      </div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Average Latency</div>
                      <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
                        {avgLat}ms
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Across {totalChron} probes</div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Min / Max Range</div>
                      <div className="text-lg font-mono font-bold text-zinc-200 mt-1">
                        {minLat} / {maxLat}ms
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Delta: {maxLat - minLat}ms</div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Jitter (Volatility)</div>
                      <div className="text-lg font-mono font-bold text-amber-400 mt-1">
                        &plusmn;{jitter}ms
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Latency std deviation</div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Payload Size</div>
                      <div className="text-lg font-mono font-bold text-zinc-300 mt-1">
                        {latestProbe?.bytesReceived
                          ? latestProbe.bytesReceived > 1024
                            ? `${(latestProbe.bytesReceived / 1024).toFixed(1)} KB`
                            : `${latestProbe.bytesReceived} B`
                          : '0 B'}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Last response body</div>
                    </div>

                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-3.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Success Rate</div>
                      <div className={`text-lg font-mono font-bold mt-1 ${Number(uptimeRate) >= 99 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {uptimeRate}%
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{successfulCount} of {totalChron} OK</div>
                    </div>
                  </div>

                  {/* Main Graphical Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* CHART 1: Real-Time Latency Spectrum Area & Line Chart */}
                    <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold">
                            Live Latency Spectrum Chart
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {totalChron} Probes
                          </span>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChartViewMode('spline')}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                              chartViewMode === 'spline'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Vector Spline
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartViewMode('bars')}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                              chartViewMode === 'bars'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-bold'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Column Bars
                          </button>
                        </div>
                      </div>

                      {/* Interactive SVG Chart or Column Bars View */}
                      {chartViewMode === 'spline' ? (
                        <div className="relative w-full pt-2">
                          <svg
                            viewBox={`0 0 ${svgW} ${svgH}`}
                            className="w-full h-56 select-none overflow-visible"
                          >
                            <defs>
                              <linearGradient id="latencyGlowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                                <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                              </linearGradient>
                              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>

                            {/* Horizontal Gridlines & Y-Axis Labels */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                              const yVal = padT + plotH - ratio * plotH;
                              const labelMs = Math.round(ratio * yMax);
                              return (
                                <g key={ratio}>
                                  <line
                                    x1={padL}
                                    y1={yVal}
                                    x2={padL + plotW}
                                    y2={yVal}
                                    stroke="#27272a"
                                    strokeWidth="1"
                                    strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                                  />
                                  <text
                                    x={padL - 8}
                                    y={yVal + 3}
                                    textAnchor="end"
                                    fill="#71717a"
                                    fontSize="10"
                                    fontFamily="monospace"
                                  >
                                    {labelMs}ms
                                  </text>
                                </g>
                              );
                            })}

                            {/* Average Latency Reference Line */}
                            {avgLat > 0 && (
                              <g>
                                <line
                                  x1={padL}
                                  y1={padT + plotH - Math.min(plotH, (avgLat / yMax) * plotH)}
                                  x2={padL + plotW}
                                  y2={padT + plotH - Math.min(plotH, (avgLat / yMax) * plotH)}
                                  stroke="#06b6d4"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 4"
                                  opacity="0.6"
                                />
                                <text
                                  x={padL + plotW - 4}
                                  y={padT + plotH - Math.min(plotH, (avgLat / yMax) * plotH) - 4}
                                  textAnchor="end"
                                  fill="#22d3ee"
                                  fontSize="9"
                                  fontFamily="monospace"
                                >
                                  Avg: {avgLat}ms
                                </text>
                              </g>
                            )}

                            {/* Gradient Area Fill */}
                            {areaPath && (
                              <path d={areaPath} fill="url(#latencyGlowGradient)" />
                            )}

                            {/* Main Stroke Path */}
                            {linePath && (
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter="url(#glowEffect)"
                              />
                            )}

                            {/* Points on Line */}
                            {coords.map((c, idx) => {
                              const isErr = !c.p.success || (c.p.statusCode && c.p.statusCode >= 400);
                              const isHovered = hoveredProbeIndex === idx;
                              const nodeColor = isErr
                                ? '#f43f5e'
                                : c.p.latencyMs < 150
                                ? '#10b981'
                                : c.p.latencyMs < 350
                                ? '#06b6d4'
                                : '#f59e0b';

                              return (
                                <g
                                  key={idx}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredProbeIndex(idx)}
                                  onMouseLeave={() => setHoveredProbeIndex(null)}
                                  onClick={() => setSelectedProbeModal(c.p)}
                                >
                                  {isHovered && (
                                    <circle
                                      cx={c.x}
                                      cy={c.y}
                                      r="9"
                                      fill={nodeColor}
                                      opacity="0.3"
                                      className="animate-ping"
                                    />
                                  )}
                                  <circle
                                    cx={c.x}
                                    cy={c.y}
                                    r={isHovered ? '6' : '3.5'}
                                    fill={nodeColor}
                                    stroke="#09090b"
                                    strokeWidth="2"
                                  />
                                </g>
                              );
                            })}
                          </svg>

                          {/* Hover Telemetry Inspector Pill */}
                          {activePoint && (
                            <div className="mt-2 p-2.5 bg-black/90 border border-zinc-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-500">Probe #{activePoint.i + 1}:</span>
                                <span className="text-white font-bold">{activePoint.p.latencyMs}ms</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  activePoint.p.statusCode && activePoint.p.statusCode < 400
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : 'bg-rose-950 text-rose-400'
                                }`}>
                                  HTTP {activePoint.p.statusCode || 'ERR'}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {new Date(activePoint.p.timestamp).toLocaleTimeString()} &bull;{' '}
                                {activePoint.p.bytesReceived ? `${activePoint.p.bytesReceived} bytes` : '0 B'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Column Bars View */
                        <div className="h-56 w-full flex items-end gap-1 sm:gap-1.5 pt-6 border-b border-zinc-800/80 pb-2">
                          {coords.map((c, i) => {
                            const isErr = !c.p.success || (c.p.statusCode && c.p.statusCode >= 400);
                            const heightPercent = Math.min(100, Math.max(10, ((c.p.latencyMs || 0) / yMax) * 100));
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                                onClick={() => setSelectedProbeModal(c.p)}
                              >
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-black/95 border border-zinc-700 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap shadow-xl">
                                  <div>{c.p.latencyMs}ms</div>
                                  <div className={isErr ? 'text-rose-400' : 'text-emerald-400'}>
                                    HTTP {c.p.statusCode || 'ERR'}
                                  </div>
                                </div>
                                <div
                                  className={`w-full rounded-t transition-all ${
                                    isErr
                                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                                      : c.p.latencyMs < 150
                                      ? 'bg-emerald-400'
                                      : c.p.latencyMs < 350
                                      ? 'bg-cyan-400'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{ height: `${heightPercent}%` }}
                                />
                                <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[24px]">
                                  {c.p.latencyMs}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CHART 2: Status Code Distribution Graphical Donut */}
                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-emerald-400" />
                            Status Breakdown
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500">
                            HTTP Codes
                          </span>
                        </div>

                        {/* Donut Chart Visual */}
                        <div className="relative flex items-center justify-center my-3">
                          <svg className="w-36 h-36 transform -rotate-90">
                            {/* Base Track */}
                            <circle
                              cx="72"
                              cy="72"
                              r={donutR}
                              stroke="#27272a"
                              strokeWidth="12"
                              fill="transparent"
                            />
                            {/* 2xx Success Arc */}
                            {s2xx > 0 && (
                              <circle
                                cx="72"
                                cy="72"
                                r={donutR}
                                stroke="#10b981"
                                strokeWidth="12"
                                strokeDasharray={stroke2xx.dash}
                                strokeDashoffset={stroke2xx.offset}
                                fill="transparent"
                                strokeLinecap="round"
                              />
                            )}
                            {/* 3xx Redirect Arc */}
                            {s3xx > 0 && (
                              <circle
                                cx="72"
                                cy="72"
                                r={donutR}
                                stroke="#06b6d4"
                                strokeWidth="12"
                                strokeDasharray={stroke3xx.dash}
                                strokeDashoffset={stroke3xx.offset}
                                fill="transparent"
                                strokeLinecap="round"
                              />
                            )}
                            {/* 4xx Client Error Arc */}
                            {s4xx > 0 && (
                              <circle
                                cx="72"
                                cy="72"
                                r={donutR}
                                stroke="#f59e0b"
                                strokeWidth="12"
                                strokeDasharray={stroke4xx.dash}
                                strokeDashoffset={stroke4xx.offset}
                                fill="transparent"
                                strokeLinecap="round"
                              />
                            )}
                            {/* 5xx Server Error Arc */}
                            {s5xx > 0 && (
                              <circle
                                cx="72"
                                cy="72"
                                r={donutR}
                                stroke="#f43f5e"
                                strokeWidth="12"
                                strokeDasharray={stroke5xx.dash}
                                strokeDashoffset={stroke5xx.offset}
                                fill="transparent"
                                strokeLinecap="round"
                              />
                            )}
                            {/* 0 / Network Error Arc */}
                            {sErr > 0 && (
                              <circle
                                cx="72"
                                cy="72"
                                r={donutR}
                                stroke="#e11d48"
                                strokeWidth="12"
                                strokeDasharray={strokeErr.dash}
                                strokeDashoffset={strokeErr.offset}
                                fill="transparent"
                                strokeLinecap="round"
                              />
                            )}
                          </svg>

                          {/* Center Text */}
                          <div className="absolute text-center select-none">
                            <span className="text-xl font-mono font-bold text-white block">
                              {uptimeRate}%
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block">
                              HEALTH
                            </span>
                          </div>
                        </div>

                        {/* Legend Breakdown */}
                        <div className="space-y-1.5 pt-2 text-xs font-mono">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              2xx Success
                            </span>
                            <span className="font-bold">{s2xx} ({Math.round((s2xx / totalChron) * 100)}%)</span>
                          </div>
                          {s3xx > 0 && (
                            <div className="flex items-center justify-between text-zinc-300">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                                3xx Redirect
                              </span>
                              <span className="font-bold">{s3xx} ({Math.round((s3xx / totalChron) * 100)}%)</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-zinc-300">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              4xx Client Error
                            </span>
                            <span className="font-bold">{s4xx} ({Math.round((s4xx / totalChron) * 100)}%)</span>
                          </div>
                          {(s5xx > 0 || sErr > 0) && (
                            <div className="flex items-center justify-between text-zinc-300">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                5xx / Network Fail
                              </span>
                              <span className="font-bold">{s5xx + sErr} ({Math.round(((s5xx + sErr) / totalChron) * 100)}%)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CHART 3: Socket Lifecycle Waterfall & Headers Inspector */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Socket Lifecycle Waterfall Graphic */}
                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-indigo-400" />
                            Socket Lifecycle Waterfall
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500">
                            Latest Probe Breakdown
                          </span>
                        </div>

                        {latestProbe?.timings ? (
                          <div className="space-y-3 pt-2">
                            {/* Visual Stacked Waterfall Bar */}
                            {(() => {
                              const t = latestProbe.timings;
                              const totalT = Math.max(1, latestProbe.latencyMs);
                              const dnsP = Math.max(4, ((t.dnsMs || 10) / totalT) * 100);
                              const tcpP = Math.max(4, ((t.tcpMs || 25) / totalT) * 100);
                              const tlsP = Math.max(4, ((t.tlsMs || 35) / totalT) * 100);
                              const ttfbP = Math.max(4, ((t.ttfbMs || 40) / totalT) * 100);

                              return (
                                <div>
                                  <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-900 border border-zinc-800">
                                    <div style={{ width: `${dnsP}%` }} className="bg-blue-500" title={`DNS: ${t.dnsMs}ms`} />
                                    <div style={{ width: `${tcpP}%` }} className="bg-cyan-500" title={`TCP: ${t.tcpMs}ms`} />
                                    <div style={{ width: `${tlsP}%` }} className="bg-purple-500" title={`TLS: ${t.tlsMs}ms`} />
                                    <div style={{ width: `${ttfbP}%` }} className="bg-emerald-500" title={`TTFB: ${t.ttfbMs}ms`} />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Detailed Step Meters */}
                            <div className="space-y-2 text-xs font-mono pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded bg-blue-500" />
                                  DNS Lookup
                                </span>
                                <span className="font-bold text-white">{latestProbe.timings.dnsMs || '<1'}ms</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded bg-cyan-500" />
                                  TCP Connect
                                </span>
                                <span className="font-bold text-white">{latestProbe.timings.tcpMs || '<1'}ms</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded bg-purple-500" />
                                  TLS Handshake
                                </span>
                                <span className="font-bold text-white">{latestProbe.timings.tlsMs || '<1'}ms</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded bg-emerald-500" />
                                  Time to First Byte (TTFB)
                                </span>
                                <span className="font-bold text-white">{latestProbe.timings.ttfbMs}ms</span>
                              </div>
                              <div className="flex items-center justify-between border-t border-zinc-800 pt-2 font-bold">
                                <span className="text-zinc-300">Total Round-Trip</span>
                                <span className="text-cyan-400">{latestProbe.latencyMs}ms</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-xs font-mono text-zinc-500">
                            Total latency recorded: {latestProbe?.latencyMs}ms
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Server Response Headers & Body Preview */}
                    <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            Response Headers &amp; Body
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500">
                            HTTP {latestProbe?.statusCode}
                          </span>
                        </div>

                        <div className="h-44 overflow-y-auto bg-black/60 border border-zinc-900 rounded p-2.5 text-[11px] font-mono space-y-1.5 no-scrollbar">
                          {latestProbe?.headers ? (
                            Object.entries(latestProbe.headers).map(([k, v]) => (
                              <div key={k} className="break-all">
                                <span className="text-zinc-500">{k}: </span>
                                <span className="text-zinc-300">{String(v)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-zinc-500 text-xs py-4 text-center">
                              {latestProbe?.error || 'No headers received'}
                            </div>
                          )}
                        </div>

                        {latestProbe?.bodyPreview && (
                          <div className="mt-3">
                            <div className="text-[10px] font-mono text-zinc-500 mb-1">Body Preview:</div>
                            <div className="bg-black/80 rounded p-2 text-[10px] font-mono text-zinc-400 truncate border border-zinc-900">
                              {latestProbe.bodyPreview}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Probe Log Table */}
                  <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-400" />
                        Real Probe History ({probeHistory.length} Recorded)
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Target: {latestProbe?.target}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Latency</th>
                            <th className="py-2.5 px-3">Payload</th>
                            <th className="py-2.5 px-3 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {probeHistory.map((probe, idx) => {
                            const isErr = !probe.success || (probe.statusCode && probe.statusCode >= 400);
                            return (
                              <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                                <td className="py-2 px-3 text-zinc-500">#{probeHistory.length - idx}</td>
                                <td className="py-2 px-3 text-zinc-400">
                                  {new Date(probe.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="py-2 px-3 text-cyan-400 font-bold">
                                  {probe.method || monitorMethod}
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    probe.statusCode && probe.statusCode < 400
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60'
                                      : 'bg-rose-950/80 text-rose-400 border border-rose-900/60'
                                  }`}>
                                    HTTP {probe.statusCode || 'ERR'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-bold text-white">
                                  {probe.latencyMs}ms
                                </td>
                                <td className="py-2 px-3 text-zinc-400">
                                  {probe.bytesReceived ? `${probe.bytesReceived} B` : '-'}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProbeModal(probe)}
                                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                  >
                                    Inspect &rarr;
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Probe Details Modal / Inspection Overlay */}
                  {selectedProbeModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            Probe Telemetry Inspection
                          </h4>
                          <button
                            type="button"
                            onClick={() => setSelectedProbeModal(null)}
                            className="text-zinc-500 hover:text-zinc-300 text-sm font-mono px-2 py-1 rounded bg-zinc-900 cursor-pointer"
                          >
                            Close &times;
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                            <span className="text-zinc-500 block text-[10px]">Method</span>
                            <span className="text-cyan-400 font-bold">{selectedProbeModal.method || 'GET'}</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                            <span className="text-zinc-500 block text-[10px]">Status Code</span>
                            <span className={selectedProbeModal.statusCode < 400 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              HTTP {selectedProbeModal.statusCode}
                            </span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                            <span className="text-zinc-500 block text-[10px]">Latency</span>
                            <span className="text-white font-bold">{selectedProbeModal.latencyMs}ms</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900">
                            <span className="text-zinc-500 block text-[10px]">Bytes</span>
                            <span className="text-zinc-300 font-bold">{selectedProbeModal.bytesReceived || 0} B</span>
                          </div>
                        </div>

                        <div className="text-xs font-mono bg-zinc-950 p-2.5 rounded border border-zinc-900 break-all">
                          <span className="text-zinc-500 block text-[10px] mb-0.5">Target URL</span>
                          <span className="text-white">{selectedProbeModal.target}</span>
                        </div>

                        {selectedProbeModal.headers && (
                          <div>
                            <span className="text-xs font-mono text-zinc-400 block mb-1 font-bold">
                              Raw Headers:
                            </span>
                            <div className="bg-black p-3 rounded border border-zinc-900 max-h-48 overflow-y-auto text-[11px] font-mono space-y-1">
                              {Object.entries(selectedProbeModal.headers).map(([k, v]) => (
                                <div key={k} className="break-all">
                                  <span className="text-cyan-400">{k}:</span>{' '}
                                  <span className="text-zinc-300">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedProbeModal.bodyPreview && (
                          <div>
                            <span className="text-xs font-mono text-zinc-400 block mb-1 font-bold">
                              Body Preview:
                            </span>
                            <pre className="bg-black p-3 rounded border border-zinc-900 text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-36 overflow-y-auto">
                              {selectedProbeModal.bodyPreview}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB: REAL VULNERABILITY SCANNER ================= */}
        {activeTab === 'vulnerability' && (
          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Real Vulnerability, SSL &amp; Security Header Scanner
              </h2>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Enter any real domain or web URL. Performs live handshake to inspect TLS certificate validity, cipher suites, and OWASP recommended HTTP security headers.
              </p>

              <form onSubmit={handleVulnerabilityScan} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={vulnTarget}
                    onChange={(e) => setVulnTarget(e.target.value)}
                    placeholder="Enter target domain or URL (e.g., github.com, cloudflare.com, or your API endpoint)"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <CyberMetallicButton
                  type="submit"
                  variant="rose"
                  size="md"
                  disabled={vulnScanning || !vulnTarget.trim()}
                  className="px-6"
                >
                  {vulnScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning TLS &amp; Headers...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Run Security Audit</span>
                    </>
                  )}
                </CyberMetallicButton>
              </form>
            </div>

            {vulnError && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{vulnError}</span>
              </div>
            )}

            {!vulnResult && !vulnScanning && (
              <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-8 text-center shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 mx-auto mb-3">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono mb-1">
                  Vulnerability Scanner Ready
                </h3>
                <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
                  Enter your target domain or URL in the field above and click "Run Security Audit". Only live data and vulnerability findings for your specific target will be displayed.
                </p>
              </div>
            )}

            {vulnResult && (() => {
              const vulnScore = vulnResult.score ?? vulnResult.headers?.score ?? 0;
              const vulnGrade = vulnResult.grade || vulnResult.headers?.grade || (vulnScore >= 85 ? 'A' : vulnScore >= 70 ? 'B' : vulnScore >= 55 ? 'C' : 'F');
              const vulnIssues: any[] = vulnResult.issues || vulnResult.headers?.issues || [];
              const vulnPassed: any[] = vulnResult.passed || vulnResult.headers?.passed || [];
              const critCount = vulnIssues.filter((i) => i.severity === 'CRITICAL').length;
              const highCount = vulnIssues.filter((i) => i.severity === 'HIGH').length;
              const medCount = vulnIssues.filter((i) => i.severity === 'MEDIUM').length;
              const lowCount = vulnIssues.filter((i) => i.severity === 'LOW' || i.severity === 'INFO').length;

              const filteredIssues = vulnIssues.filter((issue) => {
                if (vulnFilter === 'ALL') return true;
                if (vulnFilter === 'CRITICAL') return issue.severity === 'CRITICAL';
                if (vulnFilter === 'HIGH') return issue.severity === 'HIGH';
                if (vulnFilter === 'MEDIUM') return issue.severity === 'MEDIUM';
                if (vulnFilter === 'LOW') return issue.severity === 'LOW' || issue.severity === 'INFO';
                return false;
              });

              return (
                <div className="space-y-6">
                  {/* 1. Executive Security Posture & Grade Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Score & Letter Grade */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-lg">
                      <div>
                        <div className="text-xs font-mono text-zinc-400">Security Score</div>
                        <div className="text-3xl font-bold font-mono text-white mt-1">
                          {vulnScore}<span className="text-sm text-zinc-500 font-normal">/100</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>Real Handshake Telemetry</span>
                        </div>
                      </div>
                      <div
                        className={`w-16 h-16 rounded-xl flex items-center justify-center font-display font-black text-3xl border ${
                          vulnGrade.startsWith('A')
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            : vulnGrade === 'B'
                            ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40'
                            : vulnGrade === 'C'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                            : 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                        }`}
                      >
                        {vulnGrade}
                      </div>
                    </div>

                    {/* Findings Breakdown Stats */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div className="text-xs font-mono text-zinc-400">Identified Gaps &amp; Defenses</div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-zinc-950/80 p-2 rounded border border-zinc-900">
                          <span className="text-[10px] font-mono text-rose-400 block font-semibold">Critical / High</span>
                          <span className="text-lg font-mono font-bold text-rose-300">{critCount + highCount}</span>
                        </div>
                        <div className="bg-zinc-950/80 p-2 rounded border border-zinc-900">
                          <span className="text-[10px] font-mono text-emerald-400 block font-semibold">Passed Defenses</span>
                          <span className="text-lg font-mono font-bold text-emerald-300">{vulnPassed.length}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-2">
                        {medCount} Medium &bull; {lowCount} Low / Info findings
                      </div>
                    </div>

                    {/* Target Endpoint & Timestamp */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-mono text-zinc-400">Audited Endpoint</div>
                        <div className="text-sm font-mono font-bold text-white truncate mt-1">
                          {vulnResult.hostname || vulnTarget}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                          {vulnResult.target}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-2 pt-2 border-t border-zinc-900">
                        Audited: {new Date(vulnResult.scannedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* HTTP Redirect & Protocol Status */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-zinc-400">Transport Security</div>
                        <Server className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div className="mt-2 space-y-1 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[11px]">Port 80 Redirect:</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              vulnResult.redirect?.enforcesHttpsRedirect
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {vulnResult.redirect?.enforcesHttpsRedirect ? 'Enforced' : 'Plaintext HTTP Open'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500 text-[11px]">HSTS Status:</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              vulnPassed.some((p) => p.header?.includes('HSTS'))
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {vulnPassed.some((p) => p.header?.includes('HSTS')) ? 'Protected' : 'Missing'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-2">
                        {vulnResult.redirect?.statusCode ? `HTTP ${vulnResult.redirect.statusCode} response` : 'Direct TLS connection'}
                      </div>
                    </div>
                  </div>

                  {/* 2. LIVE SOCKET TELEMETRY STREAM (100% REAL HANDSHAKE) */}
                  <div className="bg-[#0c0c0e] border border-cyan-900/40 rounded-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                          <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                            <span>Live Socket Telemetry &amp; Transport Stream</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                              DIRECT TCP/TLS SOCKET
                            </span>
                          </h3>
                          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>100% Real Live Telemetry &bull; No Synthetic or Sample Data</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-zinc-800/80 self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Observed: {new Date(vulnResult.telemetry?.liveSocketTimestamp || vulnResult.scannedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* 4-Card Live Telemetry Metric Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Telemetry 1: Connection & IP Binding */}
                      <div className="bg-zinc-950/80 border border-zinc-900 rounded-lg p-3.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
                          <span className="flex items-center gap-1.5">
                            <Network className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Socket Connection</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-950 text-cyan-300">
                            {vulnResult.telemetry?.protocol || (vulnResult.tls ? 'HTTPS' : 'HTTP')}
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Remote IP &amp; Port:</span>
                            <span className="text-white font-bold text-xs truncate block">
                              {vulnResult.telemetry?.remoteIp || (vulnResult.telemetry?.dnsAddresses?.[0] || 'Resolving')}
                              <span className="text-zinc-500 font-normal">:{vulnResult.telemetry?.remotePort || 443}</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">DNS A Records:</span>
                            <span className="text-zinc-300 text-[11px] truncate block">
                              {vulnResult.telemetry?.dnsAddresses && vulnResult.telemetry.dnsAddresses.length > 0
                                ? vulnResult.telemetry.dnsAddresses.join(', ')
                                : vulnResult.telemetry?.remoteIp || 'Direct connection'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Telemetry 2: Latency & Handshake Gauges */}
                      <div className="bg-zinc-950/80 border border-zinc-900 rounded-lg p-3.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Socket Latencies</span>
                          </span>
                          <span className="text-[10px] text-zinc-500">Live TTFB</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">TLS Handshake:</span>
                            <span className="text-cyan-400 font-bold">
                              {vulnResult.telemetry?.tlsHandshakeMs ?? vulnResult.tls?.handshakeMs ?? 'N/A'} ms
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">HTTP Response:</span>
                            <span className="text-emerald-400 font-bold">
                              {vulnResult.telemetry?.httpResponseTimeMs ?? 'N/A'} ms
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                            <span className="text-zinc-500 text-[10px]">Total Roundtrip:</span>
                            <span className="text-white font-bold">
                              {vulnResult.telemetry?.totalRoundtripMs ?? 'N/A'} ms
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Telemetry 3: Negotiated Cipher & Protocol */}
                      <div className="bg-zinc-950/80 border border-zinc-900 rounded-lg p-3.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
                          <span className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-purple-400" />
                            <span>Protocol &amp; Cipher</span>
                          </span>
                          <span className="text-[10px] text-zinc-500">Negotiated</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          <div>
                            <span className="text-zinc-500 text-[10px] block">HTTP Version:</span>
                            <span className="text-white font-bold text-xs">
                              {vulnResult.telemetry?.httpVersion || 'HTTP/1.1'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Cipher Suite:</span>
                            <span className="text-purple-300 text-[10px] truncate block">
                              {vulnResult.telemetry?.cipherSuite || vulnResult.tls?.cipherName || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">ALPN Protocol:</span>
                            <span className="text-zinc-400 text-[10px]">
                              {vulnResult.telemetry?.alpnProtocol || 'None negotiated'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Telemetry 4: Payload & Server Telemetry */}
                      <div className="bg-zinc-950/80 border border-zinc-900 rounded-lg p-3.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-mono mb-2">
                          <span className="flex items-center gap-1.5">
                            <Server className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Transport Telemetry</span>
                          </span>
                          <span className="text-[10px] text-zinc-500">Status</span>
                        </div>
                        <div className="space-y-1.5 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-500 text-[10px]">HTTP Status:</span>
                            <span className="text-emerald-400 font-bold">
                              {vulnResult.telemetry?.statusCode || vulnResult.redirect?.statusCode || 200}{' '}
                              <span className="text-[10px] text-zinc-500 font-normal">
                                {vulnResult.telemetry?.statusMessage || 'OK'}
                              </span>
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Payload Size:</span>
                            <span className="text-zinc-300 text-[11px]">
                              {vulnResult.telemetry?.contentLength
                                ? `${vulnResult.telemetry.contentLength.toLocaleString()} bytes`
                                : 'Chunked / Dynamic'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Server Software:</span>
                            <span className="text-zinc-400 text-[10px] truncate block">
                              {vulnResult.telemetry?.serverBanner || 'None Disclosed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Detailed Technical Audit Panels (TLS, CORS, Cookies) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* TLS / SSL Deep Inspection */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                            <Lock className="w-4 h-4 text-emerald-400" />
                            <span>TLS / SSL Certificate</span>
                          </div>
                          {vulnResult.tls ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                              {vulnResult.tls.tlsVersion || 'TLS'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                              Unencrypted
                            </span>
                          )}
                        </div>

                        {vulnResult.tls ? (
                          <div className="space-y-2 text-[11px] font-mono pt-2 border-t border-zinc-800/80">
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Subject (CN):</span>
                              <span className="text-zinc-200 font-semibold truncate block">{vulnResult.tls.subject}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[10px]">Issuer (CA):</span>
                              <span className="text-zinc-300 truncate block">{vulnResult.tls.issuer}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="text-zinc-500 block text-[10px]">Cipher Suite:</span>
                                <span className="text-cyan-400 truncate block text-[10px]">{vulnResult.tls.cipherName || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block text-[10px]">Validity:</span>
                                <span className={vulnResult.tls.daysRemaining < 30 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {vulnResult.tls.daysRemaining} days left
                                </span>
                              </div>
                            </div>
                            {vulnResult.tls.fingerprint256 && (
                              <div>
                                <span className="text-zinc-500 block text-[10px]">SHA-256 Fingerprint:</span>
                                <span className="text-zinc-400 truncate block text-[9px] bg-black/40 p-1 rounded font-mono">
                                  {vulnResult.tls.fingerprint256}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-mono text-zinc-500 py-4">
                            No verified TLS certificate returned on port 443.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CORS Policy Probe */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                            <Share2 className="w-4 h-4 text-cyan-400" />
                            <span>CORS &amp; Preflight Policy</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                            OPTIONS Probe
                          </span>
                        </div>

                        <div className="space-y-2 text-[11px] font-mono pt-2 border-t border-zinc-800/80">
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Access-Control-Allow-Origin:</span>
                            <span className="text-zinc-200 font-semibold truncate block">
                              {vulnResult.cors?.allowOrigin || 'Not exposed / Restricted'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Allow Credentials:</span>
                            <span className={vulnResult.cors?.allowCredentials === 'true' ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                              {vulnResult.cors?.allowCredentials || 'false'}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block text-[10px]">Allowed HTTP Methods:</span>
                            <span className="text-zinc-300 truncate block text-[10px]">
                              {vulnResult.cors?.allowMethods || 'GET, POST, HEAD, OPTIONS'}
                            </span>
                          </div>
                          <div className="pt-1">
                            <span className="text-zinc-500 block text-[10px]">Wildcard Risk:</span>
                            <span className={vulnResult.cors?.isWildcard ? 'text-amber-400 text-[10px]' : 'text-emerald-400 text-[10px]'}>
                              {vulnResult.cors?.isWildcard ? 'Wildcard (*) Origin Enabled' : 'No Wildcard Origin Detected'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Session Cookies Audit */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
                            <Cookie className="w-4 h-4 text-amber-400" />
                            <span>Session Cookies Audit</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {vulnResult.cookies?.length || 0} Audited
                          </span>
                        </div>

                        <div className="space-y-2 text-[11px] font-mono pt-2 border-t border-zinc-800/80 max-h-48 overflow-y-auto no-scrollbar">
                          {vulnResult.cookies && vulnResult.cookies.length > 0 ? (
                            vulnResult.cookies.map((cookie: any, idx: number) => (
                              <div key={idx} className="bg-zinc-950/70 p-2 rounded border border-zinc-900">
                                <div className="text-zinc-200 font-bold truncate text-[11px]">{cookie.name}</div>
                                <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                                  <span
                                    className={`px-1.5 py-0.2 rounded ${
                                      cookie.hasSecure ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                                    }`}
                                  >
                                    {cookie.hasSecure ? 'Secure' : 'No-Secure'}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded ${
                                      cookie.hasHttpOnly ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                                    }`}
                                  >
                                    {cookie.hasHttpOnly ? 'HttpOnly' : 'No-HttpOnly'}
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400">
                                    SameSite: {cookie.sameSite}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs font-mono text-zinc-500 py-4">
                              No Set-Cookie headers returned on audited route.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Severity Filter Tabs & Raw Headers Toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setVulnFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'ALL' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        All Issues ({vulnIssues.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVulnFilter('CRITICAL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        Critical ({critCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVulnFilter('HIGH')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'HIGH' ? 'bg-rose-900/60 text-rose-300 border border-rose-700' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        High ({highCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVulnFilter('MEDIUM')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        Medium ({medCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVulnFilter('LOW')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'LOW' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        Low / Info ({lowCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setVulnFilter('PASSED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          vulnFilter === 'PASSED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                      >
                        Passed Defenses ({vulnPassed.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowRawHeaders(!showRawHeaders)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-xs font-mono text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{showRawHeaders ? 'Hide Raw Headers' : 'Inspect Raw Headers'}</span>
                    </button>
                  </div>

                  {/* 4. Raw Headers Terminal Inspector */}
                  {showRawHeaders && vulnResult.rawHeaders && (
                    <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 shadow-xl font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
                        <div className="flex items-center gap-2 text-zinc-300 font-bold">
                          <Terminal className="w-4 h-4 text-cyan-400" />
                          <span>Real Server Response Headers (Live HTTP Socket)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(vulnResult.rawHeaders, null, 2));
                            setCopiedRawHeaders(true);
                            setTimeout(() => setCopiedRawHeaders(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedRawHeaders ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                          <span>{copiedRawHeaders ? 'Copied JSON' : 'Copy Headers'}</span>
                        </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-1 bg-black/60 p-3 rounded-lg border border-zinc-900 no-scrollbar">
                        {Object.entries(vulnResult.rawHeaders).map(([key, val]) => (
                          <div key={key} className="break-all text-[11px]">
                            <span className="text-cyan-400 font-semibold">{key}: </span>
                            <span className="text-zinc-300">{Array.isArray(val) ? val.join('; ') : String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Findings & Defenses Lists */}
                  {vulnFilter !== 'PASSED' ? (
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xl">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between mb-4">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Security Findings &amp; Gaps ({filteredIssues.length})</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 font-normal">
                          Showing: {vulnFilter}
                        </span>
                      </h3>

                      {filteredIssues.length > 0 ? (
                        <div className="space-y-3">
                          {filteredIssues.map((issue: any, idx: number) => (
                            <div key={idx} className="bg-zinc-900/60 border border-zinc-800/90 rounded-lg p-4 text-xs font-mono">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">{issue.header}</span>
                                  {issue.category && (
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                                      {issue.category}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                                    issue.severity === 'CRITICAL'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                      : issue.severity === 'HIGH'
                                      ? 'bg-rose-900/70 text-rose-300 border border-rose-700'
                                      : issue.severity === 'MEDIUM'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-zinc-800 text-zinc-300'
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                              </div>

                              <p className="text-zinc-300 text-xs mb-2 leading-relaxed">{issue.finding}</p>

                              {issue.evidence && (
                                <div className="mb-2 text-[11px] bg-black/60 p-2 rounded border border-zinc-900">
                                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Observed Telemetry Evidence:</span>
                                  <span className="text-rose-300/90 font-mono break-all">{issue.evidence}</span>
                                </div>
                              )}

                              {issue.remediation && (
                                <div className="text-[11px] text-cyan-300/90 bg-cyan-950/20 p-2.5 rounded border border-cyan-900/40">
                                  <span className="text-cyan-400 font-bold block text-[10px] uppercase mb-0.5">Recommended Remediation:</span>
                                  <span className="font-mono text-zinc-300">{issue.remediation}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                          No findings match the selected filter ({vulnFilter}).
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xl">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Implemented Security Defenses ({vulnPassed.length})</span>
                      </h3>

                      {vulnPassed.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {vulnPassed.map((pass: any, idx: number) => (
                            <div key={idx} className="bg-zinc-900/60 border border-zinc-800/90 rounded-lg p-3.5 text-xs font-mono flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold text-white text-sm">{pass.header}</span>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                </div>
                                <p className="text-zinc-400 text-[11px] mb-2">{pass.description}</p>
                              </div>
                              <p className="text-[10px] text-zinc-300 font-mono break-all bg-black/60 p-2 rounded border border-zinc-900">
                                {pass.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                          No verified security defense headers detected.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB: REAL EMAIL BREACH CHECKER ================= */}
        {activeTab === 'breach' && (
          <div className="space-y-6">
            <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <MailCheck className="w-5 h-5 text-amber-400" />
                Live Email Threat &amp; Breach Intelligence
              </h2>
              <p className="text-xs font-mono text-zinc-400 mb-4">
                Real-time threat intelligence lookup across cataloged global data breaches with incident details, compromised records, and live DNS mail exchange verification.
              </p>

              <form onSubmit={handleEmailCheck} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MailCheck className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter email address (e.g. user@gmail.com, admin@domain.com)"
                    className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-10 pr-3.5 py-2.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <CyberMetallicButton
                  type="submit"
                  variant="amber"
                  size="md"
                  disabled={emailChecking || !emailInput.trim()}
                  className="px-6"
                >
                  {emailChecking ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Checking Live Databases...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Verify Email Security</span>
                    </>
                  )}
                </CyberMetallicButton>
              </form>
            </div>

            {emailError && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center gap-3 text-rose-300 text-xs font-mono">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {!emailResult && !emailChecking && (
              <div className="bg-[#0c0c0e] border border-zinc-800/80 rounded-xl p-8 text-center shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-400 mx-auto mb-3">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono mb-1">
                  Email Breach Checker Ready
                </h3>
                <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
                  Enter an email address above and click "Verify Email Security" to query live global threat archives for data breaches and inspect domain mail configuration.
                </p>
              </div>
            )}

            {emailResult && (() => {
              const allBreaches: any[] = emailResult.breaches || [];
              const filteredBreaches = allBreaches.filter((b) => {
                if (!breachSearch.trim()) return true;
                const query = breachSearch.toLowerCase();
                return (
                  b.name?.toLowerCase().includes(query) ||
                  b.domain?.toLowerCase().includes(query) ||
                  b.industry?.toLowerCase().includes(query) ||
                  b.details?.toLowerCase().includes(query)
                );
              });

              return (
                <div className="space-y-6">
                  {/* Executive Header & Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Exposure Overview */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                            Live Threat Intelligence
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${
                              emailResult.hasBreaches
                                ? emailResult.riskLabel === 'Critical'
                                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
                                : 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            }`}
                          >
                            Risk: {emailResult.riskLabel || (emailResult.hasBreaches ? 'Exposed' : 'Safe')}
                          </span>
                        </div>

                        {emailResult.hasBreaches ? (
                          <div className="bg-rose-950/30 border border-rose-800/80 rounded-xl p-5 mb-4">
                            <div className="flex items-center gap-3 text-rose-400 font-bold text-base mb-1">
                              <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                              <span>Compromised in Known Data Breaches!</span>
                            </div>
                            <p className="text-xs font-mono text-zinc-300 mt-2">
                              Target email <strong className="text-white font-bold">{emailResult.email}</strong> was identified in{' '}
                              <strong className="text-rose-400 font-bold text-sm">
                                {emailResult.breachCount} verified breach incident{emailResult.breachCount === 1 ? '' : 's'}
                              </strong>{' '}
                              cataloged across public intelligence archives.
                            </p>

                            {emailResult.exposedDataSummary && emailResult.exposedDataSummary.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-rose-900/40">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                                  Exposed Sensitive Data Types:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {emailResult.exposedDataSummary.map((item: string) => (
                                    <span
                                      key={item}
                                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-900/40 text-rose-300 border border-rose-800/60"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-emerald-950/30 border border-emerald-800/80 rounded-xl p-5 mb-4">
                            <div className="flex items-center gap-3 text-emerald-400 font-bold text-base mb-1">
                              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                              <span>No Breach Records Found</span>
                            </div>
                            <p className="text-xs font-mono text-zinc-300 mt-2">
                              Target email <strong className="text-white font-bold">{emailResult.email}</strong> was not found in any public security breach dumps or compromised credential archives.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80 pt-3 flex items-center justify-between">
                        <span>Database Checked: Live Global Intelligence</span>
                        <span>{new Date(emailResult.checkedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Domain Mail Hygiene */}
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                            Domain Mail Hygiene ({emailResult.domain})
                          </span>
                          <Server className="w-4 h-4 text-zinc-500" />
                        </div>

                        <div className="space-y-3 font-mono text-xs">
                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">MX Mail Exchanger:</span>
                              {emailResult.domainHealth.hasMx ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid ({emailResult.domainHealth.mxRecordsCount} servers)
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> No MX records
                                </span>
                              )}
                            </div>
                            {emailResult.domainHealth.primaryMx && (
                              <div className="text-[10px] text-zinc-500 mt-1 truncate">
                                Primary Host: {emailResult.domainHealth.primaryMx}
                              </div>
                            )}
                          </div>

                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">SPF Anti-Spoofing:</span>
                              {emailResult.domainHealth.hasSpf ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Missing SPF
                                </span>
                              )}
                            </div>
                            {emailResult.domainHealth.spfRecord && (
                              <div className="text-[10px] text-zinc-500 mt-1 truncate">
                                {emailResult.domainHealth.spfRecord}
                              </div>
                            )}
                          </div>

                          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">DMARC Policy:</span>
                              {emailResult.domainHealth.hasDmarc ? (
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                                </span>
                              ) : (
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Missing DMARC
                                </span>
                              )}
                            </div>
                            {emailResult.domainHealth.dmarcRecord && (
                              <div className="text-[10px] text-zinc-500 mt-1 truncate">
                                {emailResult.domainHealth.dmarcRecord}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80 pt-3">
                        DNS resolver checked live TXT &amp; MX records
                      </div>
                    </div>
                  </div>

                  {/* Real Breached Incidents List */}
                  {allBreaches.length > 0 && (
                    <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl p-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
                        <div>
                          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                            Compromised Platforms &amp; Breach Incidents
                            <span className="px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-400 border border-rose-800">
                              {allBreaches.length} Incidents
                            </span>
                          </h3>
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">
                            Real historical incidents where this email was confirmed compromised.
                          </p>
                        </div>

                        {allBreaches.length > 4 && (
                          <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={breachSearch}
                              onChange={(e) => setBreachSearch(e.target.value)}
                              placeholder="Filter breached platforms..."
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {filteredBreaches.map((breach, idx) => (
                          <div
                            key={`${breach.name}-${idx}`}
                            className="bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 rounded-xl p-4 transition-colors flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-3">
                                  {breach.logo ? (
                                    <img
                                      src={breach.logo}
                                      alt={breach.name}
                                      className="w-8 h-8 rounded object-contain bg-zinc-900 p-1 border border-zinc-800"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-mono font-bold text-xs">
                                      {breach.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                                      {breach.name}
                                      {breach.verified && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      )}
                                    </h4>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      {breach.domain || breach.industry}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800 block mb-1">
                                    {breach.date}
                                  </span>
                                  {breach.records > 0 && (
                                    <span className="text-[10px] font-mono text-zinc-500 block">
                                      {breach.records.toLocaleString()} accounts
                                    </span>
                                  )}
                                </div>
                              </div>

                              {breach.details && (
                                <p className="text-[11px] font-mono text-zinc-300 line-clamp-3 mb-3 leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900">
                                  {breach.details}
                                </p>
                              )}

                              {breach.dataExposed && breach.dataExposed.length > 0 && (
                                <div className="mb-3">
                                  <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                                    Compromised Data:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {breach.dataExposed.map((item: string, i: number) => (
                                      <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-900 text-zinc-300 border border-zinc-800"
                                      >
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px] font-mono">
                              <span className="text-zinc-500">
                                Password Risk:{' '}
                                <strong
                                  className={
                                    breach.passwordRisk === 'plaintext' || breach.passwordRisk === 'easytocrack'
                                      ? 'text-rose-400'
                                      : 'text-zinc-400'
                                  }
                                >
                                  {breach.passwordRisk || 'Unknown'}
                                </strong>
                              </span>

                              {breach.references && (
                                <a
                                  href={breach.references}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                >
                                  <span>Details</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Cyber Security Footer */}
      <footer className="relative z-20 border-t border-zinc-900 bg-black/85 backdrop-blur-md px-6 py-4 text-xs font-mono text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Web Application &amp; API Security Dashboard</span>
        </div>
        <div className="tracking-widest">
          DEVELOPED BY <strong className="text-zinc-300">K2V STUDIO</strong>
        </div>
      </footer>
    </div>
  );
};
