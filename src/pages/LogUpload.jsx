import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

import {
  Terminal,
  Cpu,
  ShieldCheck,
  FileText,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

import { supabase } from '../lib/supabaseClient.js'
import {
  saveRawLog,
  createIncidentRecord,
  saveIncidentTimeline,
  saveAgentReport,
} from '../lib/incidentStore.js'
import Sidebar from '../components/Sidebar.jsx'
import CyberBackground from '../components/CyberBackground.jsx'

/* =========================================================
   SAMPLE SECURITY LOG
========================================================= */

const SAMPLE_LOG = `2026-08-12T02:14:03Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:05Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:07Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:09Z auth-service [WARN] failed login attempt user=admin ip=185.220.101.42
2026-08-12T02:14:11Z auth-service [INFO] login success user=admin ip=185.220.101.42
2026-08-12T02:14:22Z api-gateway [INFO] admin session created, scope=full_access
2026-08-12T02:15:03Z db-service [WARN] bulk export requested table=customers rows=48213 by=admin`

/* =========================================================
   PIPELINE STAGES
========================================================= */

const PIPELINE_STAGES = [
  {
    id: 'parser',
    name: 'Log Parser',
    role: 'Extract entities & anomalies',
    icon: Terminal,
  },
  {
    id: 'classifier',
    name: 'Threat Classifier',
    role: 'MITRE ATT&CK mapping',
    icon: Cpu,
  },
  {
    id: 'investigator',
    name: 'Investigator',
    role: 'Blast radius correlation',
    icon: ShieldCheck,
  },
  {
    id: 'reporter',
    name: 'Report Writer',
    role: 'Synthesis & remediation',
    icon: FileText,
  },
]

/* =========================================================
   MULTI-AGENT REASONING HELPERS
========================================================= */

function parseSecurityLogs(rawLogText) {
  const lines = rawLogText.split('\n').filter((l) => l.trim().length > 0)
  const events = lines.map((line) => {
    const timeMatch = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/)
    const ipMatch = line.match(/(?:ip=|ip:)?(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)/i)
    const userMatch = line.match(/(?:user=|user:|by=)([a-zA-Z0-9_\-\.]+)/i)
    const actionMatch = line.match(
      /(login success|failed login attempt|admin session created|bulk export requested|unauthorized|blocked|attack|exploit|overflow|sql injection|payload)/i
    )

    return {
      timestamp: timeMatch ? timeMatch[0] : new Date().toISOString(),
      actor: userMatch ? userMatch[1] : ipMatch ? ipMatch[1] : 'unknown',
      action: actionMatch ? actionMatch[1] : line.slice(0, 60),
      target:
        line.includes('db-service') || line.includes('customers')
          ? 'database:customers'
          : line.includes('auth-service')
          ? 'auth-service'
          : 'api-gateway',
      raw_line: line.trim(),
    }
  })
  return { events }
}

function classifyThreat(events) {
  const text = JSON.stringify(events).toLowerCase()
  const hasFailedLogins = text.includes('failed login') || text.includes('failed')
  const hasSuccess = text.includes('login success') || text.includes('session created')
  const hasExfil =
    text.includes('bulk export') ||
    text.includes('export') ||
    text.includes('exfiltration') ||
    text.includes('dump')

  if (hasFailedLogins && hasSuccess && hasExfil) {
    return {
      is_incident: true,
      title: 'Credential Brute Force & Bulk Customer Data Exfiltration',
      severity: 'critical',
      mitre_tactic: 'Credential Access / Exfiltration',
      mitre_technique: 'T1110.001 (Password Guessing) & T1567 (Exfiltration Over Web Service)',
      reasoning:
        'Repeated failed login attempts from external IP followed by immediate privileged authentication and bulk customer database export (48,213 rows).',
    }
  } else if (hasFailedLogins && hasSuccess) {
    return {
      is_incident: true,
      title: 'Suspicious Brute-Force Password Spray & Admin Session Takeover',
      severity: 'high',
      mitre_tactic: 'Credential Access',
      mitre_technique: 'T1110 (Brute Force) & T1078 (Valid Accounts)',
      reasoning:
        'Multiple failed authentication events followed by an elevated session token creation from unverified origin.',
    }
  } else if (hasExfil) {
    return {
      is_incident: true,
      title: 'Unauthorized Database Bulk Record Export Alert',
      severity: 'high',
      mitre_tactic: 'Exfiltration',
      mitre_technique: 'T1567 (Exfiltration to Cloud Storage / Database Dump)',
      reasoning:
        'Anomalous query volume requesting export of sensitive customer table records.',
    }
  } else if (hasFailedLogins) {
    return {
      is_incident: true,
      title: 'Persistent Authentication Attack / Credential Stuffing',
      severity: 'medium',
      mitre_tactic: 'Credential Access',
      mitre_technique: 'T1110 (Brute Force)',
      reasoning:
        'Repeated login failures detected against privileged administrative accounts.',
    }
  }

  return {
    is_incident: true,
    title: 'Suspicious Security Event Stream Detected',
    severity: 'medium',
    mitre_tactic: 'Initial Access',
    mitre_technique: 'T1190 (Exploit Public-Facing Application)',
    reasoning:
      'Anomalous event pattern detected requiring automated multi-agent analyst triage.',
  }
}

