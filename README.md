# SentinelAI — Agentic SOC Copilot

An autonomous security-operations dashboard. You upload or stream logs; a chain of
Claude-powered agents parses them, classifies threats against MITRE ATT&CK, correlates
related events into an incident timeline, and drafts a remediation report — the work a
junior SOC analyst does by hand, done in seconds.

Built to show four things at once on a resume/GitHub: **full-stack engineering**,
**agentic AI orchestration**, **applied cybersecurity**, and **secure backend design**
(RLS, multi-tenant isolation, server-side secrets).

## Architecture

```
React + Tailwind (frontend)
      │
      ▼
Supabase (Postgres + Auth + Realtime + Storage)
      │
      ▼
Supabase Edge Function: agent-pipeline (Deno)
      │  4-stage Claude agent chain:
      │  1. Log Parser        → structured events from raw text
      │  2. Threat Classifier → severity + MITRE ATT&CK tagging
      │  3. Investigator      → correlates events into a timeline
      │  4. Report Writer     → markdown incident report + remediation steps
      ▼
Anthropic API (claude-sonnet-4-6)
```

The Anthropic API key lives only in the Supabase Edge Function's server-side secrets —
never shipped to the browser. This is the correct pattern for any project that calls an
LLM from a public frontend, and it's worth mentioning in an interview.

## Setup

### 1. Supabase project
1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. In Project Settings → API, copy your Project URL and anon/publishable key.

### 2. Edge Function (agent pipeline)
```bash
supabase functions deploy agent-pipeline
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Frontend
```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 4. Deploy
- Frontend: push to GitHub → import into Vercel (auto-detects Vite) → add the two env
  vars in Vercel's dashboard.
- Backend: already live on Supabase once the migration + function are deployed.

## Database model

| Table | Purpose |
|---|---|
| `organizations` | Tenant boundary — every other table hangs off `org_id` |
| `profiles` | One row per authenticated user, linked to an org |
| `log_sources` | Named origins of logs (e.g. "prod-nginx", "auth-service") |
| `raw_logs` | Uploaded/pasted raw log text awaiting analysis |
| `incidents` | One row per detected/classified security incident |
| `incident_timeline` | Correlated events belonging to an incident |
| `agent_reports` | Full output of each agent stage, kept for audit/history |

All tables are protected by Row Level Security scoped to the caller's `org_id`, so one
organization's data is never visible to another — verified by policy, not just app code.

## Why this project (for interviewers)

- **Agentic AI**: not a single prompt — a supervised multi-step agent chain where each
  stage's output is validated JSON feeding the next stage.
- **Cybersecurity**: MITRE ATT&CK-aligned classification, incident timelines, audit trail.
- **Full-stack**: React frontend, Postgres schema design, RLS policy design, serverless
  backend, realtime updates.
- **Production hygiene**: secrets never touch the client, multi-tenant isolation enforced
  at the database layer, migrations checked into version control.

## Extending it further
- Swap manual log paste for a real ingestion endpoint (webhook from a SIEM/CloudWatch).
- Add a `tool_use` step where the Investigator agent can query the database itself.
- Add Slack/email notification on high-severity incidents.
- Add a feedback loop: analyst marks a classification wrong → fine-tune the prompt.
