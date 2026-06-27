import { useEffect, useState } from 'react';

const SIZE_MAP = {
  sm: 48,
  md: 72,
  lg: 96,
  fullscreen: 120,
};

export default function BodaSureLoader({ size = 'md', showWordmark = null }) {
  const svgSize = SIZE_MAP[size] || SIZE_MAP.md;
  const radius = svgSize / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees

  const displayWordmark = showWordmark !== null ? showWordmark : size === 'fullscreen';
  const [wordmarkVisible, setWordmarkVisible] = useState(false);

  useEffect(() => {
    if (size !== 'fullscreen') return;
    const timer = setTimeout(() => setWordmarkVisible(true), 500);
    return () => clearTimeout(timer);
  }, [size]);

  const isFullscreen = size === 'fullscreen';

  return (
    <div
      className="flex flex-col items-center justify-center bg-white"
      style={isFullscreen
        ? { position: 'fixed', inset: 0, zIndex: 9999 }
        : { minHeight: '60vh' }
      }
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' }}
      >
        {/* Track ring — full circle, light peach */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(249, 115, 22, 0.18)"
          strokeWidth="10"
        />
        {/* Spinning arc — 270 degrees, orange */}
        <g className="animate-bodasure-spin" style={{ transformOrigin: 'center' }}>
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="#F97316"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={circumference / 4}
          />
        </g>
        {/* Inner navy circle */}
        <circle cx={svgSize / 2} cy={svgSize / 2} r={radius * 0.55} fill="#1E2A4A" />
        {/* B lettermark */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontFamily="Inter, sans-serif"
          fontWeight="800"
          fontSize={radius * 0.55 * 0.8}
        >
          B
        </text>
      </svg>
      {displayWordmark && (
        <p
          className="font-bold text-[#1E2A4A] tracking-tight mt-6 transition-opacity duration-[400ms] ease-out"
          style={{
            fontSize: '1.5rem',
            opacity: wordmarkVisible ? 1 : 0,
          }}
        >
          BodaSure
        </p>
      )}
    </div>
  );
}