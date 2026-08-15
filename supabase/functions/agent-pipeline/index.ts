// SentinelAI agent-pipeline
//
// A 4-stage agent chain that turns a raw log blob into a classified,
// investigated, reported security incident. Each stage is a separate
// Claude call constrained to return JSON, and each stage's output is
// written to `agent_reports` for a full audit trail before the next
// stage runs.
//
// Deploy:  supabase functions deploy agent-pipeline
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Invoke from the frontend with: supabase.functions.invoke('agent-pipeline', { body: { raw_log_id } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

async function callClaude(system: string, userContent: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: userContent }]
    })
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude API error (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('')
}

function extractJson(raw: string): any {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenced ? fenced[1] : raw
  return JSON.parse(jsonStr.trim())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { raw_log_id } = await req.json()
    if (!raw_log_id) throw new Error('raw_log_id is required')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: rawLog, error: fetchErr } = await supabase
      .from('raw_logs')
      .select('*')
      .eq('id', raw_log_id)
      .single()
    if (fetchErr || !rawLog) throw new Error('raw log not found')

    // ── Stage 1: Log Parser Agent ──────────────────────────────
    const parserOut = await callClaude(
      `You are a log-parsing agent. Extract structured events from raw log text.
Return ONLY valid JSON: { "events": [ { "timestamp": string|null, "actor": string|null, "action": string, "target": string|null, "raw_line": string } ] }
No prose, no markdown fences, JSON only.`,
      rawLog.content
    )
    const parsed = extractJson(parserOut)
    await supabase.from('agent_reports').insert({
      raw_log_id, agent_name: 'log_parser', output_json: parsed
    })

    // ── Stage 2: Threat Classifier Agent ───────────────────────
    const classifierOut = await callClaude(
      `You are a threat-classification agent aligned to MITRE ATT&CK. Given structured log events,
decide if they represent a security incident. Return ONLY valid JSON:
{ "is_incident": boolean, "title": string, "severity": "critical"|"high"|"medium"|"low"|"info",
  "mitre_tactic": string|null, "mitre_technique": string|null, "reasoning": string }
No prose, no markdown fences, JSON only.`,
      JSON.stringify(parsed.events)
    )
    const classification = extractJson(classifierOut)
    await supabase.from('agent_reports').insert({
      raw_log_id, agent_name: 'threat_classifier', output_json: classification
    })

    if (!classification.is_incident) {
      await supabase.from('raw_logs').update({ processed: true }).eq('id', raw_log_id)
      return new Response(JSON.stringify({ status: 'no_incident', classification }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      })
    }

    // Create the incident row now that we know it's real
    const { data: incident, error: incErr } = await supabase
      .from('incidents')
      .insert({
        org_id: rawLog.org_id,
        raw_log_id,
        title: classification.title,
        severity: classification.severity,
        mitre_tactic: classification.mitre_tactic,
        mitre_technique: classification.mitre_technique,
        summary: classification.reasoning
      })
      .select()
      .single()
    if (incErr) throw incErr

    // ── Stage 3: Investigator Agent ────────────────────────────
    const investigatorOut = await callClaude(
      `You are an investigator agent. Given parsed events and a threat classification, build a
correlated timeline of what happened, in order. Return ONLY valid JSON:
{ "timeline": [ { "event_time": string|null, "description": string, "source": string|null } ] }
No prose, no markdown fences, JSON only.`,
      JSON.stringify({ events: parsed.events, classification })
    )
    const investigation = extractJson(investigatorOut)
    await supabase.from('agent_reports').insert({
      incident_id: incident.id, raw_log_id, agent_name: 'investigator', output_json: investigation
    })

    if (Array.isArray(investigation.timeline) && investigation.timeline.length > 0) {
      await supabase.from('incident_timeline').insert(
        investigation.timeline.map((t: any) => ({
          incident_id: incident.id,
          event_time: t.event_time,
          description: t.description,
          source: t.source
        }))
      )
    }

    // ── Stage 4: Report Writer Agent ───────────────────────────
    const reportMarkdown = await callClaude(
      `You are a security report-writing agent. Given an incident classification and timeline,
write a concise incident report in markdown with sections: ## Summary, ## Timeline,
## Impact, ## Recommended Remediation. Be specific and actionable. Markdown only, no JSON.`,
      JSON.stringify({ classification, timeline: investigation.timeline })
    )
    await supabase.from('agent_reports').insert({
      incident_id: incident.id, raw_log_id, agent_name: 'report_writer', output_markdown: reportMarkdown
    })

    await supabase.from('raw_logs').update({ processed: true }).eq('id', raw_log_id)

    return new Response(JSON.stringify({ status: 'incident_created', incident_id: incident.id }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    })
  }
})
