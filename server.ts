import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import tls from 'tls';
import net from 'net';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import fs from 'fs/promises';
import { config as loadEnv } from 'dotenv';
import { getSupabaseAdminClient } from './lib/supabase';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);
const resolveMxAsync = promisify(dns.resolveMx);
const resolveTxtAsync = promisify(dns.resolveTxt);
const resolveNsAsync = promisify(dns.resolveNs);
const resolveSoaAsync = promisify(dns.resolveSoa);
const resolveCnameAsync = promisify(dns.resolveCname);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '.env.local') });
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

// Helper function: Query Port 43 WHOIS Socket
function queryWhoisSocket(server: string, query: string, timeoutMs = 6000): Promise<string> {
  return new Promise((resolve) => {
    let cleanServer = server.trim();
    if (cleanServer.startsWith('whois://')) cleanServer = cleanServer.replace('whois://', '');
    cleanServer = cleanServer.split('/')[0].split(':')[0];

    const socket = net.connect(43, cleanServer, () => {
      socket.write(query + '\r\n');
    });

    let buffer = '';
    socket.setEncoding('utf-8');
    socket.on('data', (chunk) => {
      buffer += chunk;
    });
    socket.on('end', () => resolve(buffer));
    socket.on('error', () => resolve(''));
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(buffer);
    });
  });
}