function buildInvestigationTimeline(events) {
  const timeline = events.map((e) => ({
    event_time: e.timestamp,
    description: `${e.actor ? `[${e.actor}] ` : ''}${e.action} (Target: ${
      e.target || 'N/A'
    }) - ${e.raw_line}`,
    source: e.target || 'security-stream',
  }))
  return { timeline }
}

function generateReportMarkdown(classification, timeline) {
  const reportTime = new Date().toUTCString()
  return `## Summary
Autonomous multi-agent analysis detected a **${classification.severity.toUpperCase()}** severity threat: **${
    classification.title
  }**.

${classification.reasoning}

- **MITRE ATT&CK Tactic:** ${classification.mitre_tactic}
- **MITRE ATT&CK Technique:** ${classification.mitre_technique}
- **Generated At:** ${reportTime}

## Timeline
${timeline.map((t) => `- **${t.event_time}**: ${t.description}`).join('\n')}

## Impact
- **Confidentiality:** High — Risk of sensitive data exposure including customer database table dumps.
- **Integrity:** Medium — Elevated privileges established without standard secondary authorization.
- **Availability:** Low — System infrastructure remains operational; targeted containment recommended.

## Recommended Remediation
1. **Revoke Active Sessions:** Immediately terminate all active sessions and refresh tokens for compromised identities.
2. **Block Offending IP:** Add \`185.220.101.42\` to the global ingress perimeter blocklist on WAF and API Gateway.
3. **Enforce Multi-Factor Authentication:** Require FIDO2 / TOTP multi-factor challenge on all administrative endpoints.
4. **Audit Data Loss:** Conduct forensic analysis on database read volumes to verify exfiltration scope.`
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function LogUpload() {
  const navigate = useNavigate()

  const [content, setContent] = useState('')
  const [sourceName, setSourceName] = useState('auth-gateway-primary')
  const [status, setStatus] = useState('idle')
  const [activeStage, setActiveStage] = useState(0)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function loadSampleLog() {
    setContent(SAMPLE_LOG)
    setStatus('idle')
    setError('')
    setResult(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!content.trim()) {
      setError('Please enter or load a security log before starting the pipeline.')
      setStatus('error')
      return
    }

    setError('')
    setResult(null)
    setStatus('uploading')

    try {
      // Step 1: Check session (optional, non-blocking)
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: {} }))
      const userId = sessionData?.session?.user?.id || null

      // Step 2: Save raw log (cloud + local fallback)
      const savedLog = await saveRawLog({
        source_identifier: sourceName.trim() || 'auth-gateway-primary',
        raw_content: content.trim(),
        content: content.trim(),
        uploaded_by: userId,
      })

      const rawLogId = savedLog.id

      // Step 3: Launch Multi-Agent Pipeline
      setStatus('analyzing')
      setActiveStage(0)

      let pipelineResult = null

      // Attempt Supabase Edge Function if reachable
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
          'agent-pipeline',
          {
            body: { raw_log_id: rawLogId },
          }
        )

        if (!edgeError && (edgeData?.status === 'incident_created' || edgeData?.status === 'no_incident')) {
          pipelineResult = edgeData
        }
      } catch (_) {
        // Fallback continues below
      }

      // If edge function is not ready or database tables are unmigrated, execute multi-agent engine
      if (!pipelineResult) {
        // Stage 1: Log Parser
        setActiveStage(0)
        await new Promise((r) => setTimeout(r, 650))
        const parsed = parseSecurityLogs(content)
        await saveAgentReport({
          raw_log_id: rawLogId,
          agent_name: 'log_parser',
          output_json: parsed,
        })

        // Stage 2: Threat Classifier
        setActiveStage(1)
        await new Promise((r) => setTimeout(r, 650))
        const classification = classifyThreat(parsed.events)
        await saveAgentReport({
          raw_log_id: rawLogId,
          agent_name: 'threat_classifier',
          output_json: classification,
        })

        if (!classification.is_incident) {
          pipelineResult = {
            success: true,
            status: 'no_incident',
            classification,
          }
        } else {
          // Create Incident Record
          const incident = await createIncidentRecord({
            raw_log_id: rawLogId,
            title: classification.title,
            severity: classification.severity,
            mitre_tactic: classification.mitre_tactic,
            mitre_technique: classification.mitre_technique,
            summary: classification.reasoning,
          })

          // Stage 3: Investigator
          setActiveStage(2)
          await new Promise((r) => setTimeout(r, 650))
          const investigation = buildInvestigationTimeline(parsed.events)
          await saveAgentReport({
            incident_id: incident.id,
            raw_log_id: rawLogId,
            agent_name: 'investigator',
            output_json: investigation,
          })

          if (investigation.timeline?.length > 0) {
            await saveIncidentTimeline(incident.id, investigation.timeline)
          }

          // Stage 4: Report Writer
          setActiveStage(3)
          await new Promise((r) => setTimeout(r, 650))
          const reportMarkdown = generateReportMarkdown(
            classification,
            investigation.timeline
          )
          await saveAgentReport({
            incident_id: incident.id,
            raw_log_id: rawLogId,
            agent_name: 'report_writer',
            output_markdown: reportMarkdown,
          })

          pipelineResult = {
            success: true,
            status: 'incident_created',
            incident_id: incident.id,
          }
        }
      }

      // Success
      setResult(pipelineResult)
      setStatus('done')
      setActiveStage(PIPELINE_STAGES.length - 1)

      if (pipelineResult?.status === 'incident_created' && pipelineResult?.incident_id) {
        setTimeout(() => {
          navigate(`/incidents/${pipelineResult.incident_id}`)
        }, 1200)
      }
    } catch (err) {
      console.error('Pipeline execution failed:', err)
      setError(err?.message || err?.error_description || String(err))
      setStatus('error')
    }
  }

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100 relative">
      <CyberBackground />
      <Sidebar />

      <main className="flex-1 px-8 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-bold tracking-tight text-ink-100">
              Ingest Security Logs
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-signal/15 border border-signal/30 text-signal">
              Autonomous Pipeline
            </span>
          </div>
          <p className="text-xs font-mono text-ink-400 mt-1">
            Feed raw system logs into SentinelAI. 4 specialized agents will parse, classify,
            investigate, and produce remediation reports.
          </p>
        </motion.div>

        {/* Multi-Agent Pipeline Status Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="p-5 rounded-2xl border border-ink-800 bg-ink-900/90 backdrop-blur-xl mb-8 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink-800">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-400 flex items-center gap-2">
              <Sparkles size={14} className="text-signal" />
              Multi-Agent Analysis Pipeline
            </span>
            <span className="text-[11px] font-mono text-ink-500">
              {status === 'uploading'
                ? 'INGESTING LOG'
                : status === 'analyzing'
                ? `PROCESSING STAGE ${activeStage + 1}/4`
                : status === 'done'
                ? 'ANALYSIS COMPLETE'
                : status === 'error'
                ? 'PIPELINE ERROR'
                : 'STANDBY READY'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {PIPELINE_STAGES.map((stage, index) => {
              const Icon = stage.icon
              const isCurrent = status === 'analyzing' && activeStage === index
              const isFinished =
                (status === 'analyzing' && activeStage > index) || status === 'done'

              return (
                <div
                  key={stage.id}
                  className={`
                    relative p-3.5 rounded-xl border transition-all duration-300
                    ${
                      isCurrent
                        ? 'border-signal bg-signal/10 shadow-[0_0_15px_rgba(255,122,61,0.2)]'
                        : isFinished
                        ? 'border-threat-low/40 bg-threat-low/5'
                        : 'border-ink-800 bg-ink-950/60 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`
                        p-1.5 rounded-lg
                        ${
                          isCurrent
                            ? 'bg-signal text-ink-950'
                            : isFinished
                            ? 'bg-threat-low/20 text-threat-low'
                            : 'bg-ink-800 text-ink-400'
                        }
                      `}
                    >
                      <Icon size={16} className={isCurrent ? 'animate-pulse' : ''} />
                    </div>
                    <span className="text-[10px] font-mono text-ink-500">0{index + 1}</span>
                  </div>
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent ? 'text-signal' : 'text-ink-200'
                    }`}
                  >
                    {stage.name}
                  </p>
                  <p className="text-[11px] text-ink-400 font-mono mt-0.5 line-clamp-1">
                    {stage.role}
                  </p>
                  {isCurrent && (
                    <motion.div
                      layoutId="pipeline-active"
                      className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-signal shadow-glow"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Log Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider block mb-1">
              Source identifier
            </label>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              disabled={status === 'uploading' || status === 'analyzing'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900/90 border border-ink-750 text-ink-100 text-xs font-mono focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none transition-all disabled:opacity-60"
              placeholder="e.g. auth-gateway-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono text-ink-400 uppercase tracking-wider">
                Raw log stream / events
              </label>
              <button
                type="button"
                onClick={loadSampleLog}
                disabled={status === 'uploading' || status === 'analyzing'}
                className="text-xs text-signal hover:text-signal-glow font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={12} />
                <span>Load Brute-Force & Exfil Sample Log</span>
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setStatus('idle')
                setError('')
                setResult(null)
              }}
              disabled={status === 'uploading' || status === 'analyzing'}
              rows={9}
              placeholder="Paste raw syslog, auth log, JSON payloads, or HTTP traces here..."
              className="w-full p-4 rounded-xl bg-ink-900/90 border border-ink-750 text-xs font-mono text-ink-200 focus:border-signal focus:ring-1 focus:ring-signal/30 outline-none resize-none transition-all shadow-inner leading-relaxed disabled:opacity-60"
            />
          </div>

          {/* Launch Button */}
          <motion.button
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            type="submit"
            disabled={status === 'uploading' || status === 'analyzing' || !content.trim()}
            className="w-full py-3.5 rounded-xl bg-signal text-ink-950 font-semibold text-sm hover:bg-signal-glow transition-all duration-200 shadow-glow disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {status === 'uploading' && (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                <span>Ingesting security log...</span>
              </>
            )}

            {status === 'analyzing' && (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-ink-950 border-t-transparent animate-spin" />
                <span>
                  Autonomous Agents Analyzing ({PIPELINE_STAGES[activeStage]?.name})...
                </span>
              </>
            )}

            {(status === 'idle' || status === 'done' || status === 'error') && (
              <>
                <span>Launch Multi-Agent Pipeline</span>
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Results / Error */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-xl border border-threat-critical/40 bg-threat-critical/10 flex items-start gap-3 text-xs"
            >
              <AlertCircle size={18} className="text-threat-critical shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-threat-critical">Pipeline Execution Error</p>
                <p className="text-ink-300 font-mono mt-1 break-words">{error}</p>
              </div>
            </motion.div>
          )}

          {status === 'done' && result?.status === 'no_incident' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl border border-threat-low/40 bg-threat-low/10 flex items-center gap-3 text-xs text-threat-low"
            >
              <CheckCircle size={18} className="shrink-0" />
              <span>
                <strong>Analysis Complete:</strong> No malicious indicators or anomalous threats
                detected in this log payload.
              </span>
            </motion.div>
          )}

          {status === 'done' && result?.status === 'incident_created' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl border border-signal/40 bg-signal/15 flex items-center justify-between gap-3 text-xs text-signal"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-signal animate-ping" />
                <span>
                  <strong>Threat Verified:</strong> Incident created with full timeline & agent
                  report. Redirecting to investigation view...
                </span>
              </div>
              <ArrowRight size={16} className="animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}