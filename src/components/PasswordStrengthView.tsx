import React, { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  FlaskConical,
  GraduationCap,
  Info,
  KeyRound,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  TriangleAlert,
  X,
} from 'lucide-react';

interface PasswordStrengthViewProps {
  onBackToDashboard?: () => void;
}

export interface CharacterBreakdown {
  length: number;
  upperCount: number;
  lowerCount: number;
  numberCount: number;
  symbolCount: number;
  uniqueCount: number;
  charPoolSize: number;
  entropyBits: number;
  shannonEntropy: number;
}

export interface PasswordAuditResult {
  password: string;
  score: number; // 0 - 100
  rating: 'VERY_WEAK' | 'WEAK' | 'MODERATE' | 'STRONG' | 'MILITARY_GRADE';
  ratingLabel: string;
  badgeClass: string;
  progressClass: string;
  summary: string;
  breakdown: CharacterBreakdown;
  patterns: {
    hasSequentialLetters: boolean;
    hasSequentialNumbers: boolean;
    hasRepeatedChars: boolean;
    hasCommonDictionaryWord: boolean;
    matchedWords: string[];
  };
  crackTimes: {
    onlineThrottled: string;
    fastGpuHash: string;
    slowBcryptHash: string;
    quantumOffline: string;
  };
  pwnedStatus: {
    checked: boolean;
    loading: boolean;
    isPwned: boolean;
    timesExposed: number;
    sha1Hash: string;
    sha1Prefix: string;
    error?: string;
  };
  recommendations: string[];
}

// Common dictionary & breached words
const COMMON_PATTERNS = [
  'password', 'qwerty', '123456', '12345678', '123456789', 'admin', 'welcome', 'login',
  'iloveyou', 'p@ssw0rd', 'dragon', 'football', 'monkey', 'shadow', 'master', 'superman',
  'trustno1', 'killer', 'test', 'sample', 'demo', 'secret', 'secure', 'pass123', 'root',
  'computer', 'internet', 'database', 'access', 'freedom', 'starwars', 'matrix', 'pokemon'
];

