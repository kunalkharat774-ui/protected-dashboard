create table if not exists public.device_intelligence_visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now(),
  device_type text not null check (device_type in ('desktop', 'mobile', 'tablet')),
  browser text not null check (browser in ('Chrome', 'Edge', 'Firefox', 'Opera', 'Safari', 'Other')),
  operating_system text not null check (
    operating_system in ('Android', 'ChromeOS', 'iOS', 'Linux', 'macOS', 'Other', 'Windows')
  )
);

create index if not exists device_intelligence_visits_visited_at_idx
  on public.device_intelligence_visits (visited_at desc);

alter table public.device_intelligence_visits enable row level security;

create or replace function public.record_device_intelligence_visit(
  p_device_type text,
  p_browser text,
  p_operating_system text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('device_intelligence_visits'));

  insert into public.device_intelligence_visits (device_type, browser, operating_system)
  values (p_device_type, p_browser, p_operating_system);

  delete from public.device_intelligence_visits
  where visited_at < now() - interval '30 days';

  delete from public.device_intelligence_visits
  where id in (
    select id
    from public.device_intelligence_visits
    order by visited_at desc, id desc
    offset 1000
  );
end;
$$;

create or replace function public.list_device_intelligence_visits()
returns table (
  visited_at timestamptz,
  device_type text,
  browser text,
  operating_system text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('device_intelligence_visits'));

  delete from public.device_intelligence_visits as visits
  where visits.visited_at < now() - interval '30 days';

  delete from public.device_intelligence_visits as visits
  where visits.id in (
    select stored.id
    from public.device_intelligence_visits as stored
    order by stored.visited_at desc, stored.id desc
    offset 1000
  );

  return query
  select visits.visited_at, visits.device_type, visits.browser, visits.operating_system
  from public.device_intelligence_visits as visits
  order by visits.visited_at desc, visits.id desc
  limit 1000;
end;
$$;

revoke all on public.device_intelligence_visits from anon, authenticated;
revoke all on function public.record_device_intelligence_visit(text, text, text) from public, anon, authenticated;
revoke all on function public.list_device_intelligence_visits() from public, anon, authenticated;
grant all on public.device_intelligence_visits to service_role;
grant usage, select on sequence public.device_intelligence_visits_id_seq to service_role;
grant execute on function public.record_device_intelligence_visit(text, text, text) to service_role;
grant execute on function public.list_device_intelligence_visits() to service_role;
