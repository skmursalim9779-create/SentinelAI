# SentinelAI — Agentic SOC Copilot

SentinelAI is a security operations dashboard for analyzing security logs and investigating potential incidents.

It uses a multi-stage AI pipeline to parse raw logs, identify potential threats, correlate related events, and generate an incident report with remediation steps.

## Features

* Paste security logs for analysis
* Parse raw log data into structured events
* Classify potential security threats
* Map detected activity to MITRE ATT&CK techniques
* Correlate related events into an incident timeline
* Generate incident reports and remediation suggestions
* Store incidents, logs, timelines, and agent outputs
* Multi-tenant data isolation using PostgreSQL Row Level Security
* Authentication through Supabase
* Server-side handling of the Anthropic API key

## Architecture

```text
React + Tailwind
       │
       ▼
Supabase
(Postgres + Auth + Realtime)
       │
       ▼
Supabase Edge Function
      agent-pipeline
       │
       ├── 1. Log Parser
       │      ↓
       │   Structured events
       │
       ├── 2. Threat Classifier
       │      ↓
       │   Severity + MITRE ATT&CK
       │
       ├── 3. Investigator
       │      ↓
       │   Correlated incident timeline
       │
       └── 4. Report Writer
              ↓
          Incident report + remediation
       │
       ▼
Anthropic API
```

The pipeline uses four stages. Each stage produces structured output that is passed to the next stage.

## Technology Stack

### Frontend

* React
* Vite
* Tailwind CSS

### Backend

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Edge Functions
* Realtime
* Storage

### AI

* Anthropic API
* Claude

### Security

* PostgreSQL Row Level Security (RLS)
* Multi-tenant organization isolation
* Server-side API secrets

## Database

The main database tables are:

| Table               | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `organizations`     | Stores organization/tenant information     |
| `profiles`          | Stores authenticated user profiles         |
| `log_sources`       | Stores sources of security logs            |
| `raw_logs`          | Stores uploaded or pasted raw logs         |
| `incidents`         | Stores detected security incidents         |
| `incident_timeline` | Stores events associated with incidents    |
| `agent_reports`     | Stores the output from each analysis stage |

The tables use Row Level Security policies based on the user's organization.

## Project Structure

```text
SentinelAI/
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
│
├── supabase/
│   ├── functions/
│   │   └── agent-pipeline/
│   │       └── index.ts
│   └── migrations/
│       └── 0001_init.sql
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── vite.config.js
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project and run:

```text
supabase/migrations/0001_init.sql
```

in the Supabase SQL Editor.

Then obtain the project URL and anon/publishable key from the Supabase project settings.

Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Configure the Edge Function

Deploy the `agent-pipeline` Edge Function using the Supabase CLI:

```bash
supabase functions deploy agent-pipeline
```

The Anthropic API key should be stored as a server-side Supabase secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=your-api-key
```

The API key should not be placed in the frontend code or committed to GitHub.

### 4. Run locally

```bash
npm run dev
```

The Vite development server will provide the local address in the terminal.

## Deployment

### Frontend

The frontend can be deployed by connecting the GitHub repository to Vercel.

After importing the project, configure:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

as environment variables in Vercel.

### Backend

The backend consists of the Supabase database, migration, authentication, and Edge Function.

The Edge Function must be deployed separately through Supabase.

## Security Considerations

SentinelAI keeps the Anthropic API key on the server side rather than exposing it to the browser.

Database access is protected using PostgreSQL Row Level Security policies so that data is scoped to the user's organization.

Never commit a `.env` file or private API keys to the repository.

## Current Workflow

```text
User
 │
 ▼
Upload / paste security logs
 │
 ▼
Log Parser
 │
 ▼
Threat Classifier
 │
 ▼
Investigator
 │
 ▼
Incident Timeline
 │
 ▼
Report Writer
 │
 ▼
Incident Report
```

## Possible Future Improvements

* Add real log ingestion from SIEM or cloud services
* Add webhook-based ingestion
* Allow the Investigator stage to query additional database information
* Add notifications for high-severity incidents
* Add analyst feedback for incorrect classifications
* Improve automated testing and validation of AI-generated results

## License

This project is currently provided for educational and portfolio purposes.
