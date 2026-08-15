const SEVERITY_CONFIG = {
  critical: { color: '#FF4D5E', rings: 4 },
  high: { color: '#FF7A3D', rings: 3 },
  medium: { color: '#F2C94C', rings: 2 },
  low: { color: '#4ADE80', rings: 1 },
  info: { color: '#4A9BFF', rings: 1 }
}

// Signature element: severity is shown as concentric radar rings rather than
// a flat colored badge — the more rings lit, the more severe the incident.
export default function SeverityRing({ severity = 'info', size = 40 }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  const center = size / 2
  const maxRadius = size / 2 - 2
  const ringGap = maxRadius / 4

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
              opacity={isLit ? 1 - (ring - 1) * 0.15 : 0.4}
            />
          )
        })}
        <circle cx={center} cy={center} r={2} fill={config.color} />
      </svg>
    </div>
  )
}

export function SeverityLabel({ severity = 'info' }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wide"
      style={{ color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {severity}
    </span>
  )
}
