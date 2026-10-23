import React from 'react';

/**
 * QuantaLearn AI Vector Logo Component
 * 
 * Features:
 * - Geometric letter "Q" circular ring with electric blue (#2563EB) to violet (#7C3AED) gradient
 * - Upward-rising growth arrow line in vivid mint green (#10B981) forming the Q's tail
 * - Subtle 4-node neural network constellation inside the ring
 * - Modern geometric sans-serif wordmark: "Quanta" (bold) + "Learn" (medium)
 * - Gradient "AI" badge (cyan #22D3EE to violet #7C3AED)
 */
export default function Logo({
  variant = 'light', // 'light' | 'dark' | 'icon'
  size = 'md',       // 'sm' (28px) | 'md' (36px) | 'lg' (48px) | 'xl' (64px)
  showWordmark = true,
  className = ''
}) {
  const isDark = variant === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#0B1F3A';
  const networkColor = isDark ? '#38BDF8' : '#0B1F3A';

  // Mark dimensions
  const markSize = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64
  }[size] || 36;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric SVG Mark */}
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform group-hover:scale-105 duration-200"
        aria-hidden="true"
      >
        <defs>
          {/* Ring Gradient: Electric Blue -> Violet */}
          <linearGradient id="ql-ring-grad" x1="10" y1="10" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* AI Badge Gradient: Cyan -> Violet */}
          <linearGradient id="ql-ai-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          {/* Arrow Gradient: Mint Green */}
          <linearGradient id="ql-arrow-grad" x1="45" y1="65" x2="90" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Circular Q Ring */}
        <circle
          cx="44"
          cy="44"
          r="30"
          stroke="url(#ql-ring-grad)"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Neural Network Nodes & Connections inside Q ring */}
        <g stroke={networkColor} strokeWidth="1.8" opacity={isDark ? "0.85" : "0.75"}>
          <line x1="33" y1="34" x2="52" y2="30" />
          <line x1="33" y1="34" x2="36" y2="54" />
          <line x1="33" y1="34" x2="55" y2="50" />
          <line x1="52" y1="30" x2="36" y2="54" />
          <line x1="52" y1="30" x2="55" y2="50" />
          <line x1="36" y1="54" x2="55" y2="50" />
        </g>
        
        {/* Nodes */}
        <g fill={networkColor}>
          <circle cx="33" cy="34" r="4" />
          <circle cx="52" cy="30" r="3.5" />
          <circle cx="36" cy="54" r="3.8" />
          <circle cx="55" cy="50" r="4.2" />
        </g>
        {/* Center node highlight */}
        <circle cx="43" cy="42" r="2.2" fill={isDark ? "#38BDF8" : "#2563EB"} />

        {/* Q Tail: Upward-rising Growth Arrow */}
        <path
          d="M 52 64 L 66 74 L 86 46"
          stroke="url(#ql-arrow-grad)"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Arrowhead */}
        <polygon
          points="86,40 73,47 84,58"
          fill="#10B981"
        />
      </svg>

      {/* Wordmark + AI Badge */}
      {showWordmark && (
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className="font-heading tracking-tight"
            style={{
              color: textColor,
              fontSize: size === 'sm' ? '14px' : size === 'lg' ? '20px' : size === 'xl' ? '26px' : '16px'
            }}
          >
            <strong className="font-extrabold">Quanta</strong>
            <span className="font-medium opacity-90">Learn</span>
          </span>

          {/* Sleek Gradient AI Badge */}
          <span
            className="inline-flex items-center justify-center font-mono font-bold text-white uppercase rounded-md shadow-2xs"
            style={{
              background: 'linear-gradient(135deg, #22D3EE 0%, #7C3AED 100%)',
              fontSize: size === 'sm' ? '9px' : size === 'lg' ? '12px' : size === 'xl' ? '14px' : '10px',
              padding: size === 'sm' ? '2px 5px' : size === 'lg' ? '3px 7px' : '2.5px 6px',
              letterSpacing: '0.05em'
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
