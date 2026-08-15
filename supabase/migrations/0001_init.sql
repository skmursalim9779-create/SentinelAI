-- SentinelAI schema: multi-tenant SOC platform
-- Run this once in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- ORGANIZATIONS (tenant boundary)
-- ─────────────────────────────────────────────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- PROFILES (1:1 with auth.users)
-- ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  full_name text,
  role text not null default 'analyst' check (role in ('admin', 'analyst', 'viewer')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- LOG SOURCES
-- ─────────────────────────────────────────────
create table log_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  source_type text not null default 'manual' check (source_type in ('manual', 'webhook', 'file_upload')),
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RAW LOGS
-- ─────────────────────────────────────────────
create table raw_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  source_id uuid references log_sources(id) on delete set null,
  content text not null,
  uploaded_by uuid references profiles(id) on delete set null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INCIDENTS
-- ─────────────────────────────────────────────
create table incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  raw_log_id uuid references raw_logs(id) on delete set null,
  title text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  mitre_tactic text,
  mitre_technique text,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'false_positive')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INCIDENT TIMELINE (correlated events)
-- ─────────────────────────────────────────────
create table incident_timeline (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  event_time timestamptz,
  description text not null,
  source text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- AGENT REPORTS (full audit trail of each pipeline stage)
-- ─────────────────────────────────────────────
create table agent_reports (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) on delete cascade,
  raw_log_id uuid references raw_logs(id) on delete cascade,
  agent_name text not null check (agent_name in ('log_parser', 'threat_classifier', 'investigator', 'report_writer')),
  output_json jsonb,
  output_markdown text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index idx_profiles_org on profiles(org_id);
create index idx_log_sources_org on log_sources(org_id);
create index idx_raw_logs_org on raw_logs(org_id);
create index idx_raw_logs_processed on raw_logs(processed) where processed = false;
create index idx_incidents_org on incidents(org_id);
create index idx_incidents_severity on incidents(severity);
create index idx_incidents_status on incidents(status);
create index idx_timeline_incident on incident_timeline(incident_id);
create index idx_agent_reports_incident on agent_reports(incident_id);

-- ─────────────────────────────────────────────
-- HELPER: current user's org_id
-- ─────────────────────────────────────────────
create or replace function current_org_id()
returns uuid
language sql
security definer
stable
as $$
  select org_id from profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table log_sources enable row level security;
alter table raw_logs enable row level security;
alter table incidents enable row level security;
alter table incident_timeline enable row level security;
alter table agent_reports enable row level security;

-- organizations: a user can see only their own org
create policy "org_select_own" on organizations
  for select using (id = current_org_id());

-- profiles: a user can see/update their own profile; can see teammates in same org
create policy "profiles_select_same_org" on profiles
  for select using (org_id = current_org_id() or id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

-- log_sources
create policy "log_sources_all_same_org" on log_sources
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- raw_logs
create policy "raw_logs_all_same_org" on raw_logs
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- incidents
create policy "incidents_all_same_org" on incidents
  for all using (org_id = current_org_id())
  with check (org_id = current_org_id());

-- incident_timeline (scoped via parent incident's org)
create policy "timeline_select_same_org" on incident_timeline
  for select using (
    exists (select 1 from incidents i where i.id = incident_id and i.org_id = current_org_id())
  );

create policy "timeline_insert_same_org" on incident_timeline
  for insert with check (
    exists (select 1 from incidents i where i.id = incident_id and i.org_id = current_org_id())
  );

-- agent_reports (scoped via parent incident's org)
create policy "agent_reports_select_same_org" on agent_reports
  for select using (
    incident_id is null or exists (select 1 from incidents i where i.id = incident_id and i.org_id = current_org_id())
  );

-- ─────────────────────────────────────────────
-- REALTIME: broadcast incident + report changes
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table agent_reports;

-- ─────────────────────────────────────────────
-- SEED: on signup, auto-create an org + profile
-- ─────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name) values (coalesce(new.raw_user_meta_data->>'org_name', 'My Organization'))
    returning id into new_org_id;

  insert into profiles (id, org_id, full_name, role)
  values (new.id, new_org_id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