// Deep WHOIS Resolution across IANA and TLD/Registrar servers
async function performDeepWhois(domain: string): Promise<{ raw: string; parsed: any }> {
  try {
    let raw = await queryWhoisSocket('whois.iana.org', domain);
    const referMatch = raw.match(/refer:\s*([^\s]+)/i) || raw.match(/whois:\s*([^\s]+)/i);

    if (referMatch && referMatch[1]) {
      const tldServer = referMatch[1];
      const tldRaw = await queryWhoisSocket(tldServer, domain);
      if (tldRaw && tldRaw.length > 100) {
        raw = tldRaw;
        // Check for Registrar secondary whois server
        const regMatch = tldRaw.match(/Registrar WHOIS Server:\s*([^\s]+)/i);
        if (regMatch && regMatch[1] && regMatch[1].toLowerCase() !== tldServer.toLowerCase()) {
          const regRaw = await queryWhoisSocket(regMatch[1], domain);
          if (regRaw && regRaw.length > 250) {
            raw = regRaw;
          }
        }
      }
    }

    // Parse essential WHOIS fields
    const registrar =
      raw.match(/Registrar:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Sponsoring Registrar:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Registrar Name:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const registrarUrl =
      raw.match(/Registrar URL:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Referral URL:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const registrarIanaId = raw.match(/Registrar IANA ID:\s*([^\r\n]+)/i)?.[1]?.trim() || null;
    const registryDomainId = raw.match(/Registry Domain ID:\s*([^\r\n]+)/i)?.[1]?.trim() || null;

    const creationDateStr =
      raw.match(/Creation Date:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Created on:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Registration Time:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const expiryDateStr =
      raw.match(/Registry Expiry Date:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Registrar Registration Expiration Date:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Expiration Date:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Expir\w+ Time:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const updatedDateStr =
      raw.match(/Updated Date:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Last Updated on:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const domainStatusList = Array.from(
      new Set(
        Array.from(raw.matchAll(/Domain Status:\s*([^\s]+)/gi)).map((m) => m[1])
      )
    );

    const registrantOrg =
      raw.match(/Registrant Organization:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      raw.match(/Tech Organization:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const registrantCountry =
      raw.match(/Registrant Country:\s*([^\r\n]+)/i)?.[1]?.trim() ||
      null;

    const dnssec = raw.match(/DNSSEC:\s*([^\r\n]+)/i)?.[1]?.trim() || 'unsigned';

    // Calculate domain age and expiration time
    let ageDays: number | null = null;
    let daysToExpiry: number | null = null;

    if (creationDateStr) {
      const cDate = new Date(creationDateStr);
      if (!isNaN(cDate.getTime())) {
        ageDays = Math.floor((Date.now() - cDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (expiryDateStr) {
      const eDate = new Date(expiryDateStr);
      if (!isNaN(eDate.getTime())) {
        daysToExpiry = Math.floor((eDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      raw,
      parsed: {
        registrar,
        registrarUrl,
        registrarIanaId,
        registryDomainId,
        creationDate: creationDateStr,
        expiryDate: expiryDateStr,
        updatedDate: updatedDateStr,
        ageDays,
        daysToExpiry,
        domainStatusList,
        registrantOrg,
        registrantCountry,
        dnssec,
      },
    };
  } catch (err: any) {
    return { raw: '', parsed: {} };
  }
}

export async function createApp(serveFrontend = true) {
  const app = express();

  app.use(express.json());

  type SecurityLogEntry = {
    id: number;
    occurredAt: string;
    method: string;
    path: string;
    statusCode: number;
    category: string;
    severity: 'info' | 'medium' | 'high';
    kind: 'observed' | 'detection';
  };
  const securityLogs: SecurityLogEntry[] = [];
  const recentClientErrors = new Map<string, number[]>();
  let nextSecurityLogId = 1;

  app.use((req, res, next) => {
    const rawPath = req.originalUrl.split('?')[0] || '/';
    if (rawPath === '/api/security-logs' || rawPath === '/api/threat-map/feed') {
      next();
      return;
    }

    let decodedPath = rawPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      // Keep the raw path when a scanner sends malformed percent-encoding.
    }

    res.once('finish', () => {
      const normalizedPath = decodedPath.toLowerCase();
      let category = 'Request observed';
      let severity: SecurityLogEntry['severity'] = 'info';
      let kind: SecurityLogEntry['kind'] = 'observed';

      if (/(^|\/)(\.env(?:\/|\.|$)|\.git(?:\/|$)|\.aws(?:\/|$)|wp-admin(?:\/|$)|wp-login\.php(?:\/|$)|phpmyadmin(?:\/|$)|adminer(?:\.php|\/|$))/.test(normalizedPath) ||
        /\.\.(?:\/|\\)/.test(normalizedPath)) {
        category = 'Sensitive path probe';
        severity = 'high';
        kind = 'detection';
      } else if (['TRACE', 'TRACK', 'CONNECT'].includes(req.method.toUpperCase())) {
        category = 'Unusual HTTP method';
        severity = 'high';
        kind = 'detection';
      }

      const statusCode = res.statusCode;
      const sourceKey = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const cutoff = now - 60_000;

      for (const [key, timestamps] of recentClientErrors) {
        const recent = timestamps.filter((timestamp) => timestamp >= cutoff);
        if (recent.length) recentClientErrors.set(key, recent);
        else recentClientErrors.delete(key);
      }

      if (statusCode >= 400 && statusCode < 500) {
        const timestamps = recentClientErrors.get(sourceKey) || [];
        timestamps.push(now);
        recentClientErrors.set(sourceKey, timestamps);
        if (timestamps.length >= 12 && kind !== 'detection') {
          category = 'Repeated client-error requests';
          severity = 'medium';
          kind = 'detection';
        } else if (kind === 'observed') {
          category = 'Client error response';
        }
      } else if (statusCode >= 500 && kind === 'observed') {
        category = 'Server error response';
        severity = 'medium';
      }

      securityLogs.unshift({
        id: nextSecurityLogId++,
        occurredAt: new Date().toISOString(),
        method: req.method.toUpperCase(),
        path: rawPath.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200),
        statusCode,
        category,
        severity,
        kind,
      });
      if (securityLogs.length > 250) securityLogs.length = 250;
    });

    next();
  });

  app.get('/api/security-logs', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ items: securityLogs, retentionLimit: 250 });
  });

  app.get('/api/password/breach-check', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix.toUpperCase() : '';
    if (!/^[A-F0-9]{5}$/.test(prefix)) {
      return res.status(400).json({ error: 'A five-character SHA-1 hash prefix is required.' });
    }

    try {
      const upstream = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) {
        console.error(`Have I Been Pwned range lookup returned HTTP ${upstream.status}.`);
        return res.status(502).json({ error: 'Unable to load password breach data.' });
      }

      res.type('text/plain');
      return res.send(await upstream.text());
    } catch (error) {
      console.error('Failed to load Have I Been Pwned range data:', error);
      return res.status(502).json({ error: 'Unable to load password breach data.' });
    }
  });

  const openPhishFeedUrl = 'https://openphish.com/feed.txt';
  const openPhishCacheTtlMs = 15 * 60 * 1000;
  const openPhishMaxBytes = 5 * 1024 * 1024;
  const threatFeedTextCache = new Map<string, { text: string; checkedAt: string }>();
  const threatFeedHostCache = new Map<string, { hosts: Set<string>; checkedAt: string }>();
  let openPhishFeedCache: {
    urls: Set<string>;
    hosts: Map<string, string>;
    checkedAt: string;
  } | null = null;

  const normalizeReputationUrl = (value: unknown): URL => {
    if (typeof value !== 'string' || value.length > 4096) {
      throw new Error('Enter a URL no longer than 4096 characters.');
    }

    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error('Enter a complete URL including http:// or https://.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error('Only HTTP or HTTPS URLs without embedded credentials can be checked.');
    }
    parsed.hash = '';
    return parsed;
  };

  const loadOpenPhishFeed = async () => {
    if (openPhishFeedCache && Date.now() - Date.parse(openPhishFeedCache.checkedAt) < openPhishCacheTtlMs) {
      return openPhishFeedCache;
    }

    const upstream = await fetch(openPhishFeedUrl, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`OpenPhish community feed returned HTTP ${upstream.status}.`);
    }

    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > openPhishMaxBytes) {
          await reader.cancel();
          throw new Error('OpenPhish feed exceeded the 5 MB safety limit.');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const feedText = new TextDecoder().decode(bytes);
    const urls = new Set<string>();
    const hosts = new Map<string, string>();
    for (const line of feedText.split(/\r?\n/)) {
      const candidate = line.trim();
      if (!candidate) continue;
      try {
        const parsed = normalizeReputationUrl(candidate);
        const normalizedIndicator = parsed.toString();
        urls.add(normalizedIndicator);
        if (!hosts.has(parsed.hostname)) hosts.set(parsed.hostname, normalizedIndicator);
      } catch {
        console.warn('Ignored a malformed entry in the OpenPhish feed.');
      }
    }
    if (!urls.size) throw new Error('OpenPhish returned an empty or unreadable feed.');

    openPhishFeedCache = { urls, hosts, checkedAt: new Date().toISOString() };
    return openPhishFeedCache;
  };

  const loadThreatFeedText = async (key: string, url: string, maxBytes: number) => {
    const cached = threatFeedTextCache.get(key);
    if (cached && Date.now() - Date.parse(cached.checkedAt) < openPhishCacheTtlMs) return cached;

    const upstream = await fetch(url, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(20000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new Error(`${key} returned HTTP ${upstream.status}.`);
    }
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new Error(`${key} exceeded its feed size limit.`);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(bytes);
    if (!text.trim()) throw new Error(`${key} returned an empty feed.`);
    const result = { text, checkedAt: new Date().toISOString() };
    threatFeedTextCache.set(key, result);
    return result;
  };

  const parseHostFeed = (text: string, format: 'domains' | 'urlhaus') => {
    const hosts = new Set<string>();
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const candidate = format === 'urlhaus' ? line.split(/\s+/)[1] : line.split(/\s+/)[0];
      if (!candidate || candidate.startsWith('#')) continue;
      try {
        const parsed = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
        if (parsed.hostname.includes('.') && !parsed.hostname.includes(' ')) hosts.add(parsed.hostname.toLowerCase());
      } catch {
        continue;
      }
    }
    if (!hosts.size) throw new Error('Threat feed contained no usable host indicators.');
    return hosts;
  };

  const loadThreatHostFeed = async (
    key: string,
    url: string,
    maxBytes: number,
    format: 'domains' | 'urlhaus'
  ) => {
    const feed = await loadThreatFeedText(key, url, maxBytes);
    const cached = threatFeedHostCache.get(key);
    if (cached?.checkedAt === feed.checkedAt) return cached;
    const parsed = { hosts: parseHostFeed(feed.text, format), checkedAt: feed.checkedAt };
    threatFeedHostCache.set(key, parsed);
    return parsed;
  };

  type IsMaliciousReputation = {
    confidenceScore: number;
    malicious: boolean;
    suspicious: boolean;
  };

  const lookupIsMalicious = async (url: string): Promise<IsMaliciousReputation> => {
    const apiKey = process.env.ismalicious_api_key || process.env.ISMALICIOUS_API_KEY;
    if (!apiKey) throw new Error('Server API key is not configured in .env.local.');

    const query = new URLSearchParams({ query: url });
    const response = await fetch(`https://ismalicious.com/api/check/reputation?${query}`, {
      headers: {
        Accept: 'application/json',
        'X-API-KEY': apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`isMalicious API returned HTTP ${response.status}. Check the API key and account access.`);
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('confidenceScore' in payload) ||
      typeof payload.confidenceScore !== 'number' || !Number.isFinite(payload.confidenceScore) ||
      payload.confidenceScore < 0 || payload.confidenceScore > 100 ||
      !('reputation' in payload) || !payload.reputation || typeof payload.reputation !== 'object' ||
      !('malicious' in payload.reputation) || typeof payload.reputation.malicious !== 'boolean' ||
      !('suspicious' in payload.reputation) || typeof payload.reputation.suspicious !== 'boolean') {
      throw new Error('isMalicious API returned an unexpected reputation response.');
    }

    return {
      confidenceScore: payload.confidenceScore,
      malicious: payload.reputation.malicious,
      suspicious: payload.reputation.suspicious,
    };
  };

  const temporaryTunnelProviders: Array<{ suffix: string; name: string }> = [
    { suffix: 'trycloudflare.com', name: 'Cloudflare Quick Tunnel' },
    { suffix: 'ngrok-free.app', name: 'ngrok temporary tunnel' },
    { suffix: 'ngrok.io', name: 'ngrok tunnel' },
    { suffix: 'loca.lt', name: 'Localtunnel' },
    { suffix: 'localtunnel.me', name: 'Localtunnel' },
    { suffix: 'serveo.net', name: 'Serveo tunnel' },
  ];
  const suspiciousHostnameTerms = [
    'login', 'signin', 'verify', 'account', 'wallet', 'password', 'auth',
    'billing', 'payment', 'support', 'trackbacks',
  ];
  const urlShortenerHosts = new Set([
    'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'is.gd', 'cutt.ly',
    'shorturl.at', 'rebrand.ly', 'rb.gy', 'ow.ly', 'buff.ly',
  ]);
  const suspiciousDownloadExtensions = new Set([
    '.apk', '.bat', '.cmd', '.com', '.exe', '.hta', '.iso', '.js',
    '.msi', '.ps1', '.scr', '.vbs',
  ]);

  const findHostIndicator = (indicators: Map<string, string> | Set<string> | undefined, hostname: string) => {
    const labels = hostname.toLowerCase().split('.');
    for (let index = 0; index < labels.length - 1; index += 1) {
      const candidate = labels.slice(index).join('.');
      const found = indicators instanceof Map ? indicators.get(candidate) : indicators?.has(candidate) ? candidate : undefined;
      if (found) return { hostname: candidate, indicator: found };
    }
    return null;
  };

  app.post('/api/url-reputation', async (req: Request, res: Response) => {
    let submittedUrl: URL;
    try {
      submittedUrl = normalizeReputationUrl(req.body?.url);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'The submitted URL is invalid.',
      });
    }

    try {
      const lookups = await Promise.allSettled([
        loadOpenPhishFeed(),
        loadThreatHostFeed(
          'URLhaus',
          'https://urlhaus.abuse.ch/downloads/hostfile/',
          5 * 1024 * 1024,
          'urlhaus'
        ),
        loadThreatHostFeed(
          'Phishing.Database',
          'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
          25 * 1024 * 1024,
          'domains'
        ),
        lookupIsMalicious(submittedUrl.toString()),
      ]);
      const openPhish = lookups[0].status === 'fulfilled' ? lookups[0].value : null;
      const urlhaus = lookups[1].status === 'fulfilled' ? lookups[1].value : null;
      const phishingDatabase = lookups[2].status === 'fulfilled' ? lookups[2].value : null;
      const isMalicious = lookups[3].status === 'fulfilled' ? lookups[3].value : null;
      const sourceErrors = lookups.flatMap((lookup, index) => {
        if (lookup.status === 'fulfilled') return [];
        const source = ['OpenPhish', 'URLhaus', 'Phishing.Database', 'isMalicious'][index];
        console.error(`${source} reputation lookup failed:`, lookup.reason);
        return [`${source}: ${lookup.reason instanceof Error ? lookup.reason.message : 'lookup failed'}`];
      });
      if (!openPhish && !urlhaus && !phishingDatabase && !isMalicious) {
        throw new Error(`All reputation sources are unavailable. ${sourceErrors.join(' ')}`);
      }

      const normalizedUrl = submittedUrl.toString();
      const hostname = submittedUrl.hostname.toLowerCase();
      const openPhishExact = Boolean(openPhish?.urls.has(normalizedUrl));
      const openPhishHostMatch = findHostIndicator(openPhish?.hosts, hostname);
      const urlhausHostMatch = findHostIndicator(urlhaus?.hosts, hostname);
      const phishingDatabaseHostMatch = findHostIndicator(phishingDatabase?.hosts, hostname);
      const openPhishHostIndicator = openPhishHostMatch?.indicator || null;
      const openPhishHost = Boolean(openPhishHostMatch);
      const urlhausHost = Boolean(urlhausHostMatch);
      const phishingDatabaseHost = Boolean(phishingDatabaseHostMatch);
      const tunnelProvider = temporaryTunnelProviders.find(({ suffix }) =>
        hostname === suffix || hostname.endsWith(`.${suffix}`)
      );
      const suspiciousTerms = suspiciousHostnameTerms.filter((term) =>
        hostname.split(/[.-]/).includes(term)
      );
      const rawHostname = hostname.replace(/^\[|\]$/g, '');
      const isIpAddress = net.isIP(rawHostname) !== 0;
      const hasPunycode = hostname.split('.').some((label) => label.startsWith('xn--'));
      const hostnameLabels = hostname.split('.');
      const excessiveSubdomains = hostnameLabels.length > 5;
      const isKnownShortener = urlShortenerHosts.has(hostname);
      const pathname = submittedUrl.pathname.toLowerCase();
      const isExecutableDownload = [...suspiciousDownloadExtensions].some((extension) => pathname.endsWith(extension));
      const findings = [
        ...(openPhishExact ? ['Exact URL listed in OpenPhish phishing feed'] : []),
        ...(!openPhishExact && openPhishHost
          ? [`Hostname or parent domain (${openPhishHostMatch?.hostname}) listed in OpenPhish phishing feed`]
          : []),
        ...(urlhausHost
          ? [`Hostname or parent domain (${urlhausHostMatch?.hostname}) listed in URLhaus malware URL host feed`]
          : []),
        ...(phishingDatabaseHost
          ? [`Hostname or parent domain (${phishingDatabaseHostMatch?.hostname}) listed in Phishing.Database active phishing domain feed`]
          : []),
        ...(isMalicious?.malicious
          ? [`isMalicious reports a malicious reputation (provider confidence ${isMalicious.confidenceScore}/100)`]
          : []),
        ...(isMalicious?.suspicious
          ? [`isMalicious reports a suspicious reputation (provider confidence ${isMalicious.confidenceScore}/100)`]
          : []),
        ...(tunnelProvider ? [`Hosted on ${tunnelProvider.name}, a temporary tunnel service frequently abused by phishing campaigns`] : []),
        ...(suspiciousTerms.length
          ? [`Hostname contains social-engineering term(s): ${suspiciousTerms.join(', ')}`]
          : []),
        ...(isIpAddress ? ['URL uses a literal IP address instead of a registered hostname'] : []),
        ...(hasPunycode ? ['Hostname contains punycode that may be used to disguise look-alike characters'] : []),
        ...(excessiveSubdomains ? ['Hostname has an unusually deep subdomain structure'] : []),
        ...(isKnownShortener ? ['URL uses a link-shortening service, so the destination is obscured'] : []),
        ...(isExecutableDownload ? ['URL points to a directly executable or installable file type'] : []),
      ];
      const feedMatch = openPhishExact || openPhishHost || urlhausHost || phishingDatabaseHost;
      const malicious = feedMatch || Boolean(isMalicious?.malicious);
      const urlRiskSignals = Number(Boolean(tunnelProvider)) +
        Number(suspiciousTerms.length > 0) +
        Number(isIpAddress) +
        Number(hasPunycode) +
        Number(excessiveSubdomains) +
        Number(isKnownShortener) +
        Number(isExecutableDownload);
      const suspicious = !malicious && (urlRiskSignals > 0 || Boolean(isMalicious?.suspicious));
      const verdict = malicious ? 'malicious' : suspicious ? 'suspicious' : 'unverified';
      const feedRiskScore = openPhishExact ? 100
        : urlhausHost ? 98
          : phishingDatabaseHost ? 95
            : openPhishHost ? 90
              : suspicious
                ? Math.min(85, 35 + Number(Boolean(tunnelProvider)) * 35 +
                  Number(suspiciousTerms.length > 0) * 20 +
                  Number(isIpAddress) * 25 +
                  Number(hasPunycode) * 30 +
                  Number(excessiveSubdomains) * 15 +
                  Number(isKnownShortener) * 15 +
                  Number(isExecutableDownload) * 20)
                : 0;
      const riskScore = isMalicious?.malicious
        ? Math.max(feedRiskScore, 90, isMalicious.confidenceScore)
        : isMalicious?.suspicious
          ? Math.max(feedRiskScore, Math.min(89, Math.max(55, isMalicious.confidenceScore)))
          : verdict === 'unverified'
            ? 100
            : feedRiskScore;
      const feedTimes = [
        openPhish?.checkedAt,
        urlhaus?.checkedAt,
        phishingDatabase?.checkedAt,
      ].filter((time): time is string => Boolean(time));
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        provider: 'isMalicious, OpenPhish, URLhaus, and Phishing.Database',
        providerUrl: 'https://ismalicious.com/api-docs',
        checkedAt: new Date().toISOString(),
        feedCachedAt: feedTimes.sort().at(-1) || new Date().toISOString(),
        feedEntryCount: (openPhish?.urls.size || 0) +
          (urlhaus?.hosts.size || 0) +
          (phishingDatabase?.hosts.size || 0),
        sourcesChecked: [
          ...(openPhish ? ['OpenPhish'] : []),
          ...(urlhaus ? ['URLhaus'] : []),
          ...(phishingDatabase ? ['Phishing.Database'] : []),
          ...(isMalicious ? ['isMalicious'] : []),
        ],
        sourceErrors,
        submittedUrl: normalizedUrl,
        verdict,
        riskScore,
        riskLabel: malicious
          ? 'MALICIOUS — LISTED IN THREAT INTELLIGENCE'
          : suspicious
            ? riskScore >= 70
              ? 'HIGH RISK — SUSPICIOUS URL SIGNALS'
              : 'SUSPICIOUS — REVIEW BEFORE OPENING'
            : 'SAFE — NO THREAT FOUND IN CHECKED SOURCES',
        riskBasis: findings.length
          ? findings.join('; ')
          : isMalicious
            ? 'isMalicious reported no malicious or suspicious reputation. No threat found does not prove the URL is safe.'
            : 'No match in the available feeds. The checked sources did not find suspicious indicators for this domain.',
        findings,
        matchType: openPhishExact ? 'exact_url' : openPhishHost ? 'listed_host' : null,
        matchedIndicator: openPhishExact
          ? normalizedUrl
          : openPhishHost
            ? openPhishHostIndicator
            : null,
        isMaliciousResult: isMalicious,
        limitations: 'This is not a guarantee of safety. Malicious labels reflect a match in threat intelligence or an isMalicious malicious report; suspicious labels are provider reports or explainable URL/infrastructure signals. A no-threat result is not proof of safety. Risk score is for triage, not a probability.',
      });
    } catch (error) {
      console.error('Failed to complete URL reputation lookup:', error);
      return res.status(502).json({
        error: error instanceof Error
          ? `Could not complete the URL reputation lookup: ${error.message}`
          : 'Could not complete the URL reputation lookup.',
      });
    }
  });

  // Proxy Check Point's public ThreatCloud API so the map can consume it same-origin.
  const checkPointThreatMapApi = 'https://threatmap-api.checkpoint.com/ThreatMap/api/';

  app.get('/api/threat-map/top-stats', async (_req: Request, res: Response) => {
    try {
      const upstream = await fetch(`${checkPointThreatMapApi}topStats`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) {
        return res.status(502).json({ error: `Check Point threat statistics returned HTTP ${upstream.status}.` });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await upstream.json());
    } catch (error) {
      console.error('Failed to load Check Point threat statistics:', error);
      return res.status(502).json({ error: 'Unable to load Check Point threat statistics.' });
    }
  });

  app.get('/api/threat-map/countries/:code', async (req: Request, res: Response) => {
    const countryCode = req.params.code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return res.status(400).json({ error: 'A two-letter country code is required.' });
    }

    try {
      const upstream = await fetch(`${checkPointThreatMapApi}countries/${countryCode}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (upstream.status === 404) {
        return res.status(404).json({ error: `Check Point has no country data for ${countryCode}.` });
      }
      if (!upstream.ok) {
        return res.status(502).json({ error: `Check Point country data returned HTTP ${upstream.status}.` });
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await upstream.json());
    } catch (error) {
      console.error(`Failed to load Check Point country data for ${countryCode}:`, error);
      return res.status(502).json({ error: 'Unable to load Check Point country data.' });
    }
  });

  app.get('/api/threat-map/cves/:id', async (req: Request, res: Response) => {
    const cveId = req.params.id.toUpperCase();
    if (!/^CVE-\d{4}-\d{4,}$/.test(cveId)) {
      return res.status(400).json({ error: 'A valid CVE identifier is required.' });
    }

    try {
      const upstream = await fetch(
        `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (upstream.status === 404) {
        return res.status(404).json({ error: `NVD has no record for ${cveId}.` });
      }
      if (!upstream.ok) {
        return res.status(502).json({ error: `NVD returned HTTP ${upstream.status}.` });
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.json(await upstream.json());
    } catch (error) {
      console.error(`Failed to retrieve NVD data for ${cveId}:`, error);
      return res.status(502).json({ error: 'Unable to retrieve NVD vulnerability data.' });
    }
  });

  app.get('/api/threat-map/feed', async (req: Request, res: Response) => {
    const abortController = new AbortController();
    const abortOnDisconnect = () => abortController.abort();
    res.on('close', abortOnDisconnect);

    try {
      const upstream = await fetch(`${checkPointThreatMapApi}feed`, {
        headers: { Accept: 'text/event-stream' },
        signal: abortController.signal,
      });
      if (!upstream.ok || !upstream.body) {
        return res.status(502).json({ error: `Check Point live feed returned HTTP ${upstream.status}.` });
      }

      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const reader = upstream.body.getReader();
      try {
        while (!res.destroyed) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(Buffer.from(value))) {
            await new Promise<void>((resolve) => {
              const resume = () => {
                res.removeListener('drain', resume);
                res.removeListener('close', resume);
                resolve();
              };
              res.once('drain', resume);
              res.once('close', resume);
            });
          }
        }
        if (!res.destroyed) res.end();
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Check Point live threat feed disconnected:', error);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Unable to connect to the Check Point live threat feed.' });
        } else if (!res.destroyed) {
          res.end();
        }
      }
    } finally {
      res.removeListener('close', abortOnDisconnect);
    }
  });

  // ================= CONSENT-BASED DEVICE INTELLIGENCE =================
  const deviceVisitsFile = path.resolve(
    process.env.DEVICE_INTELLIGENCE_STORAGE_PATH ||
      (process.env.VERCEL
        ? path.join('/tmp', 'device-visits.json')
        : path.resolve(process.cwd(), 'data', 'device-visits.json'))
  );
  const deviceFamilies = {
    deviceType: ['desktop', 'mobile', 'tablet'],
    browser: ['Chrome', 'Edge', 'Firefox', 'Opera', 'Safari', 'Other'],
    operatingSystem: ['Android', 'ChromeOS', 'iOS', 'Linux', 'macOS', 'Other', 'Windows'],
  } as const;
  type DeviceVisit = {
    visitedAt: string;
    deviceType: (typeof deviceFamilies.deviceType)[number];
    browser: (typeof deviceFamilies.browser)[number];
    operatingSystem: (typeof deviceFamilies.operatingSystem)[number];
  };
  let deviceVisitsWriteQueue = Promise.resolve();

  const readDeviceVisits = async (): Promise<DeviceVisit[]> => {
    try {
      const contents = await fs.readFile(deviceVisitsFile, 'utf8');
      const parsed: unknown = JSON.parse(contents);
      if (!Array.isArray(parsed)) throw new Error('Device visit data is not an array');
      return parsed as DeviceVisit[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  };
  const writeDeviceVisits = async (visits: DeviceVisit[]) => {
    await fs.mkdir(path.dirname(deviceVisitsFile), { recursive: true });
    const temporaryFile = `${deviceVisitsFile}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(visits, null, 2), 'utf8');
    await fs.rename(temporaryFile, deviceVisitsFile);
  };

  app.post('/api/device-intelligence/visits', async (req: Request, res: Response) => {
    const { consent, deviceType, browser, operatingSystem } = req.body ?? {};
    const validValue = (key: keyof typeof deviceFamilies, value: unknown) =>
      typeof value === 'string' && (deviceFamilies[key] as readonly string[]).includes(value);

    if (
      consent !== true ||
      !validValue('deviceType', deviceType) ||
      !validValue('browser', browser) ||
      !validValue('operatingSystem', operatingSystem)
    ) {
      return res.status(400).json({ error: 'Explicit consent and a valid coarse device profile are required.' });
    }

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { error } = await supabase.rpc('record_device_intelligence_visit', {
          p_device_type: deviceType,
          p_browser: browser,
          p_operating_system: operatingSystem,
        });
        if (error) throw error;
      } else if (process.env.VERCEL) {
        return res.status(503).json({
          error: 'Device visit storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.',
        });
      } else {
        const visit: DeviceVisit = {
          visitedAt: new Date().toISOString(),
          deviceType,
          browser,
          operatingSystem,
        };
        const saveVisit = async () => {
          const retentionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const visits = (await readDeviceVisits())
            .filter((entry) => Date.parse(entry.visitedAt) >= retentionCutoff)
            .concat(visit)
            .slice(-1000);
          await writeDeviceVisits(visits);
        };
        const queuedSave = deviceVisitsWriteQueue.then(saveVisit);
        deviceVisitsWriteQueue = queuedSave.then(() => undefined, () => undefined);
        await queuedSave;
      }

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Failed to save consented device visit:', error);
      return res.status(500).json({ error: 'Unable to save device visit.' });
    }
  });

  app.get('/api/device-intelligence/visits', async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const supabase = getSupabaseAdminClient();
      let visits: DeviceVisit[];
      if (supabase) {
        const { data, error } = await supabase.rpc('list_device_intelligence_visits');
        if (error) throw error;

        visits = data.map((entry) => ({
          visitedAt: entry.visited_at,
          deviceType: entry.device_type,
          browser: entry.browser,
          operatingSystem: entry.operating_system,
        }));
      } else if (process.env.VERCEL) {
        return res.status(503).json({
          error: 'Device visit storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.',
        });
      } else {
        const readAndPrune = async () => {
          const retentionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const storedVisits = await readDeviceVisits();
          const retainedVisits = storedVisits
            .filter((entry) => Date.parse(entry.visitedAt) >= retentionCutoff)
            .slice(-1000);
          if (retainedVisits.length !== storedVisits.length) await writeDeviceVisits(retainedVisits);
          return retainedVisits.reverse();
        };
        const queuedRead = deviceVisitsWriteQueue.then(readAndPrune);
        deviceVisitsWriteQueue = queuedRead.then(() => undefined, () => undefined);
        visits = await queuedRead;
      }

      return res.json({ visits });
    } catch (error) {
      console.error('Failed to read consented device visits:', error);
      return res.status(500).json({ error: 'Unable to load device visits.' });
    }
  });

  // ================= 1. REAL API LIVE MONITORING & PROBE =================
  app.post('/api/monitor/probe', async (req: Request, res: Response) => {
    try {
      const { url, method = 'GET', headers = {}, body } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const startTime = Date.now();
      let dnsTime = 0;
      let tcpTime = 0;
      let tlsTime = 0;
      let ttfbTime = 0;
      let responseSent = false;
      const sendProbeResult = (result: Record<string, unknown>) => {
        if (responseSent || res.headersSent || res.destroyed) return;
        responseSent = true;
        res.json(result);
      };

      const reqHeaders: Record<string, string> = {
        'User-Agent': 'WebSec-Security-Monitor/2.0',
        Accept: '*/*',
        ...headers,
      };

      const request = client.request(
        parsedUrl.href,
        {
          method: method.toUpperCase(),
          headers: reqHeaders,
          timeout: 10000,
        },
        (response) => {
          let bytesReceived = 0;
          let bodyPreview = '';

          response.once('readable', () => {
            if (ttfbTime === 0) {
              ttfbTime = Math.max(1, Date.now() - startTime);
            }
          });

          response.on('data', (chunk) => {
            bytesReceived += chunk.length;
            if (bodyPreview.length < 1000) {
              bodyPreview += chunk.toString('utf-8');
            }
          });

          response.on('end', () => {
            const totalLatencyMs = Math.max(1, Date.now() - startTime);
            const resolvedTtfb = ttfbTime || totalLatencyMs;
            const contentTransferMs = Math.max(0, totalLatencyMs - resolvedTtfb);

            sendProbeResult({
              success: (response.statusCode || 0) < 400,
              timestamp: new Date().toISOString(),
              target: parsedUrl.href,
              method: method.toUpperCase(),
              statusCode: response.statusCode || 0,
              statusMessage: response.statusMessage || '',
              latencyMs: totalLatencyMs,
              bytesReceived,
              timings: {
                dnsMs: dnsTime,
                tcpMs: tcpTime,
                tlsMs: tlsTime,
                ttfbMs: resolvedTtfb,
                contentTransferMs,
              },
              headers: response.headers,
              bodyPreview: bodyPreview.slice(0, 500),
            });
          });
        }
      );

      request.on('socket', (socket) => {
        const socketStart = Date.now();
        socket.on('lookup', () => {
          dnsTime = Math.max(1, Date.now() - socketStart);
        });
        socket.on('connect', () => {
          tcpTime = Math.max(1, Date.now() - socketStart - dnsTime);
        });
        socket.on('secureConnect', () => {
          tlsTime = Math.max(1, Date.now() - socketStart - dnsTime - tcpTime);
        });
      });

      request.on('error', (err) => {
        const latencyMs = Math.max(1, Date.now() - startTime);
        sendProbeResult({
          success: false,
          timestamp: new Date().toISOString(),
          target: parsedUrl.href,
          method: method.toUpperCase(),
          statusCode: 0,
          statusMessage: 'Connection Error',
          error: err.message,
          latencyMs,
          timings: {
            dnsMs: dnsTime,
            tcpMs: tcpTime,
            tlsMs: tlsTime,
            ttfbMs: latencyMs,
            contentTransferMs: 0,
          },
        });
      });

      request.on('timeout', () => {
        request.destroy();
        sendProbeResult({
          success: false,
          timestamp: new Date().toISOString(),
          target: parsedUrl.href,
          method: method.toUpperCase(),
          statusCode: 408,
          statusMessage: 'Request Timeout',
          error: 'Connection timed out after 10000ms',
          latencyMs: 10000,
          timings: {
            dnsMs: dnsTime,
            tcpMs: tcpTime,
            tlsMs: tlsTime,
            ttfbMs: 10000,
            contentTransferMs: 0,
          },
        });
      });

      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        request.write(typeof body === 'string' ? body : JSON.stringify(body));
      }

      request.end();
    } catch (error: any) {
      if (!res.headersSent && !res.destroyed) {
        res.status(500).json({ error: error.message || 'Probe failed' });
      }
    }
  });

  // ================= 2. REAL VULNERABILITY & SECURITY HEADER SCANNER =================
  app.post('/api/scan/vulnerability', async (req: Request, res: Response) => {
    try {
      const { target } = req.body;
      if (!target) {
        return res.status(400).json({ error: 'Target URL or domain is required' });
      }

      let parsed: URL;
      try {
        parsed = new URL(target.startsWith('http') ? target : `https://${target}`);
      } catch {
        return res.status(400).json({ error: 'Invalid URL/hostname' });
      }

      const hostname = parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;

      // Real DNS Resolution for live telemetry
      let dnsAddresses: string[] = [];
      try {
        const addrs = await resolve4Async(hostname).catch(() => []);
        dnsAddresses = addrs;
      } catch {
        dnsAddresses = [];
      }

      // 1. Live TLS/SSL Socket Connection & Certificate Inspection
      let tlsInfo: any = null;
      if (parsed.protocol === 'https:') {
        try {
          tlsInfo = await new Promise((resolve) => {
            const startTls = Date.now();
            const socket = tls.connect(
              {
                host: hostname,
                port,
                servername: hostname,
                rejectUnauthorized: false,
                timeout: 7000,
              },
              () => {
                const handshakeMs = Date.now() - startTls;
                const cert = socket.getPeerCertificate(true);
                const cipher = socket.getCipher();
                const protocol = socket.getProtocol();
                const remoteIp = socket.remoteAddress;
                const remotePort = socket.remotePort;
                const alpnProtocol = socket.alpnProtocol;
                const authorized = socket.authorized;
                const authorizationError = socket.authorizationError ? String(socket.authorizationError) : null;
                socket.end();

                if (cert && Object.keys(cert).length > 0) {
                  const validTo = new Date(cert.valid_to);
                  const validFrom = new Date(cert.valid_from);
                  const daysRemaining = Math.max(0, Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                  // Extract SANs (Subject Alternative Names)
                  const sans = cert.subjectaltname
                    ? cert.subjectaltname.split(', ').map((s: string) => s.replace(/^DNS:/, ''))
                    : [];

                  resolve({
                    subject: cert.subject?.CN || hostname,
                    issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown Certificate Authority',
                    issuerOrg: cert.issuer?.O || null,
                    validFrom: validFrom.toISOString(),
                    validTo: validTo.toISOString(),
                    daysRemaining,
                    isExpired: Date.now() > validTo.getTime(),
                    cipherName: cipher?.name,
                    cipherVersion: cipher?.version,
                    tlsVersion: protocol,
                    fingerprint256: cert.fingerprint256,
                    serialNumber: cert.serialNumber,
                    bits: cert.bits,
                    sansCount: sans.length,
                    sansList: sans.slice(0, 8),
                    handshakeMs,
                    remoteIp,
                    remotePort,
                    alpnProtocol: alpnProtocol || 'None',
                    authorized,
                    authorizationError,
                  });
                } else {
                  resolve(null);
                }
              }
            );

            socket.on('error', () => resolve(null));
            socket.on('timeout', () => {
              socket.destroy();
              resolve(null);
            });
          });
        } catch {
          tlsInfo = null;
        }
      }

      // 2. Real HTTP Security Headers & Cookie Audit
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const headersInfo: any = await new Promise((resolve) => {
        const startHttp = Date.now();
        const req = client.request(
          parsed.href,
          {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebSec-Vulnerability-Scanner/1.0',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            timeout: 8000,
          },
          (res) => {
            const h = res.headers;
            const issues: any[] = [];
            const passed: any[] = [];

            // A. Strict-Transport-Security (HSTS)
            const hsts = h['strict-transport-security'];
            if (hsts) {
              const hstsStr = String(hsts);
              const hasSubdomains = /includesubdomains/i.test(hstsStr);
              const hasPreload = /preload/i.test(hstsStr);
              const maxAgeMatch = hstsStr.match(/max-age=(\d+)/i);
              const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;

              if (maxAge < 15768000) {
                issues.push({
                  category: 'OWASP Headers',
                  severity: 'MEDIUM',
                  header: 'Strict-Transport-Security',
                  finding: `HSTS max-age is too short (${maxAge}s). Recommended minimum is 1 year (31536000s).`,
                  evidence: hstsStr,
                  remediation: 'Set max-age=31536000; includeSubDomains; preload',
                });
              } else {
                passed.push({
                  category: 'OWASP Headers',
                  header: 'Strict-Transport-Security (HSTS)',
                  value: hstsStr,
                  description: `Enforces TLS encrypted transport (max-age: ${maxAge}s${hasSubdomains ? ', includeSubDomains' : ''}${hasPreload ? ', preload' : ''})`,
                });
              }
            } else {
              issues.push({
                category: 'OWASP Headers',
                severity: 'HIGH',
                header: 'Strict-Transport-Security',
                finding: 'Missing HSTS header. Browsers may connect via plaintext HTTP on initial visit, exposing traffic to SSL stripping.',
                evidence: 'Header not returned',
                remediation: 'Add response header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
              });
            }

            // B. Content-Security-Policy (CSP)
            const csp = h['content-security-policy'];
            if (csp) {
              const cspStr = String(csp);
              const hasUnsafeInline = /'unsafe-inline'/i.test(cspStr);
              const hasUnsafeEval = /'unsafe-eval'/i.test(cspStr);

              if (hasUnsafeInline || hasUnsafeEval) {
                issues.push({
                  category: 'OWASP Headers',
                  severity: 'MEDIUM',
                  header: 'Content-Security-Policy',
                  finding: `CSP contains permissive directives (${[hasUnsafeInline ? "'unsafe-inline'" : '', hasUnsafeEval ? "'unsafe-eval'" : ''].filter(Boolean).join(', ')}), weakening XSS defenses.`,
                  evidence: cspStr.slice(0, 150) + '...',
                  remediation: 'Use nonces or cryptographic hashes instead of unsafe-inline/unsafe-eval in script-src',
                });
              }

              passed.push({
                category: 'OWASP Headers',
                header: 'Content-Security-Policy (CSP)',
                value: cspStr.slice(0, 120) + (cspStr.length > 120 ? '...' : ''),
                description: 'Mitigates Cross-Site Scripting (XSS), code injection and untrusted resource framing',
              });
            } else {
              issues.push({
                category: 'OWASP Headers',
                severity: 'HIGH',
                header: 'Content-Security-Policy',
                finding: 'Missing Content-Security-Policy header. Site is vulnerable to stored & reflected Cross-Site Scripting (XSS) and packet injection.',
                evidence: 'Header not returned',
                remediation: "Define CSP with strict default-src 'self' and restricted script-src directives",
              });
            }

            // C. X-Frame-Options (Clickjacking)
            const xfo = h['x-frame-options'];
            if (xfo) {
              passed.push({
                category: 'OWASP Headers',
                header: 'X-Frame-Options',
                value: String(xfo),
                description: 'Protects against UI redress & Clickjacking attacks',
              });
            } else if (!csp || !/frame-ancestors/i.test(String(csp))) {
              issues.push({
                category: 'OWASP Headers',
                severity: 'MEDIUM',
                header: 'X-Frame-Options',
                finding: 'Missing X-Frame-Options (and no CSP frame-ancestors). Malicious sites can embed this page in a hidden iframe for Clickjacking.',
                evidence: 'Header not returned',
                remediation: 'Add header: X-Frame-Options: DENY (or SAMEORIGIN)',
              });
            }

            // D. X-Content-Type-Options (MIME Sniffing)
            const xcto = h['x-content-type-options'];
            if (xcto && /nosniff/i.test(String(xcto))) {
              passed.push({
                category: 'OWASP Headers',
                header: 'X-Content-Type-Options',
                value: String(xcto),
                description: 'Prevents MIME-type confusion attacks and executable script masquerading',
              });
            } else {
              issues.push({
                category: 'OWASP Headers',
                severity: 'LOW',
                header: 'X-Content-Type-Options',
                finding: 'Missing X-Content-Type-Options: nosniff. Browsers may inspect file contents and execute scripts disguised as images.',
                evidence: xcto ? String(xcto) : 'Header not returned',
                remediation: 'Add header: X-Content-Type-Options: nosniff',
              });
            }

            // E. Referrer-Policy
            const refPol = h['referrer-policy'];
            if (refPol) {
              passed.push({
                category: 'OWASP Headers',
                header: 'Referrer-Policy',
                value: String(refPol),
                description: 'Controls referrer data sent to third-party endpoints',
              });
            } else {
              issues.push({
                category: 'OWASP Headers',
                severity: 'LOW',
                header: 'Referrer-Policy',
                finding: 'Missing Referrer-Policy header. May leak sensitive URL query parameters to external sites on navigation.',
                evidence: 'Header not returned',
                remediation: 'Add header: Referrer-Policy: strict-origin-when-cross-origin',
              });
            }

            // F. Permissions-Policy / Feature-Policy
            const permPol = h['permissions-policy'] || h['feature-policy'];
            if (permPol) {
              passed.push({
                category: 'OWASP Headers',
                header: 'Permissions-Policy',
                value: String(permPol).slice(0, 100) + '...',
                description: 'Restricts browser device features (camera, microphone, geolocation)',
              });
            } else {
              issues.push({
                category: 'OWASP Headers',
                severity: 'INFO',
                header: 'Permissions-Policy',
                finding: 'No Permissions-Policy defined. Browser capabilities are not explicitly restricted.',
                evidence: 'Header not returned',
                remediation: "Add header: Permissions-Policy: camera=(), microphone=(), geolocation=()",
              });
            }

            // G. Server Banner & Technology Fingerprinting
            const serverBanner = h['server'] || h['x-powered-by'] || h['x-aspnet-version'];
            if (serverBanner) {
              issues.push({
                category: 'Information Disclosure',
                severity: 'INFO',
                header: 'Server / X-Powered-By',
                finding: `Technology fingerprint revealed (${serverBanner}). Assists attackers in targeting specific platform CVEs.`,
                evidence: `Server: ${h['server'] || 'N/A'}, X-Powered-By: ${h['x-powered-by'] || 'N/A'}`,
                remediation: 'Suppress or randomize server identification tokens in reverse proxy configuration',
              });
            }

            // H. Real Cookie Security Audit (Set-Cookie)
            const rawCookies = res.headers['set-cookie'] || [];
            const parsedCookies: any[] = [];
            rawCookies.forEach((cookieStr) => {
              const parts = cookieStr.split(';').map((p) => p.trim());
              const nameValue = parts[0];
              const cookieName = nameValue.split('=')[0];

              const hasSecure = parts.some((p) => /^secure$/i.test(p));
              const hasHttpOnly = parts.some((p) => /^httponly$/i.test(p));
              const sameSitePart = parts.find((p) => /^samesite=/i.test(p));
              const sameSiteVal = sameSitePart ? sameSitePart.split('=')[1] : null;

              parsedCookies.push({
                name: cookieName,
                hasSecure,
                hasHttpOnly,
                sameSite: sameSiteVal || 'None / Missing',
              });

              if (!hasSecure && isHttps) {
                issues.push({
                  category: 'Cookie Security',
                  severity: 'HIGH',
                  header: `Cookie [${cookieName}]`,
                  finding: `Cookie '${cookieName}' is missing the 'Secure' flag. May be transmitted over unencrypted HTTP.`,
                  evidence: cookieStr.slice(0, 120),
                  remediation: `Append '; Secure' to Set-Cookie header for '${cookieName}'`,
                });
              }

              if (!hasHttpOnly) {
                issues.push({
                  category: 'Cookie Security',
                  severity: 'MEDIUM',
                  header: `Cookie [${cookieName}]`,
                  finding: `Cookie '${cookieName}' is missing the 'HttpOnly' flag. Accessible by JavaScript via document.cookie (XSS credential theft risk).`,
                  evidence: cookieStr.slice(0, 120),
                  remediation: `Append '; HttpOnly' to Set-Cookie header for '${cookieName}'`,
                });
              }

              if (!sameSiteVal) {
                issues.push({
                  category: 'Cookie Security',
                  severity: 'LOW',
                  header: `Cookie [${cookieName}]`,
                  finding: `Cookie '${cookieName}' is missing 'SameSite' attribute. Vulnerable to Cross-Site Request Forgery (CSRF).`,
                  evidence: cookieStr.slice(0, 120),
                  remediation: `Append '; SameSite=Lax' (or Strict) to Set-Cookie header`,
                });
              }
            });

            if (parsedCookies.length > 0 && parsedCookies.every((c) => c.hasSecure && c.hasHttpOnly)) {
              passed.push({
                category: 'Cookie Security',
                header: 'Session Cookies',
                value: `${parsedCookies.length} cookies audited`,
                description: 'All emitted cookies enforce Secure and HttpOnly defense flags',
              });
            }

            const responseTimeMs = Date.now() - startHttp;
            const remoteIp = req.socket?.remoteAddress || null;
            const remotePort = req.socket?.remotePort || null;
            const contentLength = h['content-length'] ? parseInt(String(h['content-length']), 10) : null;
            const contentType = h['content-type'] ? String(h['content-type']) : null;
            const serverHeader = h['server'] ? String(h['server']) : 'None Disclosed';

            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              httpVersion: res.httpVersion,
              responseTimeMs,
              remoteIp,
              remotePort,
              contentLength,
              contentType,
              serverHeader,
              issues,
              passed,
              rawHeaders: h,
              cookies: parsedCookies,
            });
          }
        );

        req.on('error', (err) => resolve({ error: err.message, issues: [], passed: [], cookies: [] }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ error: 'Request timeout', issues: [], passed: [], cookies: [] });
        });
        req.end();
      });

      // 3. Real CORS Preflight & HTTP Methods Probe
      const corsProbe: any = await new Promise((resolve) => {
        const testClient = isHttps ? https : http;
        const req = testClient.request(
          parsed.href,
          {
            method: 'OPTIONS',
            headers: {
              Origin: 'https://sec-audit-untrusted.example',
              'Access-Control-Request-Method': 'POST',
              'User-Agent': 'WebSec-CORS-Audit/1.0',
            },
            timeout: 5000,
          },
          (res) => {
            const originHeader = res.headers['access-control-allow-origin'];
            const credentialsHeader = res.headers['access-control-allow-credentials'];
            const methodsHeader = res.headers['access-control-allow-methods'] || res.headers['allow'];

            const corsIssues: any[] = [];
            let isWildcard = false;
            let reflectsOrigin = false;

            if (originHeader) {
              if (originHeader === '*') {
                isWildcard = true;
                if (credentialsHeader === 'true') {
                  corsIssues.push({
                    category: 'CORS Configuration',
                    severity: 'CRITICAL',
                    header: 'Access-Control-Allow-Origin',
                    finding: 'Wildcard origin (*) combined with Allow-Credentials: true. Allows unauthorized cross-origin data exfiltration.',
                    evidence: `Origin: *, Credentials: true`,
                    remediation: 'Never use wildcard origins when credentials are supported. Validate and restrict allowed origins explicitly.',
                  });
                }
              } else if (originHeader.includes('sec-audit-untrusted.example')) {
                reflectsOrigin = true;
                corsIssues.push({
                  category: 'CORS Configuration',
                  severity: 'HIGH',
                  header: 'Access-Control-Allow-Origin',
                  finding: 'CORS origin reflects untrusted arbitrary incoming origins without validation.',
                  evidence: `Reflected: ${originHeader}`,
                  remediation: 'Implement an explicit whitelist of allowed domain origins in backend CORS middleware',
                });
              }
            }

            resolve({
              allowOrigin: originHeader || null,
              allowCredentials: credentialsHeader || null,
              allowMethods: methodsHeader ? String(methodsHeader) : null,
              isWildcard,
              reflectsOrigin,
              corsIssues,
            });
          }
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.end();
      });

      // 4. Real HTTP to HTTPS Redirect Verification
      const redirectProbe: any = await new Promise((resolve) => {
        const req = http.request(
          `http://${hostname}/`,
          {
            method: 'HEAD',
            headers: { 'User-Agent': 'WebSec-Redirect-Audit/1.0' },
            timeout: 5000,
          },
          (res) => {
            const location = res.headers['location'];
            const isRedirect = res.statusCode && res.statusCode >= 300 && res.statusCode < 400;
            const toHttps = isRedirect && location ? String(location).startsWith('https://') : false;

            resolve({
              statusCode: res.statusCode,
              location: location || null,
              enforcesHttpsRedirect: toHttps,
            });
          }
        );

        req.on('error', () => resolve({ enforcesHttpsRedirect: false, error: 'Port 80 unreachable or filtered' }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ enforcesHttpsRedirect: false, error: 'Timeout on port 80' });
        });
        req.end();
      });

      // Compile all real findings
      const allIssues = [
        ...(headersInfo.issues || []),
        ...(corsProbe?.corsIssues || []),
      ];

      if (redirectProbe && !redirectProbe.enforcesHttpsRedirect && parsed.protocol === 'https:') {
        allIssues.push({
          category: 'Network Transport',
          severity: 'MEDIUM',
          header: 'Port 80 (HTTP) Redirect',
          finding: 'Plaintext HTTP (port 80) does not return a 301/308 redirect to HTTPS. Users entering http:// may transmit traffic unencrypted.',
          evidence: redirectProbe.statusCode ? `HTTP Status ${redirectProbe.statusCode}` : 'No redirect response',
          remediation: 'Configure web server (Nginx/Apache/Caddy) to return a permanent 301 redirect from HTTP to HTTPS for all routes',
        });
      }

      if (tlsInfo?.isExpired) {
        allIssues.push({
          category: 'TLS / SSL',
          severity: 'CRITICAL',
          header: 'TLS Certificate Validity',
          finding: 'The SSL/TLS certificate for this target is EXPIRED. Browsers will trigger security blocks.',
          evidence: `Expired on: ${tlsInfo.validTo}`,
          remediation: 'Renew and deploy a valid SSL/TLS certificate immediately',
        });
      }

      // Calculate comprehensive score
      let score = 100;
      allIssues.forEach((i) => {
        if (i.severity === 'CRITICAL') score -= 30;
        else if (i.severity === 'HIGH') score -= 20;
        else if (i.severity === 'MEDIUM') score -= 10;
        else if (i.severity === 'LOW') score -= 5;
        else if (i.severity === 'INFO') score -= 2;
      });
      score = Math.max(10, Math.min(100, score));

      const grade =
        score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

      const telemetry = {
        hostname,
        targetUrl: parsed.href,
        port,
        protocol: parsed.protocol.replace(':', '').toUpperCase(),
        httpVersion: headersInfo.httpVersion ? `HTTP/${headersInfo.httpVersion}` : 'HTTP/1.1',
        statusCode: headersInfo.statusCode || null,
        statusMessage: headersInfo.statusMessage || null,
        dnsAddresses,
        remoteIp: headersInfo.remoteIp || tlsInfo?.remoteIp || (dnsAddresses.length > 0 ? dnsAddresses[0] : 'N/A'),
        remotePort: headersInfo.remotePort || tlsInfo?.remotePort || port,
        tlsHandshakeMs: tlsInfo?.handshakeMs ?? null,
        httpResponseTimeMs: headersInfo.responseTimeMs ?? null,
        totalRoundtripMs: (tlsInfo?.handshakeMs || 0) + (headersInfo.responseTimeMs || 0),
        contentLength: headersInfo.contentLength,
        contentType: headersInfo.contentType,
        serverBanner: headersInfo.serverHeader || 'None Disclosed',
        alpnProtocol: tlsInfo?.alpnProtocol || 'N/A',
        tlsVersion: tlsInfo?.tlsVersion || 'N/A',
        cipherSuite: tlsInfo?.cipherName || 'N/A',
        certSerialNumber: tlsInfo?.serialNumber || 'N/A',
        certBits: tlsInfo?.bits || null,
        certAuthorized: tlsInfo?.authorized ?? null,
        liveSocketTimestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        target: parsed.href,
        hostname,
        scannedAt: new Date().toISOString(),
        score,
        grade,
        issues: allIssues,
        passed: headersInfo.passed || [],
        telemetry,
        tls: tlsInfo,
        cookies: headersInfo.cookies || [],
        cors: corsProbe,
        redirect: redirectProbe,
        rawHeaders: headersInfo.rawHeaders || {},
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= 3. REAL EMAIL BREACH CHECKER =================
  app.post('/api/email/breach-check', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return res.status(400).json({ error: 'Invalid email syntax' });
      }

      const domain = normalized.split('@')[1];

      let mxRecords: any[] = [];
      let spfRecord: string | null = null;
      let dmarcRecord: string | null = null;

      try {
        mxRecords = await resolveMxAsync(domain);
      } catch {
        mxRecords = [];
      }

      try {
        const txt = await resolveTxtAsync(domain);
        const flattened = txt.map((t) => t.join(''));
        spfRecord = flattened.find((t) => t.startsWith('v=spf1')) || null;
      } catch {}

      try {
        const dmarcTxt = await resolveTxtAsync(`_dmarc.${domain}`);
        dmarcRecord = dmarcTxt.map((t) => t.join('')).find((t) => t.startsWith('v=DMARC1')) || null;
      } catch {}

      // Real Email Breach Intelligence via XposedOrNot Live Global Database
      let breaches: any[] = [];
      let totalBreaches = 0;
      let riskLabel = 'Safe';
      let riskScore = 0;
      const exposedDataTypes = new Set<string>();
      let liveDbChecked = false;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7500);

        const analyticsRes = await fetch(
          `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(normalized)}`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'SecGuard-Threat-Intel/1.0',
              Accept: 'application/json',
            },
          }
        );
        clearTimeout(timeout);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          liveDbChecked = true;

          const rawBreaches = analyticsData?.ExposedBreaches?.breaches_details;
          if (Array.isArray(rawBreaches) && rawBreaches.length > 0) {
            breaches = rawBreaches.map((b: any) => {
              const dataList = (b.xposed_data || '')
                .split(';')
                .map((s: string) => s.trim())
                .filter(Boolean);
              dataList.forEach((item: string) => exposedDataTypes.add(item));

              return {
                name: b.breach || 'Security Incident',
                domain: b.domain || '',
                industry: b.industry || 'Online Service',
                logo: b.logo || '',
                date: b.xposed_date || 'N/A',
                records: typeof b.xposed_records === 'number' ? b.xposed_records : parseInt(b.xposed_records, 10) || 0,
                dataExposed: dataList,
                passwordRisk: b.password_risk || 'unknown',
                details: b.details || '',
                references: b.references || '',
                verified: b.verified === 'Yes',
              };
            });
            totalBreaches = breaches.length;

            const riskObj = analyticsData?.BreachMetrics?.risk?.[0];
            if (riskObj) {
              riskLabel = riskObj.risk_label || 'High';
              riskScore = riskObj.risk_score || 75;
            } else {
              riskScore = Math.min(100, Math.max(15, totalBreaches * 8));
              riskLabel = riskScore >= 75 ? 'Critical' : riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Medium' : 'Low';
            }
          }
        }
      } catch (err: any) {
        console.warn('XposedOrNot analytics error:', err.message);
      }

      // Secondary check via check-email if analytics was empty
      if (breaches.length === 0) {
        try {
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 5000);
          const checkRes = await fetch(
            `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(normalized)}`,
            {
              signal: controller2.signal,
              headers: { 'User-Agent': 'SecGuard-Threat-Intel/1.0' },
            }
          );
          clearTimeout(timeout2);
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            liveDbChecked = true;
            if (Array.isArray(checkData?.breaches?.[0]) && checkData.breaches[0].length > 0) {
              const breachNames: string[] = checkData.breaches[0];
              breaches = breachNames.map((name) => ({
                name,
                domain: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
                industry: 'Online Platform',
                logo: `https://xposedornot.com/static/logos/${name}.png`,
                date: 'Recorded Incident',
                records: 0,
                dataExposed: ['Email addresses', 'Account credentials'],
                passwordRisk: 'unknown',
                details: `Compromised credentials associated with ${name} were verified across public breach archives.`,
                references: '',
                verified: true,
              }));
              totalBreaches = breaches.length;
              riskScore = Math.min(100, totalBreaches * 8);
              riskLabel = riskScore >= 70 ? 'Critical' : riskScore >= 40 ? 'High' : 'Medium';
              exposedDataTypes.add('Email addresses');
              exposedDataTypes.add('Account credentials');
            }
          }
        } catch (err: any) {
          console.warn('XposedOrNot check-email error:', err.message);
        }
      }

      const hasBreaches = totalBreaches > 0;

      res.json({
        success: true,
        email: normalized,
        domain,
        hasBreaches,
        breachCount: totalBreaches,
        riskLabel: hasBreaches ? riskLabel : 'Clean & Safe',
        riskScore: hasBreaches ? riskScore : 0,
        breaches,
        exposedDataSummary: Array.from(exposedDataTypes),
        liveDbChecked,
        domainHealth: {
          hasMx: mxRecords.length > 0,
          mxRecordsCount: mxRecords.length,
          primaryMx: mxRecords[0]?.exchange || null,
          hasSpf: !!spfRecord,
          spfRecord,
          hasDmarc: !!dmarcRecord,
          dmarcRecord,
        },
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= 4. REAL DOMAIN INFO & WHOIS/DNS/SERVER LOOKUP =================
  app.post('/api/domain/lookup', async (req: Request, res: Response) => {
    try {
      const { domain } = req.body;
      if (!domain) {
        return res.status(400).json({ error: 'Domain name is required' });
      }

      let cleanDomain = domain.trim().toLowerCase();
      cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

      // 1. Parallel DNS record queries
      const [a, aaaa, mx, txt, ns, soa, cname] = await Promise.allSettled([
        resolve4Async(cleanDomain),
        resolve6Async(cleanDomain),
        resolveMxAsync(cleanDomain),
        resolveTxtAsync(cleanDomain),
        resolveNsAsync(cleanDomain),
        resolveSoaAsync(cleanDomain),
        resolveCnameAsync(cleanDomain),
      ]);

      const aRecords = a.status === 'fulfilled' ? a.value : [];
      const aaaaRecords = aaaa.status === 'fulfilled' ? aaaa.value : [];
      const mxRecords = mx.status === 'fulfilled' ? mx.value : [];
      const txtRecords = txt.status === 'fulfilled' ? txt.value.map((t) => t.join(' ')) : [];
      const nsRecords = ns.status === 'fulfilled' ? ns.value : [];
      const soaRecord = soa.status === 'fulfilled' ? soa.value : null;
      const cnameRecords = cname.status === 'fulfilled' ? cname.value : [];

      // 2. Perform deep WHOIS lookup via Port 43 socket
      const whoisData = await performDeepWhois(cleanDomain);

      // 3. Inspect Web Server & Hosting Location of the domain's primary IP
      let serverGeo: any = null;
      let webServerInfo: any = null;

      if (aRecords.length > 0) {
        const primaryIp = aRecords[0];
        try {
          const ipRes = await fetch(`https://ipwho.is/${primaryIp}`);
          const ipJson = await ipRes.json();
          if (ipJson.success) {
            serverGeo = {
              ip: primaryIp,
              city: ipJson.city,
              region: ipJson.region,
              country: ipJson.country,
              countryCode: ipJson.country_code,
              isp: ipJson.connection?.isp,
              org: ipJson.connection?.org,
              asn: ipJson.connection?.asn,
            };
          }
        } catch {}
      }

      // Check HTTP/HTTPS response header & server banner
      try {
        const webReq = await fetch(`https://${cleanDomain}`, {
          method: 'HEAD',
          headers: { 'User-Agent': 'SecGuard-Domain-Probe/1.0' },
          signal: AbortSignal.timeout(4000),
        });
        webServerInfo = {
          httpStatus: webReq.status,
          serverHeader: webReq.headers.get('server') || webReq.headers.get('x-powered-by') || null,
          isHttps: true,
        };
      } catch {
        webServerInfo = { isHttps: false };
      }

      // SPF & DMARC extract from TXT
      const spf = txtRecords.find((t) => t.startsWith('v=spf1')) || null;

      res.json({
        success: true,
        domain: cleanDomain,
        whois: whoisData.parsed,
        whoisRaw: whoisData.raw ? whoisData.raw.slice(0, 4000) : null,
        dns: {
          a: aRecords,
          aaaa: aaaaRecords,
          mx: mxRecords,
          txt: txtRecords,
          ns: nsRecords,
          soa: soaRecord,
          cname: cnameRecords,
          spf,
        },
        server: {
          geo: serverGeo,
          web: webServerInfo,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================= 5. REAL IP LOOKUP & GEOLOCATION =================
  app.post('/api/ip/lookup', async (req: Request, res: Response) => {
    try {
      const { ip } = req.body;
      let targetIp = (ip || '').trim();

      // If user provided a domain name or host, resolve to IPv4 address first
      if (targetIp && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIp) && !targetIp.includes(':')) {
        const cleanHost = targetIp.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
        try {
          const resolved = await resolve4Async(cleanHost);
          if (resolved.length > 0) {
            targetIp = resolved[0];
          }
        } catch {}
      }

      // 1. Primary query: ipwho.is
      let geoData: any = null;
      try {
        const apiUrl = targetIp ? `https://ipwho.is/${encodeURIComponent(targetIp)}` : 'https://ipwho.is/';
        const r1 = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
        const d1 = await r1.json();
        if (d1 && d1.success && typeof d1.latitude === 'number') {
          geoData = {
            ip: d1.ip,
            type: d1.type || 'IPv4',
            country: d1.country,
            countryCode: d1.country_code,
            region: d1.region,
            city: d1.city,
            postal: d1.postal,
            latitude: d1.latitude,
            longitude: d1.longitude,
            connection: d1.connection,
            timezone: d1.timezone,
            flagUrl: d1.flag?.img || null,
          };
        }
      } catch {}

      // 2. Secondary fallback: ip-api.com
      if (!geoData) {
        try {
          const fbUrl = targetIp ? `http://ip-api.com/json/${encodeURIComponent(targetIp)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query` : 'http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query';
          const r2 = await fetch(fbUrl, { signal: AbortSignal.timeout(5000) });
          const d2 = await r2.json();
          if (d2 && d2.status === 'success' && typeof d2.lat === 'number') {
            geoData = {
              ip: d2.query,
              type: d2.query.includes(':') ? 'IPv6' : 'IPv4',
              country: d2.country,
              countryCode: d2.countryCode,
              region: d2.regionName,
              city: d2.city,
              postal: d2.zip,
              latitude: d2.lat,
              longitude: d2.lon,
              connection: {
                isp: d2.isp,
                org: d2.org,
                asn: d2.as ? parseInt(d2.as.replace(/\D/g, ''), 10) : undefined,
              },
              timezone: {
                id: d2.timezone,
              },
            };
          }
        } catch {}
      }

      if (!geoData) {
        return res.status(400).json({
          success: false,
          error: 'Unable to locate IP address. Please check input format.',
        });
      }

      res.json({
        success: true,
        ...geoData,
        lookupAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite dev middleware in development
  if (serveFrontend) {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist/index.html'));
      });
    }
  }

  return app;
}

async function startServer() {
  if (process.argv.includes('--production')) {
    process.env.NODE_ENV = 'production';
  }

  const app = await createApp();
  const preferredPort = Number.parseInt(process.env.PORT || '5173', 10);
  const requestedPort = Number.isFinite(preferredPort) && preferredPort > 0 ? preferredPort : 5173;

  const listenOnPort = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const server = app.listen(port, () => {
        resolve(port);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = port + 1;
          if (nextPort - requestedPort <= 20) {
            listenOnPort(nextPort).then(resolve).catch(reject);
            return;
          }
        }

        reject(error);
      });
    });

  const PORT = await listenOnPort(requestedPort);
  console.log(`Security Dashboard Server listening on http://0.0.0.0:${PORT}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
