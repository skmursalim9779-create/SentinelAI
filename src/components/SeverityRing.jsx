import { motion } from 'framer-motion'

const SEVERITY_CONFIG = {
  critical: { color: '#FF4D5E', rings: 4, glow: 'rgba(255, 77, 94, 0.4)' },
  high: { color: '#FF7A3D', rings: 3, glow: 'rgba(255, 122, 61, 0.35)' },
  medium: { color: '#F2C94C', rings: 2, glow: 'rgba(242, 201, 76, 0.3)' },
  low: { color: '#4ADE80', rings: 1, glow: 'rgba(74, 222, 128, 0.25)' },
  info: { color: '#4A9BFF', rings: 1, glow: 'rgba(74, 155, 255, 0.25)' }
}

// Concentric radar rings with dynamic rotating scanner sweep line and pulsing core
export default function SeverityRing({ severity = 'info', size = 40, animated = true }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  const center = size / 2
  const maxRadius = size / 2 - 2
  const ringGap = maxRadius / 4

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={`sweep-gradient-${severity}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={config.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={config.color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Concentric rings */}
        {[1, 2, 3, 4].map((ring) => {
          const isLit = ring <= config.rings
          const radius = ringGap * ring
          return (
            <circle
              key={ring}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={isLit ? config.color : '#2E3846'}
              strokeWidth={isLit ? 1.5 : 1}
              opacity={isLit ? 1 - (ring - 1) * 0.15 : 0.25}
              strokeDasharray={isLit ? undefined : '2 3'}
            />
          )
        })}

        {/* Rotating radar sweep line */}
        {animated && (
          <g className="origin-center animate-spin-slow">
            <line
              x1={center}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke={config.color}
              strokeWidth="1.5"
              strokeOpacity="0.75"
            />
            <circle
              cx={center + maxRadius}
              cy={center}
              r={1.5}
              fill={config.color}
            />
          </g>
        )}

        {/* Center core */}
        <circle cx={center} cy={center} r={2.5} fill={config.color} />
      </svg>

      {/* Pulse ping for critical & high */}
      {(severity === 'critical' || severity === 'high') && (
        <span
          className="absolute w-2 h-2 rounded-full animate-ping pointer-events-none"
          style={{ backgroundColor: config.color, opacity: 0.6 }}
        />
      )}
    </div>
  )
}

export function SeverityLabel({ severity = 'info' }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-medium"
      style={{ color: config.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` }}
      />
      {severity}
    </span>
  )
}

