/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Metatron's Sacred Geometry Matrix Component (Inlined for 100% Single-File Portability)
 */
interface MetatronSymbolProps {
  percent: number;
}

const MetatronSymbol: React.FC<MetatronSymbolProps> = ({ percent }) => {
  const center = 200;
  const sphereRadius = 14;
  const d1 = 62; // inner circle ring distance
  const d2 = 124; // outer circle ring distance

  // The 13 Centers of the Fruit of Life
  const spheres = useMemo(() => {
    const list: { x: number; y: number; id: number; ring: number }[] = [
      { x: center, y: center, id: 0, ring: 0 },
    ];

    // Inner 6 (Ring 1)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      list.push({
        x: center + d1 * Math.cos(angle),
        y: center + d1 * Math.sin(angle),
        id: i + 1,
        ring: 1,
      });
    }

    // Outer 6 (Ring 2, aligned with inner 6)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 * Math.PI) / 180;
      list.push({
        x: center + d2 * Math.cos(angle),
        y: center + d2 * Math.sin(angle),
        id: i + 7,
        ring: 2,
      });
    }
    return list;
  }, [center, d1, d2]);

  // All 78 Connecting Lines between the 13 nodes (13 * 12 / 2 = 78 lines)
  const lines = useMemo(() => {
    const res: { x1: number; y1: number; x2: number; y2: number; index: number }[] = [];
    let count = 0;
    for (let i = 0; i < spheres.length; i++) {
      for (let j = i + 1; j < spheres.length; j++) {
        res.push({
          x1: spheres[i].x,
          y1: spheres[i].y,
          x2: spheres[j].x,
          y2: spheres[j].y,
          index: count++,
        });
      }
    }
    return res;
  }, [spheres]);

  // Fibonacci Spiral Path Points
  const spiralPath = useMemo(() => {
    const points: string[] = [];
    const maxTheta = (1.5 + (percent / 100) * 2.0) * Math.PI;
    const a = 3.5;
    const b = 0.17;

    for (let t = 0; t <= maxTheta; t += 0.08) {
      const r = a * Math.exp(b * t);
      if (r > 168) break;
      const x = center + r * Math.cos(t);
      const y = center + r * Math.sin(t);
      points.push(`${t === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(' ');
  }, [percent, center]);

  const activeLinesCount = Math.floor((percent / 100) * lines.length);
  const isComplete = percent >= 98;

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[390px] md:max-w-[420px] aspect-square mx-auto flex items-center justify-center select-none">
      {/* Ambient background soft glow */}
      <div
        className="absolute inset-4 rounded-full blur-3xl pointer-events-none transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(225, 29, 72, 0.08) 42%, transparent 72%)',
          opacity: 0.8,
        }}
      />

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full overflow-visible transition-all duration-300"
        style={{
          filter: 'drop-shadow(0 0 24px rgba(6, 182, 212, 0.2))',
        }}
      >
        <defs>
          <filter id="glow-proper" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="cyber-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Outer Circular Bounds */}
        <circle
          cx={center}
          cy={center}
          r="172"
          fill="none"
          stroke="#164e63"
          strokeWidth="1.2"
          opacity="0.8"
        />

        {/* Active Progress Ring */}
        <circle
          cx={center}
          cy={center}
          r="172"
          fill="none"
          stroke="url(#cyber-gradient)"
          strokeWidth="3.2"
          strokeDasharray="1080"
          strokeDashoffset={1080 - (percent / 100) * 1080}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-300"
        />

        {/* Outer 24-Point Radial Ticks Ring - Rotating Smoothly */}
        <g className="animate-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          {Array.from({ length: 24 }, (_, i) => {
            const rad = (i * 15 * Math.PI) / 180;
            const isMajor = i % 2 === 0;
            const rInner = isMajor ? 162 : 166;
            const x1 = center + rInner * Math.cos(rad);
            const y1 = center + rInner * Math.sin(rad);
            const x2 = center + 172 * Math.cos(rad);
            const y2 = center + 172 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? '#22d3ee' : '#164e63'}
                strokeWidth={isMajor ? 1.8 : 0.8}
                opacity={isMajor ? 0.9 : 0.5}
              />
            );
          })}
        </g>

        {/* Dynamic Fibonacci Golden Spiral */}
        {spiralPath && (
          <path
            d={spiralPath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.2"
            strokeDasharray="4 3"
            opacity="0.85"
            filter="url(#glow-proper)"
          />
        )}

        {/* ALL 78 Metatron Vector Lines (Always visible with high contrast) */}
        <g>
          {lines.map((l) => {
            const isEnergized = l.index <= activeLinesCount;
            return (
              <line
                key={l.index}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke={isEnergized ? '#22d3ee' : '#164e63'}
                strokeWidth={isEnergized ? 1.5 : 0.85}
                opacity={isEnergized ? 0.95 : 0.4}
                className="transition-opacity duration-200"
              />
            );
          })}
        </g>

        {/* Primary Hexagram Star projection (Merkaba) */}
        <g
          className="animate-spin-reverse-slow"
          style={{ transformOrigin: '200px 200px' }}
        >
          {/* Upward Triangle */}
          <polygon
            points={`${center},${center - d2} ${center + d2 * Math.cos(Math.PI / 6)},${center + d2 * Math.sin(Math.PI / 6)} ${center - d2 * Math.cos(Math.PI / 6)},${center + d2 * Math.sin(Math.PI / 6)}`}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.2"
            opacity="0.95"
          />
          {/* Downward Triangle */}
          <polygon
            points={`${center},${center + d2} ${center + d2 * Math.cos(-Math.PI / 6)},${center + d2 * Math.sin(-Math.PI / 6)} ${center - d2 * Math.cos(-Math.PI / 6)},${center + d2 * Math.sin(-Math.PI / 6)}`}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.2"
            opacity="0.95"
          />
        </g>

        {/* The 13 Spheres of the Fruit of Life */}
        {spheres.map((s) => {
          const isActivated = percent >= (s.id / 13) * 90;
          return (
            <g key={s.id} className="transition-all duration-300">
              {/* Outer boundary of sphere */}
              <circle
                cx={s.x}
                cy={s.y}
                r={sphereRadius}
                fill={isActivated ? '#083344' : '#07111d'}
                stroke={isActivated ? '#22d3ee' : '#164e63'}
                strokeWidth={isActivated ? 2 : 1.2}
                opacity={1}
              />
              {/* Center point of sphere */}
              <circle
                cx={s.x}
                cy={s.y}
                r={s.id === 0 ? 5.5 : 3}
                fill={isActivated ? '#22d3ee' : '#334155'}
                opacity={1}
              />
              {/* Center core pulse ring */}
              {s.id === 0 && (
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={sphereRadius + 10}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  className="animate-spin-medium"
                  style={{ transformOrigin: '200px 200px' }}
                />
              )}
            </g>
          );
        })}

        {/* Completion Starburst */}
        {isComplete && (
          <g className="animate-spin-fast" style={{ transformOrigin: '200px 200px' }}>
            <polygon
              points={`${center},${center - 32} ${center + 9},${center - 9} ${center + 32},${center} ${center + 9},${center + 9} ${center},${center + 32} ${center - 9},${center + 9} ${center - 32},${center} ${center - 9},${center - 9}`}
              fill="#f43f5e"
              opacity="0.9"
              filter="url(#glow-proper)"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Main Single-File Loading Screen Page
 */
interface LoadingScreenPageProps {
  onComplete?: () => void;
}

export default function LoadingScreenPage({ onComplete }: LoadingScreenPageProps) {
  const [percent, setPercent] = useState<number>(0);
  const [freq, setFreq] = useState<number>(432.0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const completionTimeoutRef = useRef<number | null>(null);

  // Animate progress to completion, then leave it visible briefly before continuing.
  useEffect(() => {
    let currentPercent = 0;
    lastTimeRef.current = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Complete the loading sequence over 6.5 seconds.
      const speed = 100 / 6.5;
      currentPercent = Math.min(100, currentPercent + speed * delta);
      setPercent(currentPercent);

      // Smooth harmonic frequency oscillation (432.0 Hz to 528.0 Hz)
      const currentFreq = 432 + Math.sin(time / 450) * 8 + Math.cos(time / 200) * 4;
      setFreq(currentFreq);

      if (currentPercent >= 100) {
        if (onComplete) {
          completionTimeoutRef.current = window.setTimeout(onComplete, 700);
        }
        return;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center justify-center overflow-hidden select-none bg-[#03060b] text-slate-100"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.045) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 78%)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,rgba(8,47,73,0.32),transparent_58%)]" />

      {/* Atmospheric Soft Luminous Backlight Glow */}
      <div
        className="absolute w-[620px] h-[620px] rounded-full blur-[140px] pointer-events-none opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, rgba(8, 47, 73, 0.12) 45%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[360px] h-[360px] rounded-full blur-[90px] pointer-events-none opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(225, 29, 72, 0.12) 0%, transparent 65%)',
        }}
      />

      {/* TOP-LEFT CORNER: SYSTEM: ONLINE */}
      <div className="fixed top-[max(1.5rem,env(safe-area-inset-top))] left-4 sm:top-8 sm:left-8 z-30 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-slate-950/75 border border-cyan-900/70 shadow-[0_0_24px_rgba(6,182,212,0.08)] backdrop-blur-xl">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </span>
        <span className="font-mono-tabular text-xs tracking-widest uppercase font-bold text-emerald-300">
          SYSTEM: ONLINE
        </span>
      </div>

      {/* CENTERPIECE: Second Animated Symbol (Metatron's Sacred Geometry Matrix) */}
      <div className="relative z-10 w-[min(340px,calc(100vw-2rem),42dvh)] sm:w-[min(390px,calc(100vw-4rem),42dvh)] md:w-[min(420px,calc(100vw-4rem),42dvh)] max-w-full aspect-square flex items-center justify-center">
        <div className="absolute inset-[8%] rounded-full border border-cyan-400/10 shadow-[0_0_70px_rgba(6,182,212,0.08),inset_0_0_50px_rgba(6,182,212,0.04)]" />
        <MetatronSymbol percent={percent} />
      </div>

      {/* BRAND & DASHBOARD TITLES: ICON REMOVED FROM SECUREWATCH LEFT SIDE */}
      <div className="relative z-10 mt-3 sm:mt-4 flex flex-col items-center text-center px-4 max-w-lg">
        <div className="mb-2 flex items-center gap-2 font-mono-tabular text-[9px] sm:text-[10px] tracking-[0.32em] uppercase text-cyan-400/80">
          <span className="h-px w-6 bg-gradient-to-r from-transparent to-cyan-400/80" />
          CYSEC // SECURITY OPERATIONS
          <span className="h-px w-6 bg-gradient-to-l from-transparent to-cyan-400/80" />
        </div>
        {/* Brand Name: SECUREWATCH (Clean & Centered without any icon on the left) */}
        <h1 className="text-2xl min-[380px]:text-3xl sm:text-4xl md:text-5xl font-serif-symbolic font-black tracking-[0.14em] min-[380px]:tracking-[0.2em] sm:tracking-[0.28em] uppercase text-white mb-1.5 drop-shadow-[0_0_22px_rgba(34,211,238,0.24)]">
          SECUREWATCH
        </h1>

        {/* Subtitle: WEB APPLICATION & API SECURITY DASHBOARD */}
        <h2 className="max-w-full text-[10px] min-[380px]:text-xs sm:text-sm font-mono-tabular font-semibold tracking-[0.12em] min-[380px]:tracking-[0.16em] sm:tracking-[0.2em] uppercase text-slate-400">
          Web Application & API Security Dashboard
        </h2>

        {/* Clean High-Precision Lightweight Progress Bar */}
        <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs sm:max-w-sm">
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-900/80 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-cyan-400 to-emerald-300 shadow-[0_0_12px_rgba(34,211,238,0.7)] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-mono-tabular text-slate-500">
            <span className="tracking-wider uppercase font-medium text-slate-400">
              INITIALIZING SECURITY POLICIES
            </span>
            <span className="font-bold tabular-nums text-cyan-300">
              {Math.floor(percent)}%
            </span>
          </div>
        </div>
      </div>

      {/* LEFT-SIDE FOOTER: LIVE FREQUENCY EQUALIZER */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 min-[380px]:left-4 sm:bottom-8 sm:left-8 z-30 flex items-center gap-2 sm:gap-3 px-2 min-[380px]:px-2.5 sm:px-3.5 py-2 rounded-lg bg-slate-950/75 border border-cyan-900/70 shadow-[0_0_24px_rgba(6,182,212,0.08)] backdrop-blur-xl">
        {/* Animated frequency equalizer bars */}
        <div className="flex items-end gap-1 h-5 w-10 min-[380px]:w-12 px-0.5" aria-hidden="true">
          <span className="h-full w-1 bg-rose-500 rounded-t animate-frequency-wave" style={{ animationDelay: '0ms' }} />
          <span className="h-full w-1 bg-cyan-400 rounded-t animate-frequency-wave" style={{ animationDelay: '120ms' }} />
          <span className="h-full w-1 bg-sky-400 rounded-t animate-frequency-wave" style={{ animationDelay: '240ms' }} />
          <span className="h-full w-1 bg-teal-400 rounded-t animate-frequency-wave" style={{ animationDelay: '360ms' }} />
          <span className="h-full w-1 bg-cyan-300 rounded-t animate-frequency-wave" style={{ animationDelay: '480ms' }} />
          <span className="h-full w-1 bg-sky-500 rounded-t animate-frequency-wave" style={{ animationDelay: '600ms' }} />
        </div>

        <span className="text-[10px] min-[380px]:text-xs font-mono-tabular font-bold text-cyan-200 tabular-nums">
          {freq.toFixed(1)} Hz
        </span>
      </div>

      {/* RIGHT-SIDE CORNER FOOTER: DEVELOPED BY KUNAL KHARAT */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 min-[380px]:right-4 sm:bottom-8 sm:right-8 z-30 flex items-center px-2 min-[380px]:px-2.5 sm:px-4 py-2 rounded-lg bg-slate-950/75 border border-cyan-900/70 shadow-[0_0_24px_rgba(6,182,212,0.08)] backdrop-blur-xl">
        <span className="font-mono-tabular text-[9px] min-[380px]:text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-slate-300">
          <span className="hidden sm:inline">DEVELOPED BY{' '}</span>
          <span className="text-cyan-300 font-bold">
            KUNAL KHARAT
          </span>
        </span>
      </div>
    </div>
  );
}