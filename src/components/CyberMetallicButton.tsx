import React, { useRef, useState } from 'react';

export interface CyberMetallicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyber' | 'cyan' | 'rose' | 'emerald' | 'amber' | 'blue' | 'zinc';
  glowColor?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const CyberMetallicButton: React.FC<CyberMetallicButtonProps> = ({
  variant = 'cyber',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current || disabled) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCoords({ x, y });
  };

  // Color schemes based on variant
  const variantStyles = {
    cyber: {
      border: 'border-zinc-700/80 hover:border-zinc-400/90',
      glow: 'rgba(255, 255, 255, 0.25)',
      rim: 'from-white/30 via-zinc-400/20 to-transparent',
      text: 'text-zinc-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.18) 0%, rgba(200,200,210,0.06) 45%, transparent 70%)',
    },
    cyan: {
      border: 'border-cyan-500/60 hover:border-cyan-400',
      glow: 'rgba(6, 182, 212, 0.4)',
      rim: 'from-cyan-300/40 via-cyan-500/20 to-transparent',
      text: 'text-cyan-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.35)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(6,182,212,0.35) 0%, rgba(8,145,178,0.12) 50%, transparent 75%)',
    },
    blue: {
      border: 'border-blue-500/60 hover:border-blue-400',
      glow: 'rgba(59, 130, 246, 0.4)',
      rim: 'from-blue-300/40 via-blue-500/20 to-transparent',
      text: 'text-blue-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59,130,246,0.35) 0%, rgba(37,99,235,0.12) 50%, transparent 75%)',
    },
    emerald: {
      border: 'border-emerald-500/60 hover:border-emerald-400',
      glow: 'rgba(16, 185, 129, 0.4)',
      rim: 'from-emerald-300/40 via-emerald-500/20 to-transparent',
      text: 'text-emerald-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.35)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.12) 50%, transparent 75%)',
    },
    rose: {
      border: 'border-rose-500/60 hover:border-rose-400',
      glow: 'rgba(244, 63, 94, 0.4)',
      rim: 'from-rose-300/40 via-rose-500/20 to-transparent',
      text: 'text-rose-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(244,63,94,0.35) 0%, rgba(225,29,72,0.12) 50%, transparent 75%)',
    },
    amber: {
      border: 'border-amber-500/60 hover:border-amber-400',
      glow: 'rgba(245, 158, 11, 0.4)',
      rim: 'from-amber-300/40 via-amber-500/20 to-transparent',
      text: 'text-amber-100 group-hover:text-white',
      accentGlow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(245,158,11,0.35) 0%, rgba(217,119,6,0.12) 50%, transparent 75%)',
    },
    zinc: {
      border: 'border-zinc-800 hover:border-zinc-700',
      glow: 'rgba(161, 161, 170, 0.2)',
      rim: 'from-zinc-400/20 via-zinc-600/10 to-transparent',
      text: 'text-zinc-300 group-hover:text-zinc-100',
      accentGlow: 'hover:shadow-[0_0_15px_rgba(255,255,255,0.06)]',
      bgGlow: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1) 0%, rgba(160,160,160,0.03) 50%, transparent 75%)',
    },
  }[variant];

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3 text-sm',
  }[size];

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={disabled}
      style={
        {
          '--mouse-x': `${coords.x}%`,
          '--mouse-y': `${coords.y}%`,
        } as React.CSSProperties
      }
      className={`group relative isolate overflow-hidden rounded-lg font-mono font-bold tracking-wider uppercase transition-all duration-300 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${variantStyles.border} ${variantStyles.accentGlow} ${sizeStyles} ${className}`}
      {...props}
    >
      {/* 1. Underlying Metallic Brushed Texture Base */}
      <span className="absolute inset-0 -z-30 bg-gradient-to-b from-[#1c1c22] via-[#0e0e12] to-[#08080a]" />

      {/* 2. Interactive Specular Sheen (Follows Cursor) */}
      <span
        className="pointer-events-none absolute inset-0 -z-20 transition-opacity duration-300"
        style={{
          background: variantStyles.bgGlow,
          opacity: isHovered && !disabled ? 1 : 0.35,
        }}
      />

      {/* 3. Metallic Precision Top Rim Highlight */}
      <span
        className={`pointer-events-none absolute inset-x-0 top-0 h-[1px] -z-10 bg-gradient-to-r ${variantStyles.rim}`}
      />

      {/* 4. Subtle Shimmer Line animation across metallic surface */}
      <span className="pointer-events-none absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
        <span className="absolute -inset-full top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-metallic-shimmer" />
      </span>

      {/* 5. Content with Crisp Drop Shadow */}
      <span
        className={`relative z-10 flex items-center justify-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-colors duration-200 ${variantStyles.text}`}
      >
        {children}
      </span>
    </button>
  );
};