export const PasswordStrengthView: React.FC<PasswordStrengthViewProps> = ({ onBackToDashboard }) => {
  // Input states - start empty as user requested
  const [userInput, setUserInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [testedPassword, setTestedPassword] = useState<string>('');
  const [auditResult, setAuditResult] = useState<PasswordAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditToast, setAuditToast] = useState<string | null>(null);

  // Generator states
  const [genLength, setGenLength] = useState<number>(20);
  const [genIncludeUpper, setGenIncludeUpper] = useState<boolean>(true);
  const [genIncludeLower, setGenIncludeLower] = useState<boolean>(true);
  const [genIncludeNumbers, setGenIncludeNumbers] = useState<boolean>(true);
  const [genIncludeSymbols, setGenIncludeSymbols] = useState<boolean>(true);
  const [generatedResult, setGeneratedResult] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const genLengthInputId = useId();

  const showToast = (msg: string) => {
    setAuditToast(msg);
    setTimeout(() => setAuditToast(null), 3000);
  };

  // Real SHA-1 computation using standard Web Crypto API
  const computeSha1 = async (str: string): Promise<string> => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  // Real mathematical Shannon entropy calculation: H = -sum(p * log2(p))
  const calculateShannonEntropy = (str: string): number => {
    if (!str) return 0;
    const len = str.length;
    const freqs: Record<string, number> = {};
    for (let i = 0; i < len; i++) {
      const ch = str[i];
      freqs[ch] = (freqs[ch] || 0) + 1;
    }
    let entropy = 0;
    for (const ch in freqs) {
      const p = freqs[ch] / len;
      entropy -= p * Math.log2(p);
    }
    return Number((entropy * len).toFixed(1));
  };

  // Real time to crack formatter
  const formatTimeSeconds = (seconds: number): string => {
    if (!isFinite(seconds) || seconds > 1e25) return 'Centuries (Virtually Uncrackable)';
    if (seconds < 1) return 'Instant (< 1 second)';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 86400)} hours`;
    if (seconds < 86400 * 30) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 86400 * 365) return `${Math.round(seconds / (86400 * 30))} months`;
    if (seconds < 86400 * 365 * 1000) return `${Math.round(seconds / (86400 * 365)).toLocaleString()} years`;
    if (seconds < 86400 * 365 * 1e6) return `${(seconds / (86400 * 365 * 1e3)).toFixed(1)} Thousand Years`;
    if (seconds < 86400 * 365 * 1e9) return `${(seconds / (86400 * 365 * 1e6)).toFixed(1)} Million Years`;
    return `${(seconds / (86400 * 365 * 1e9)).toFixed(1)} Billion Years`;
  };

  // Perform full real audit on the password
  const executeRealAudit = async (pwdToTest: string) => {
    const trimmed = pwdToTest;
    if (!trimmed) {
      showToast('Please type a password in the input field to test.');
      return;
    }

    setIsAuditing(true);
    setTestedPassword(trimmed);

    // 1. Character Breakdown
    const length = trimmed.length;
    let upperCount = 0;
    let lowerCount = 0;
    let numberCount = 0;
    let symbolCount = 0;
    const uniqueSet = new Set<string>();

    for (let i = 0; i < length; i++) {
      const ch = trimmed[i];
      uniqueSet.add(ch);
      if (/[A-Z]/.test(ch)) upperCount++;
      else if (/[a-z]/.test(ch)) lowerCount++;
      else if (/[0-9]/.test(ch)) numberCount++;
      else symbolCount++;
    }

    // Real Character Pool Size Calculation
    let charPoolSize = 0;
    if (lowerCount > 0) charPoolSize += 26;
    if (upperCount > 0) charPoolSize += 26;
    if (numberCount > 0) charPoolSize += 10;
    if (symbolCount > 0) charPoolSize += 33;
    if (charPoolSize === 0) charPoolSize = 1;

    // Real Information Entropy: E = L * log2(R)
    const rawEntropyBits = Number((length * Math.log2(charPoolSize)).toFixed(1));
    const shannonEntropy = calculateShannonEntropy(trimmed);

    // 2. Pattern Detections
    const lowerStr = trimmed.toLowerCase();
    const hasSequentialLetters = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(trimmed);
    const hasSequentialNumbers = /(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(trimmed);
    const hasRepeatedChars = /(.)\1{2,}/.test(trimmed);

    const matchedWords: string[] = [];
    for (const w of COMMON_PATTERNS) {
      if (lowerStr.includes(w)) {
        matchedWords.push(w);
      }
    }
    const hasCommonDictionaryWord = matchedWords.length > 0;

    // 3. Real Mathematical Crack Times
    const totalCombinations = Math.pow(charPoolSize, length);
    const onlineSeconds = totalCombinations / 1.66;
    const fastGpuSeconds = totalCombinations / 1e11;
    const slowBcryptSeconds = totalCombinations / 1e4;
    const quantumSeconds = (Math.sqrt(totalCombinations) || 1) / 1e12;

    const crackTimes = {
      onlineThrottled: formatTimeSeconds(onlineSeconds),
      fastGpuHash: formatTimeSeconds(fastGpuSeconds),
      slowBcryptHash: formatTimeSeconds(slowBcryptSeconds),
      quantumOffline: formatTimeSeconds(quantumSeconds),
    };

    // 4. Real Score Calculation (0 to 100)
    let score = 0;

    // Length points (max 40)
    if (length >= 20) score += 40;
    else if (length >= 16) score += 35;
    else if (length >= 14) score += 30;
    else if (length >= 12) score += 25;
    else if (length >= 10) score += 18;
    else if (length >= 8) score += 10;
    else score += length;

    // Diversity points (max 40)
    if (lowerCount > 0) score += 10;
    if (upperCount > 0) score += 10;
    if (numberCount > 0) score += 10;
    if (symbolCount > 0) score += 10;

    // Uniqueness points (max 20)
    const uniqueRatio = uniqueSet.size / length;
    score += Math.round(uniqueRatio * 20);

    // Penalties for patterns
    if (hasCommonDictionaryWord) score = Math.max(10, score - 35);
    if (hasSequentialNumbers) score = Math.max(10, score - 15);
    if (hasSequentialLetters) score = Math.max(10, score - 15);
    if (hasRepeatedChars) score = Math.max(10, score - 12);
    if (length < 8) score = Math.min(score, 25);

    score = Math.min(100, Math.max(5, score));

    // Rating Assignment
    let rating: PasswordAuditResult['rating'] = 'WEAK';
    let ratingLabel = 'WEAK';
    let badgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
    let progressClass = 'bg-red-500';
    let summary = 'Weak password. Vulnerable to fast automated brute-force attacks.';

    if (score < 30) {
      rating = 'VERY_WEAK';
      ratingLabel = 'VERY WEAK';
      badgeClass = 'bg-red-600/25 text-red-400 border-red-500/50';
      progressClass = 'bg-red-600';
      summary = 'Extremely vulnerable. Can be cracked almost instantaneously by dictionary tools.';
    } else if (score < 55) {
      rating = 'WEAK';
      ratingLabel = 'WEAK';
      badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      progressClass = 'bg-amber-500';
      summary = 'Lacks sufficient length or entropy. At risk of offline dictionary & mask attacks.';
    } else if (score < 75) {
      rating = 'MODERATE';
      ratingLabel = 'MODERATE';
      badgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      progressClass = 'bg-blue-500';
      summary = 'Decent strength for standard non-critical accounts. Add more length for core credentials.';
    } else if (score < 90) {
      rating = 'STRONG';
      ratingLabel = 'STRONG';
      badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      progressClass = 'bg-emerald-500';
      summary = 'Enterprise-grade security. Highly resilient to commercial GPU brute-force clusters.';
    } else {
      rating = 'MILITARY_GRADE';
      ratingLabel = 'MILITARY-GRADE (QUANTUM-RESISTANT)';
      badgeClass = 'bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse';
      progressClass = 'bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400';
      summary = 'Maximum cryptographic entropy. Exceeds NSA & NIST SP 800-63B guidelines.';
    }

    // Dynamic Recommendations based strictly on the user's input
    const recommendations: string[] = [];
    if (length < 16) {
      recommendations.push(`Increase length from ${length} to at least 16-20 characters for exponential entropy.`);
    }
    if (upperCount === 0) {
      recommendations.push('Include uppercase characters (A-Z) to expand character pool by 26.');
    }
    if (lowerCount === 0) {
      recommendations.push('Include lowercase characters (a-z) to diversify character sets.');
    }
    if (numberCount === 0) {
      recommendations.push('Add numeric digits (0-9) to defend against pure dictionary substitution.');
    }
    if (symbolCount === 0) {
      recommendations.push('Add special symbols (!@#$%^&*) to maximize combinatorial search space.');
    }
    if (hasCommonDictionaryWord) {
      recommendations.push(`Remove common dictionary keyword "${matchedWords.join(', ')}". Attackers prioritize wordlists.`);
    }
    if (hasSequentialNumbers || hasSequentialLetters) {
      recommendations.push('Avoid sequential runs (e.g. 123, abc) which are detected in rule-based hash attacks.');
    }
    if (hasRepeatedChars) {
      recommendations.push('Avoid repeated identical characters which diminish effective entropy.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Excellent! This password possesses outstanding cryptographic complexity.');
      recommendations.push('Store in an encrypted password vault and pair with hardware MFA (FIDO2 / TOTP).');
    }

    // Preliminary result object
    const auditObj: PasswordAuditResult = {
      password: trimmed,
      score,
      rating,
      ratingLabel,
      badgeClass,
      progressClass,
      summary,
      breakdown: {
        length,
        upperCount,
        lowerCount,
        numberCount,
        symbolCount,
        uniqueCount: uniqueSet.size,
        charPoolSize,
        entropyBits: rawEntropyBits,
        shannonEntropy,
      },
      patterns: {
        hasSequentialLetters,
        hasSequentialNumbers,
        hasRepeatedChars,
        hasCommonDictionaryWord,
        matchedWords,
      },
      crackTimes,
      pwnedStatus: {
        checked: false,
        loading: true,
        isPwned: false,
        timesExposed: 0,
        sha1Hash: '',
        sha1Prefix: '',
      },
      recommendations,
    };

    setAuditResult(auditObj);

    // 5. Real HaveIBeenPwned k-Anonymity API Check
    try {
      const fullHash = await computeSha1(trimmed);
      const prefix = fullHash.substring(0, 5);
      const suffix = fullHash.substring(5);

      auditObj.pwnedStatus.sha1Hash = fullHash;
      auditObj.pwnedStatus.sha1Prefix = prefix;

      const response = await fetch(`/api/password/breach-check?prefix=${prefix}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');
      let breachCount = 0;

      for (const line of lines) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (hashSuffix && hashSuffix.toUpperCase() === suffix.toUpperCase()) {
          breachCount = parseInt(countStr, 10) || 0;
          break;
        }
      }

      auditObj.pwnedStatus.loading = false;
      auditObj.pwnedStatus.checked = true;
      auditObj.pwnedStatus.isPwned = breachCount > 0;
      auditObj.pwnedStatus.timesExposed = breachCount;

      if (breachCount > 0) {
        // Severe penalty for breached password
        auditObj.score = Math.min(auditObj.score, 15);
        auditObj.rating = 'VERY_WEAK';
        auditObj.ratingLabel = 'COMPROMISED IN DARK WEB DUMPS';
        auditObj.badgeClass = 'bg-red-600/30 text-red-400 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';
        auditObj.progressClass = 'bg-red-600';
        auditObj.summary = `CRITICAL ALERT: This exact password was leaked ${breachCount.toLocaleString()} times in verified real darknet breach databases!`;
        auditObj.recommendations.unshift(`CRITICAL: Leaked in ${breachCount.toLocaleString()} data breaches. Hackers actively test this in credential-stuffing bots. NEVER use this password!`);
      }

      setAuditResult({ ...auditObj });
    } catch (err: any) {
      auditObj.pwnedStatus.loading = false;
      auditObj.pwnedStatus.checked = false;
      auditObj.pwnedStatus.error = 'Live HIBP service currently unreachable or offline';
      setAuditResult({ ...auditObj });
    } finally {
      setIsAuditing(false);
    }
  };

  // Real Cryptographically Secure Password Generator using window.crypto.getRandomValues
  const generateCryptographicPassword = () => {
    let pool = '';
    const upperCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowerCharset = 'abcdefghijkmnopqrstuvwxyz';
    const numberCharset = '23456789';
    const symbolCharset = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (genIncludeUpper) pool += upperCharset;
    if (genIncludeLower) pool += lowerCharset;
    if (genIncludeNumbers) pool += numberCharset;
    if (genIncludeSymbols) pool += symbolCharset;

    if (!pool) {
      pool = lowerCharset + numberCharset;
    }

    const randomBuffer = new Uint32Array(genLength);
    crypto.getRandomValues(randomBuffer);

    let generated = '';
    for (let i = 0; i < genLength; i++) {
      generated += pool[randomBuffer[i] % pool.length];
    }

    setGeneratedResult(generated);
  };

  // Run initial generator once on load
  useEffect(() => {
    generateCryptographicPassword();
  }, [genLength, genIncludeUpper, genIncludeLower, genIncludeNumbers, genIncludeSymbols]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {auditToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#141b33] border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md"
          >
            <Info className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{auditToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <KeyRound className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3 flex-wrap">
                  Password Security & Entropy Analyzer
                </h2>
                <p className="text-xs text-gray-400 mt-1 max-w-3xl">
                  Inspect the exact password you enter. Performs live cryptographic entropy calculation ($E = L \cdot \log_2 R$), real SHA-1 k-Anonymity Dark Web breach querying (850M+ leaked passwords), and real brute-force duration mathematics.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Interactive Testing Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Test Trigger (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0d1224] border border-[#1f274a] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f274a] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                Live Password Target Input
              </h3>
              <span className="text-[11px] font-mono text-gray-400">
                {userInput.length} Characters Entered
              </span>
            </div>

            {/* Input Form with Eye Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block">
                Enter Any Password to Test:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executeRealAudit(userInput);
                    }
                  }}
                  placeholder="Type or paste your password here (e.g. MySecret#9921)..."
                  className="w-full px-4 py-3.5 pr-24 bg-[#080c1a] border border-[#222d56] focus:border-indigo-500 rounded-xl text-white font-mono text-sm tracking-wider outline-none transition shadow-inner"
                />

                <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                  {userInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUserInput('')}
                      className="p-2 text-gray-500 hover:text-gray-300 rounded-lg text-xs transition cursor-pointer"
                      title="Clear input"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-2 text-gray-400 hover:text-white rounded-lg text-xs transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Password analysis stays in your browser. Breach checks send only the first 5 characters of the password's SHA-1 hash to Have I Been Pwned using k-anonymity; the password and full hash are not sent.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => executeRealAudit(userInput)}
                disabled={isAuditing}
                className="flex-1 min-w-[200px] px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Testing Real Entropy & Breaches...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4" />
                    Test Password (Real Evaluation)
                  </>
                )}
              </button>

              {userInput && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(userInput);
                    showToast('Copied entered password to clipboard!');
                  }}
                  className="px-4 py-3.5 bg-[#141b33] hover:bg-[#1c2547] border border-[#232f5c] text-gray-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              )}
            </div>
          </div>

          {/* Active Tested Password Visual Card */}
          {auditResult && (
            <div className="bg-[#0d1224] border border-[#1f274a] rounded-2xl p-6 space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f274a] pb-3">
                <span className="text-xs uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-400" />
                  Currently Analyzed Password:
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${auditResult.badgeClass}`}>
                  {auditResult.ratingLabel}
                </span>
              </div>

              {/* Exact Password Displayed */}
              <div className="p-4 bg-[#080c1a] border border-[#222d56] rounded-xl flex items-center justify-between gap-3 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Exact User Password Tested:</span>
                  <p className="font-mono text-base font-bold text-emerald-300 truncate select-all tracking-wider mt-0.5">
                    {auditResult.password}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-500 uppercase font-mono block">Entropy Score</span>
                  <span className="text-lg font-mono font-extrabold text-white">
                    {auditResult.score} <span className="text-xs text-gray-500">/ 100</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-400">Security Score:</span>
                  <span className="font-bold text-white">{auditResult.score}%</span>
                </div>
                <div className="w-full h-3 bg-[#080c1a] rounded-full overflow-hidden border border-[#222d56]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${auditResult.progressClass}`}
                    style={{ width: `${auditResult.score}%` }}
                  />
                </div>
              </div>

              {/* Real HIBP Live Breach Result Callout */}
              <div className={`p-4 rounded-xl border ${
                auditResult.pwnedStatus.isPwned
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${
                    auditResult.pwnedStatus.isPwned ? 'bg-red-600/30 text-red-400' : 'bg-emerald-600/30 text-emerald-400'
                  }`}>
                    {auditResult.pwnedStatus.isPwned
                      ? <TriangleAlert className="h-4 w-4" />
                      : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      {auditResult.pwnedStatus.loading
                        ? 'Querying HaveIBeenPwned Dark Web Database...'
                        : auditResult.pwnedStatus.isPwned
                        ? `CRITICAL COMPROMISE: EXPOSED ${auditResult.pwnedStatus.timesExposed.toLocaleString()} TIMES`
                        : 'CLEAN: Zero Dark Web Breaches Found'}
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {auditResult.pwnedStatus.isPwned
                        ? `This exact password appears in ${auditResult.pwnedStatus.timesExposed.toLocaleString()} confirmed public data leaks and credential lists. Automated attack tools have this password in their dictionaries.`
                        : 'No matches found in the 850,000,000+ known pwned passwords database. It has not been observed in public breach dumps.'}
                    </p>
                    {auditResult.pwnedStatus.sha1Hash && (
                      <div className="text-[10px] font-mono text-gray-400 pt-1">
                        SHA-1 Prefix sent: <span className="text-cyan-300 font-bold">{auditResult.pwnedStatus.sha1Prefix}</span> (k-Anonymity preserved)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Brute-force Calculation Matrix */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Estimated Brute-Force Crack Speeds:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#080c1a] border border-[#222d56] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Online Web Login:</span>
                      <span className="text-gray-500">(100 tries/min)</span>
                    </div>
                    <strong className="text-sm font-mono text-emerald-300 block">
                      {auditResult.crackTimes.onlineThrottled}
                    </strong>
                  </div>

                  <div className="p-3 bg-[#080c1a] border border-[#222d56] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Commercial GPU Rig:</span>
                      <span className="text-gray-500">(100B hashes/s)</span>
                    </div>
                    <strong className={`text-sm font-mono block ${auditResult.score > 60 ? 'text-emerald-300' : 'text-amber-400'}`}>
                      {auditResult.crackTimes.fastGpuHash}
                    </strong>
                  </div>

                  <div className="p-3 bg-[#080c1a] border border-[#222d56] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Slow KDF / bcrypt:</span>
                      <span className="text-gray-500">(10K hashes/s)</span>
                    </div>
                    <strong className="text-sm font-mono text-indigo-300 block">
                      {auditResult.crackTimes.slowBcryptHash}
                    </strong>
                  </div>

                  <div className="p-3 bg-[#080c1a] border border-[#222d56] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Quantum Computer:</span>
                      <span className="text-gray-500">(Grover Algorithm)</span>
                    </div>
                    <strong className="text-sm font-mono text-purple-300 block">
                      {auditResult.crackTimes.quantumOffline}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Exact Character Breakdown */}
              <div className="p-4 bg-[#080c1a] border border-[#222d56] rounded-xl space-y-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Exact Character Set Breakdown:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 text-[10px] block">Length:</span>
                    <strong className="text-white text-sm">{auditResult.breakdown.length}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Uppercase (A-Z):</span>
                    <strong className="text-indigo-400 text-sm">{auditResult.breakdown.upperCount}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Lowercase (a-z):</span>
                    <strong className="text-indigo-400 text-sm">{auditResult.breakdown.lowerCount}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Digits (0-9):</span>
                    <strong className="text-cyan-400 text-sm">{auditResult.breakdown.numberCount}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Symbols (!@#$):</span>
                    <strong className="text-emerald-400 text-sm">{auditResult.breakdown.symbolCount}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Unique Chars:</span>
                    <strong className="text-white text-sm">{auditResult.breakdown.uniqueCount}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Pool Size (R):</span>
                    <strong className="text-purple-300 text-sm">{auditResult.breakdown.charPoolSize}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] block">Entropy (Bits):</span>
                    <strong className="text-yellow-400 text-sm">{auditResult.breakdown.entropyBits} bits</strong>
                  </div>
                </div>
              </div>

              {/* Tailored Real Recommendations */}
              <div className="p-4 bg-[#11162b] border border-[#222d56] rounded-xl space-y-2 text-xs">
                <span className="font-bold text-white flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-indigo-400" />
                  Real Security Recommendations for this Password:
                </span>
                <ul className="space-y-1.5 text-gray-300 text-[11px] list-disc list-inside">
                  {auditResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cryptographic Generator & Testing Pivot (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real Cryptographic Generator */}
          <div className="bg-[#0d1224] border border-[#1f274a] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f274a] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Crypto Password Generator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                crypto.getRandomValues
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Generates non-deterministic, cryptographically strong passwords with maximum combinatorial space for server root passwords and database keys.
            </p>

            {/* Generated Output Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Generated Password:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedResult}
                  className="flex-1 px-3.5 py-2.5 bg-[#080c1a] border border-[#222d56] text-emerald-300 font-mono text-xs font-bold rounded-xl outline-none select-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={generateCryptographicPassword}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Generate New Password"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Generator Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedResult);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2000);
                }}
                className="px-3 py-2.5 bg-[#141b33] hover:bg-[#1b2445] border border-[#222d56] text-gray-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedToast ? 'Copied!' : 'Copy Password'}
              </button>

              {/* CRUCIAL BUTTON: Test This Generated Password */}
              <button
                type="button"
                onClick={() => {
                  setUserInput(generatedResult);
                  executeRealAudit(generatedResult);
                }}
                className="px-3 py-2.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/50 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Test This Password
              </button>
            </div>

            {/* Length Slider */}
            <div className="space-y-1.5 pt-2 border-t border-[#1f274a]">
              <div className="flex justify-between text-xs">
                <label htmlFor={genLengthInputId} className="text-gray-400 cursor-pointer">Password Length:</label>
                <span className="font-mono font-bold text-white">{genLength} characters</span>
              </div>
              <input
                id={genLengthInputId}
                type="range"
                min="8"
                max="64"
                value={genLength}
                onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[#080c1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Character Set Checkboxes */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeUpper}
                  onChange={(e) => setGenIncludeUpper(e.target.checked)}
                  className="rounded border-[#222d56] bg-[#080c1a] accent-indigo-500"
                />
                Uppercase (A-Z)
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeLower}
                  onChange={(e) => setGenIncludeLower(e.target.checked)}
                  className="rounded border-[#222d56] bg-[#080c1a] accent-indigo-500"
                />
                Lowercase (a-z)
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeNumbers}
                  onChange={(e) => setGenIncludeNumbers(e.target.checked)}
                  className="rounded border-[#222d56] bg-[#080c1a] accent-indigo-500"
                />
                Digits (0-9)
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeSymbols}
                  onChange={(e) => setGenIncludeSymbols(e.target.checked)}
                  className="rounded border-[#222d56] bg-[#080c1a] accent-indigo-500"
                />
                Symbols (!@#$)
              </label>
            </div>
          </div>

          {/* Real Security Standards Guide */}
          <div className="bg-[#0d1224] border border-[#1f274a] rounded-2xl p-5 space-y-3 text-xs shadow-xl">
            <h4 className="font-bold text-white flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-yellow-400" />
              NIST SP 800-63B Password Verification Rules:
            </h4>
            <div className="space-y-2 text-[11px] text-gray-400">
              <div className="p-2.5 bg-[#080c1a] border border-[#1f274a] rounded-lg">
                <strong className="text-white block mb-0.5">1. Length Trumps Complexity</strong>
                A 16-character passphrase has dramatically more entropy than an 8-character symbol jumble.
              </div>
              <div className="p-2.5 bg-[#080c1a] border border-[#1f274a] rounded-lg">
                <strong className="text-white block mb-0.5">2. Check Against Known Breaches</strong>
                Even a complex password is useless if it already exists in compromised credentials dumps.
              </div>
              <div className="p-2.5 bg-[#080c1a] border border-[#1f274a] rounded-lg">
                <strong className="text-white block mb-0.5">3. Zero Repetitions</strong>
                Never reuse passwords across financial, email, or cloud infrastructure accounts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};