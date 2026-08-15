export default function StatCard({ label, value, accent = '#FF7A3D' }) {
  return (
    <div className="p-4 rounded-xl border border-ink-700 bg-ink-900">
      <p className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-display font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  )
}
