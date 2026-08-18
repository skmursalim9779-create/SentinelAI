// @ts-nocheck

// SentinelAI - Agent Pipeline
//
// 4-stage security analysis pipeline:
// 1. Log Parser
// 2. Threat Classifier
// 3. Investigator
// 4. Report Writer
//
// Deploy:
// supabase functions deploy agent-pipeline
//
// Required secret:
// supabase secrets set ANTHROPIC_API_KEY=your_key_here

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MODEL = 'claude-3-5-sonnet-20241022'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}


// ============================================================
// HELPERS
// ============================================================

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders
  })
}


function extractJson(raw: string): any {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Claude returned empty response')
  }

  // Remove markdown fences if Claude accidentally adds them
  let cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  // Try direct JSON
  try {
    return JSON.parse(cleaned)
  } catch (_) {
    // Continue below
  }

  // Try extracting first JSON object
  const firstObject = cleaned.indexOf('{')
  const lastObject = cleaned.lastIndexOf('}')

  if (firstObject !== -1 && lastObject !== -1) {
    const candidate = cleaned.slice(firstObject, lastObject + 1)

    try {
      return JSON.parse(candidate)
    } catch (_) {
      // Continue
    }
  }

  // Try extracting JSON array
  const firstArray = cleaned.indexOf('[')
  const lastArray = cleaned.lastIndexOf(']')

  if (firstArray !== -1 && lastArray !== -1) {
    const candidate = cleaned.slice(firstArray, lastArray + 1)

    try {
      return JSON.parse(candidate)
    } catch (_) {
      // Continue
    }
  }

  throw new Error(
    `Could not parse Claude JSON response: ${raw.slice(0, 1000)}`
  )
}


// ============================================================
// CLAUDE API
// ============================================================

async function callClaude(
  systemPrompt: string,
  userContent: string
): Promise<string> {

  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is missing. Set it with: supabase secrets set ANTHROPIC_API_KEY=...'
    )
  }

  const response = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },

      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,

        system: systemPrompt,

        messages: [
          {
            role: 'user',
            content: userContent
          }
        ]
      })
    }
  )


  const responseText = await response.text()


  if (!response.ok) {
    throw new Error(
      `Claude API error ${response.status}: ${responseText}`
    )
  }


  let data: any

  try {
    data = JSON.parse(responseText)
  } catch (_) {
    throw new Error(
      `Claude returned invalid API JSON: ${responseText}`
    )
  }


  if (!data.content || !Array.isArray(data.content)) {
    throw new Error(
      `Claude response missing content: ${responseText}`
    )
  }


  const text = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('')


  if (!text) {
    throw new Error('Claude returned no text content')
  }


  return text
}


// ============================================================
// MAIN EDGE FUNCTION
// ============================================================

