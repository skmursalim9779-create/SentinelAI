import { supabase } from './supabaseClient.js'

const LOCAL_STORAGE_KEY_INCIDENTS = 'sentinelai_local_incidents'
const LOCAL_STORAGE_KEY_TIMELINE = 'sentinelai_local_timeline'
const LOCAL_STORAGE_KEY_REPORTS = 'sentinelai_local_reports'
const LOCAL_STORAGE_KEY_LOGS = 'sentinelai_local_logs'

const DEFAULT_SAMPLE_INCIDENTS = [
  {
    id: 'inc-sample-01',
    title: 'Distributed SSH Credential Stuffing & Admin Takeover',
    severity: 'critical',
    mitre_tactic: 'Credential Access',
    mitre_technique: 'T1110.004 (Credential Stuffing)',
    status: 'investigating',
    summary: 'Massive automated authentication assault across 14 edge nodes resulting in elevated shell generation.',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString()
  },
  {
    id: 'inc-sample-02',
    title: 'Customer PII Database Exfiltration via Staging Gateway',
    severity: 'high',
    mitre_tactic: 'Exfiltration',
    mitre_technique: 'T1567.002 (Exfiltration to Cloud Storage)',
    status: 'open',
    summary: 'Anomalous egress volume (48.2k records) detected from customer database tables to external endpoint.',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'inc-sample-03',
    title: 'Anomalous CloudTrail IAM Role Permission Escalation',
    severity: 'medium',
    mitre_tactic: 'Privilege Escalation',
    mitre_technique: 'T1078.004 (Cloud Accounts)',
    status: 'resolved',
    summary: 'Temporary security token assumed by service-mesh worker with unexpected AdministratorAccess attachments.',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  }
]

function getLocal(key, defaultVal = []) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultVal
    return JSON.parse(raw)
  } catch (_) {
    return defaultVal
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch (err) {
    console.warn('localStorage save failed:', err)
  }
}

// Ensure default samples exist if empty
export function initLocalStore() {
  const existing = getLocal(LOCAL_STORAGE_KEY_INCIDENTS, null)
  if (!existing || existing.length === 0) {
    setLocal(LOCAL_STORAGE_KEY_INCIDENTS, DEFAULT_SAMPLE_INCIDENTS)
  }
}

export async function saveRawLog({ source_identifier, content, raw_content, uploaded_by }) {
  const logId = crypto.randomUUID ? crypto.randomUUID() : 'log-' + Date.now()
  const logPayload = {
    id: logId,
    source_identifier: source_identifier || 'auth-gateway-primary',
    content: content || raw_content || '',
    raw_content: raw_content || content || '',
    uploaded_by: uploaded_by || null,
    processed: false,
    created_at: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase
      .from('raw_logs')
      .insert({
        source_identifier: logPayload.source_identifier,
        content: logPayload.content,
        raw_content: logPayload.raw_content,
        uploaded_by: logPayload.uploaded_by
      })
      .select('id')
      .single()

    if (!error && data?.id) {
      return { id: data.id, isLocal: false }
    }
  } catch (err) {
    console.warn('Supabase raw_logs insert failed, using local store:', err)
  }

  // Fallback to local storage
  const logs = getLocal(LOCAL_STORAGE_KEY_LOGS, [])
  logs.unshift(logPayload)
  setLocal(LOCAL_STORAGE_KEY_LOGS, logs)
  return { id: logId, isLocal: true }
}

export async function createIncidentRecord({ raw_log_id, title, severity, mitre_tactic, mitre_technique, summary }) {
  const incidentId = crypto.randomUUID ? crypto.randomUUID() : 'inc-' + Date.now()
  const incidentPayload = {
    id: incidentId,
    raw_log_id: raw_log_id || null,
    title: title || 'Security Incident Detected',
    severity: severity || 'high',
    mitre_tactic: mitre_tactic || 'Initial Access',
    mitre_technique: mitre_technique || 'Valid Accounts',
    status: 'open',
    summary: summary || 'Automated triage detected malicious anomaly.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  let savedCloud = false
  try {
    const { data, error } = await supabase
      .from('incidents')
      .insert({
        raw_log_id: incidentPayload.raw_log_id,
        title: incidentPayload.title,
        severity: incidentPayload.severity,
        mitre_tactic: incidentPayload.mitre_tactic,
        mitre_technique: incidentPayload.mitre_technique,
        status: incidentPayload.status,
        summary: incidentPayload.summary
      })
      .select()
      .single()

    if (!error && data?.id) {
      incidentPayload.id = data.id
      savedCloud = true
    }
  } catch (err) {
    console.warn('Supabase incidents insert failed, using local fallback:', err)
  }

  // Always sync to local store for resilience
  const incidents = getLocal(LOCAL_STORAGE_KEY_INCIDENTS, DEFAULT_SAMPLE_INCIDENTS)
  incidents.unshift(incidentPayload)
  setLocal(LOCAL_STORAGE_KEY_INCIDENTS, incidents)

  return incidentPayload
}

export async function saveIncidentTimeline(incidentId, timelineItems) {
  if (!timelineItems || timelineItems.length === 0) return

  const rows = timelineItems.map((item) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : 'tl-' + Math.random(),
    incident_id: incidentId,
    event_time: item.event_time || new Date().toISOString(),
    description: item.description || '',
    source: item.source || null,
    created_at: new Date().toISOString()
  }))

  try {
    const { error } = await supabase.from('incident_timeline').insert(
      rows.map((r) => ({
        incident_id: r.incident_id,
        event_time: r.event_time,
        description: r.description,
        source: r.source
      }))
    )
    if (error) throw error
  } catch (err) {
    console.warn('Supabase timeline insert failed, saving locally:', err)
  }

  const existing = getLocal(LOCAL_STORAGE_KEY_TIMELINE, [])
  setLocal(LOCAL_STORAGE_KEY_TIMELINE, [...rows, ...existing])
}

