create table if not exists public.app_data_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('api_activity', 'scan_result', 'file_scan', 'external_feed')),
  method text not null,
  path text not null,
  status_code integer not null check (status_code between 100 and 599),
  request_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default 'null'::jsonb,
  category text not null,
  severity text not null check (severity in ('info', 'medium', 'high')),
  kind text not null check (kind in ('observed', 'detection'))
);

create index if not exists app_data_events_created_at_idx
  on public.app_data_events (created_at desc, id desc);

create index if not exists app_data_events_type_created_at_idx
  on public.app_data_events (event_type, created_at desc);

alter table public.app_data_events enable row level security;

create or replace function public.prune_app_data_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('app_data_events_retention'));

  delete from public.app_data_events
  where created_at < now() - interval '90 days';

  return new;
end;
$$;

drop trigger if exists app_data_events_prune_old_rows on public.app_data_events;
create trigger app_data_events_prune_old_rows
  after insert on public.app_data_events
  for each row execute function public.prune_app_data_events();

revoke all on public.app_data_events from public, anon, authenticated;
revoke all on function public.prune_app_data_events() from public, anon, authenticated;
grant all on public.app_data_events to service_role;
grant usage, select on sequence public.app_data_events_id_seq to service_role;

notify pgrst, 'reload schema';