Deno.serve(async (req) => {

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    })
  }


  // ----------------------------------------------------------
  // ONLY POST
  // ----------------------------------------------------------

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        error: 'Method not allowed. Use POST.'
      },
      405
    )
  }


  try {

    console.log('==========================================')
    console.log('SentinelAI agent-pipeline started')
    console.log('==========================================')


    // --------------------------------------------------------
    // ENVIRONMENT CHECK
    // --------------------------------------------------------

    if (!SUPABASE_URL) {
      throw new Error('SUPABASE_URL is missing')
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
    }

    if (!ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY is missing from Supabase Edge Function secrets'
      )
    }


    // --------------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------------

    let body: any

    try {
      body = await req.json()
    } catch (_) {
      throw new Error('Request body must be valid JSON')
    }


    const raw_log_id = body?.raw_log_id


    if (!raw_log_id) {
      throw new Error(
        'raw_log_id is required'
      )
    }


    console.log(`Processing raw log: ${raw_log_id}`)


    // --------------------------------------------------------
    // SUPABASE CLIENT
    // --------------------------------------------------------

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    )


    // ========================================================
    // FETCH RAW LOG
    // ========================================================

    console.log('Fetching raw log...')


    const {
      data: rawLog,
      error: fetchErr
    } = await supabase
      .from('raw_logs')
      .select('*')
      .eq('id', raw_log_id)
      .single()


    if (fetchErr) {
      throw new Error(
        `Failed to fetch raw log: ${fetchErr.message}`
      )
    }


    if (!rawLog) {
      throw new Error(
        `Raw log not found: ${raw_log_id}`
      )
    }


    if (!rawLog.content) {
      throw new Error(
        'Raw log has no content'
      )
    }


    console.log('Raw log found')


    // ========================================================
    // STAGE 1 - LOG PARSER
    // ========================================================

    console.log('Stage 1: Log Parser')


    const parserOut = await callClaude(

      `You are a log-parsing agent.

Extract structured security events from the raw log text.

Return ONLY valid JSON.

Required format:

{
  "events": [
    {
      "timestamp": "string or null",
      "actor": "string or null",
      "action": "string",
      "target": "string or null",
      "raw_line": "string"
    }
  ]
}

Do not return markdown.
Do not return explanations.
Return JSON only.`,

      rawLog.content
    )


    const parsed = extractJson(parserOut)


    if (!Array.isArray(parsed.events)) {
      throw new Error(
        'Log Parser returned invalid events array'
      )
    }


    console.log(
      `Parser extracted ${parsed.events.length} events`
    )


    const {
      error: parserReportError
    } = await supabase
      .from('agent_reports')
      .insert({
        raw_log_id: raw_log_id,
        agent_name: 'log_parser',
        output_json: parsed
      })


    if (parserReportError) {
      throw new Error(
        `Failed to save parser report: ${parserReportError.message}`
      )
    }


    // ========================================================
    // STAGE 2 - THREAT CLASSIFIER
    // ========================================================

    console.log('Stage 2: Threat Classifier')


    const classifierOut = await callClaude(

      `You are a threat-classification agent aligned with MITRE ATT&CK.

Analyze the structured log events.

Determine whether they represent a genuine security incident.

Return ONLY valid JSON.

Required format:

{
  "is_incident": true,
  "title": "string",
  "severity": "critical",
  "mitre_tactic": "string or null",
  "mitre_technique": "string or null",
  "reasoning": "string"
}

severity MUST be one of:

critical
high
medium
low
info

Do not return markdown.
Do not return explanations outside JSON.`,

      JSON.stringify(parsed.events)
    )


    const classification = extractJson(classifierOut)


    if (typeof classification.is_incident !== 'boolean') {
      throw new Error(
        'Threat Classifier returned invalid is_incident'
      )
    }


    console.log(
      `Incident detected: ${classification.is_incident}`
    )


    const {
      error: classifierReportError
    } = await supabase
      .from('agent_reports')
      .insert({
        raw_log_id: raw_log_id,
        agent_name: 'threat_classifier',
        output_json: classification
      })


    if (classifierReportError) {
      throw new Error(
        `Failed to save classifier report: ${classifierReportError.message}`
      )
    }


    // ========================================================
    // NO INCIDENT
    // ========================================================

    if (!classification.is_incident) {

      console.log('No security incident detected')


      const {
        error: updateError
      } = await supabase
        .from('raw_logs')
        .update({
          processed: true
        })
        .eq('id', raw_log_id)


      if (updateError) {
        throw new Error(
          `Failed to mark raw log processed: ${updateError.message}`
        )
      }


      return jsonResponse({
        success: true,
        status: 'no_incident',
        classification
      })
    }


    // ========================================================
    // CREATE INCIDENT
    // ========================================================

    console.log('Creating incident...')


    const incidentPayload: any = {
      raw_log_id: raw_log_id,
      title: classification.title || 'Security Incident Detected',
      severity: classification.severity || 'high',
      mitre_tactic: classification.mitre_tactic || 'Initial Access',
      mitre_technique: classification.mitre_technique || 'Valid Accounts',
      summary: classification.reasoning || 'Malicious activity detected in ingested logs.'
    }

    if (rawLog.org_id) {
      incidentPayload.org_id = rawLog.org_id
    }

    const {
      data: incident,
      error: incidentError
    } = await supabase
      .from('incidents')
      .insert(incidentPayload)
      .select()
      .single()


    if (incidentError) {
      throw new Error(
        `Failed to create incident: ${incidentError.message}`
      )
    }


    if (!incident) {
      throw new Error(
        'Incident was not created'
      )
    }


    console.log(
      `Incident created: ${incident.id}`
    )


    // ========================================================
    // STAGE 3 - INVESTIGATOR
    // ========================================================

    console.log('Stage 3: Investigator')


    const investigatorOut = await callClaude(

      `You are a security investigation agent.

Given the parsed events and threat classification, reconstruct the sequence of events.

Create a correlated timeline in chronological order.

Return ONLY valid JSON.

Required format:

{
  "timeline": [
    {
      "event_time": "string or null",
      "description": "string",
      "source": "string or null"
    }
  ]
}

Do not return markdown.
Do not return explanations outside JSON.`,

      JSON.stringify({
        events: parsed.events,
        classification: classification
      })
    )


    const investigation = extractJson(
      investigatorOut
    )


    if (!Array.isArray(investigation.timeline)) {
      throw new Error(
        'Investigator returned invalid timeline'
      )
    }


    console.log(
      `Timeline contains ${investigation.timeline.length} events`
    )


    const {
      error: investigatorReportError
    } = await supabase
      .from('agent_reports')
      .insert({
        incident_id: incident.id,
        raw_log_id: raw_log_id,
        agent_name: 'investigator',
        output_json: investigation
      })


    if (investigatorReportError) {
      throw new Error(
        `Failed to save investigator report: ${investigatorReportError.message}`
      )
    }


    // --------------------------------------------------------
    // SAVE TIMELINE
    // --------------------------------------------------------

    if (
      Array.isArray(investigation.timeline) &&
      investigation.timeline.length > 0
    ) {

      const timelineRows =
        investigation.timeline.map((item: any) => ({
          incident_id: incident.id,
          event_time: item.event_time ?? null,
          description: item.description ?? '',
          source: item.source ?? null
        }))


      const {
        error: timelineError
      } = await supabase
        .from('incident_timeline')
        .insert(timelineRows)


      if (timelineError) {
        throw new Error(
          `Failed to save timeline: ${timelineError.message}`
        )
      }
    }


    // ========================================================
    // STAGE 4 - REPORT WRITER
    // ========================================================

    console.log('Stage 4: Report Writer')


    const reportMarkdown = await callClaude(

      `You are a professional cybersecurity incident report writer.

Given the incident classification and investigation timeline, write a concise but useful incident report.

Use exactly these markdown sections:

## Summary

## Timeline

## Impact

## Recommended Remediation

Be specific and actionable.

Do not output JSON.
Return markdown only.`,

      JSON.stringify({
        classification: classification,
        timeline: investigation.timeline
      })
    )


    if (!reportMarkdown) {
      throw new Error(
        'Report Writer returned an empty report'
      )
    }


    console.log('Report generated')


    const {
      error: reportError
    } = await supabase
      .from('agent_reports')
      .insert({
        incident_id: incident.id,
        raw_log_id: raw_log_id,
        agent_name: 'report_writer',
        output_markdown: reportMarkdown
      })


    if (reportError) {
      throw new Error(
        `Failed to save report: ${reportError.message}`
      )
    }


    // ========================================================
    // MARK RAW LOG AS PROCESSED
    // ========================================================

    const {
      error: processedError
    } = await supabase
      .from('raw_logs')
      .update({
        processed: true
      })
      .eq('id', raw_log_id)


    if (processedError) {
      throw new Error(
        `Failed to mark raw log processed: ${processedError.message}`
      )
    }


    // ========================================================
    // SUCCESS
    // ========================================================

    console.log('==========================================')
    console.log('SentinelAI pipeline completed successfully')
    console.log(`Incident ID: ${incident.id}`)
    console.log('==========================================')


    return jsonResponse({
      success: true,
      status: 'incident_created',
      incident_id: incident.id
    })


  } catch (error) {

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    const message =
      error instanceof Error
        ? error.message
        : String(error)


    console.error('==========================================')
    console.error('SentinelAI pipeline FAILED')
    console.error(message)
    console.error('==========================================')


    return jsonResponse(
      {
        success: false,
        error: message
      },
      500
    )
  }
})