export async function saveAgentReport({ incident_id, raw_log_id, agent_name, output_json, output_markdown }) {
  const reportPayload = {
    id: crypto.randomUUID ? crypto.randomUUID() : 'rep-' + Math.random(),
    incident_id: incident_id || null,
    raw_log_id: raw_log_id || null,
    agent_name,
    output_json: output_json || null,
    output_markdown: output_markdown || null,
    created_at: new Date().toISOString()
  }

  try {
    const { error } = await supabase.from('agent_reports').insert({
      incident_id: reportPayload.incident_id,
      raw_log_id: reportPayload.raw_log_id,
      agent_name: reportPayload.agent_name,
      output_json: reportPayload.output_json,
      output_markdown: reportPayload.output_markdown
    })
    if (error) throw error
  } catch (err) {
    console.warn('Supabase agent_reports insert failed, saving locally:', err)
  }

  const existing = getLocal(LOCAL_STORAGE_KEY_REPORTS, [])
  setLocal(LOCAL_STORAGE_KEY_REPORTS, [reportPayload, ...existing])
}

export async function fetchAllIncidents() {
  initLocalStore()
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Supabase fetchAllIncidents failed, returning local storage:', err)
  }

  return getLocal(LOCAL_STORAGE_KEY_INCIDENTS, DEFAULT_SAMPLE_INCIDENTS)
}

export async function fetchIncidentDetails(incidentId) {
  let incident = null
  let timeline = []
  let report = null

  try {
    const [{ data: inc }, { data: tl }, { data: reports }] = await Promise.all([
      supabase.from('incidents').select('*').eq('id', incidentId).maybeSingle(),
      supabase.from('incident_timeline').select('*').eq('incident_id', incidentId).order('event_time'),
      supabase
        .from('agent_reports')
        .select('*')
        .eq('incident_id', incidentId)
        .eq('agent_name', 'report_writer')
        .order('created_at', { ascending: false })
        .limit(1)
    ])

    if (inc) incident = inc
    if (tl && tl.length > 0) timeline = tl
    if (reports && reports[0]) report = reports[0]
  } catch (err) {
    console.warn('Supabase fetchIncidentDetails failed, checking local store:', err)
  }

  if (!incident) {
    const allIncidents = getLocal(LOCAL_STORAGE_KEY_INCIDENTS, DEFAULT_SAMPLE_INCIDENTS)
    incident = allIncidents.find((i) => i.id === incidentId) || allIncidents[0] || null
  }

  if (timeline.length === 0 && incident) {
    const allTimeline = getLocal(LOCAL_STORAGE_KEY_TIMELINE, [])
    timeline = allTimeline.filter((t) => t.incident_id === incident.id)
    if (timeline.length === 0) {
      timeline = [
        {
          id: 'tl-default-1',
          incident_id: incident.id,
          event_time: incident.created_at,
          description: `Initial malicious event detected: ${incident.title}`,
          source: 'auth-service'
        }
      ]
    }
  }

  if (!report && incident) {
    const allReports = getLocal(LOCAL_STORAGE_KEY_REPORTS, [])
    report =
      allReports.find((r) => r.incident_id === incident.id && r.agent_name === 'report_writer') ||
      {
        output_markdown: `## Summary\nIncident **${incident.title}** (${incident.severity.toUpperCase()}).\n\n${incident.summary}\n\n## Timeline\n- **${incident.created_at}**: Autonomous triage initiated.\n\n## Impact\n- Security status: ${incident.severity.toUpperCase()}\n- Tactic: ${incident.mitre_tactic || 'N/A'}\n- Technique: ${incident.mitre_technique || 'N/A'}\n\n## Recommended Remediation\n1. Review active authorization logs.\n2. Invalidate expired session tokens.\n3. Verify network edge ingress rules.`
      }
  }

  return { incident, timeline, report }
}

export async function updateIncidentStatus(incidentId, status) {
  try {
    await supabase.from('incidents').update({ status }).eq('id', incidentId)
  } catch (err) {
    console.warn('Supabase update status failed, updating local store:', err)
  }

  const allIncidents = getLocal(LOCAL_STORAGE_KEY_INCIDENTS, DEFAULT_SAMPLE_INCIDENTS)
  const updated = allIncidents.map((i) => (i.id === incidentId ? { ...i, status } : i))
  setLocal(LOCAL_STORAGE_KEY_INCIDENTS, updated)
}
