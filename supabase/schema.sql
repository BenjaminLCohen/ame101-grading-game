-- Run this in your Supabase SQL Editor

create table if not exists sessions (
  id text primary key default 'class',
  current_slide int default 0,
  show_results boolean default false,
  selected_volunteers jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

insert into sessions (id) values ('class') on conflict do nothing;

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  session_id text default 'class',
  slide_id int not null,
  student_id text not null,
  grade text not null,
  volunteer boolean default false,
  student_name text,
  created_at timestamptz default now(),
  unique(session_id, slide_id, student_id)
);

-- Enable Realtime
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table votes;

-- Simple RLS (open for classroom demo - tighten for production)
alter table sessions enable row level security;
alter table votes enable row level security;

create policy "public read sessions" on sessions for select using (true);
create policy "public update sessions" on sessions for update using (true);
create policy "public insert sessions" on sessions for insert with check (true);

create policy "public read votes" on votes for select using (true);
create policy "public insert votes" on votes for insert with check (true);
create policy "public update votes" on votes for update using (true);