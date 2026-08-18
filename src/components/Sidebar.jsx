import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { Shield, Radio, Terminal, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Incidents', icon: Radio },
  { to: '/upload', label: 'Ingest Logs', icon: Terminal }
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-ink-800 bg-ink-900/95 backdrop-blur-xl flex flex-col z-20">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-ink-800/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="w-3 h-3 rounded-full bg-signal inline-block shadow-glow" />
            <span className="w-3 h-3 rounded-full bg-signal inline-block absolute inset-0 animate-ping opacity-60" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold tracking-tight text-ink-100 flex items-center gap-2">
              SentinelAI
            </h1>
            <p className="text-[11px] text-ink-400 font-mono tracking-wider">SOC COPILOT v1.0</p>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div className="mt-4 px-3 py-1.5 rounded-lg bg-ink-950/80 border border-ink-800 flex items-center justify-between text-[11px] font-mono">
          <span className="text-ink-400">AGENT ENGINE</span>
          <span className="flex items-center gap-1.5 text-threat-low font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-threat-low animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-signal bg-signal/10 border border-signal/30 shadow-[0_0_12px_rgba(255,122,61,0.15)]'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-signal' : 'text-ink-400'} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="active-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-signal shadow-glow"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      <div className="p-4 border-t border-ink-800/80 bg-ink-950/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center text-xs font-mono font-bold text-signal">
            {(profile?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink-100 truncate">
              {profile?.full_name || 'SecOps Analyst'}
            </p>
            <p className="text-[10px] text-ink-400 font-mono capitalize">
              {profile?.role || 'analyst'} · Active
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-ink-850 hover:bg-ink-800 border border-ink-700/60 text-xs font-mono text-ink-400 hover:text-signal transition-colors group"
        >
          <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

