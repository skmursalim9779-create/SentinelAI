import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function StatCard({ label, value, accent = '#FF7A3D' }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = parseInt(value, 10) || 0
    if (end === 0) {
      setDisplayValue(0)
      return
    }
    const duration = 600
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setDisplayValue(end)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative p-4 rounded-xl border border-ink-700 bg-ink-900 overflow-hidden group hover:border-ink-600 transition-colors"
    >
      {/* Top accent glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
      />

      <p className="text-xs font-mono text-ink-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-display font-semibold tracking-tight" style={{ color: accent }}>
          {displayValue}
        </p>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: accent, opacity: 0.6 }}
        />
      </div>
    </motion.div>
  )
}

