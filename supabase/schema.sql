-- Constancia schema. Run once in Supabase > SQL Editor.
-- Design rules (Team 1 Blueprint, shadow clause): no score, grade or label column anywhere;
-- no profile of the worker; the uploaded text is never stored, only derived monthly figures
-- and a SHA-256 of the source so the worker can later show it is the same document.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- income_records
create table public.income_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  source_kind text not null check (source_kind in ('estado_cuenta', 'imss', 'otro')),
  source_name text check (source_name is null or char_length(source_name) <= 120),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  reading_method text not null check (reading_method in ('parser', 'ai_verified')),
  is_sample boolean not null default false,
  months jsonb not null check (jsonb_typeof(months) = 'array' and jsonb_array_length(months) between 1 and 36),
  months_covered int not null check (months_covered between 1 and 36),
  deposits_included int not null check (deposits_included >= 1),
  deposits_detected int not null check (deposits_detected >= deposits_included),
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  avg_monthly numeric(14, 2) not null check (avg_monthly >= 0),
  min_month text not null check (min_month ~ '^\d{4}-\d{2}$'),
  min_amount numeric(14, 2) not null check (min_amount >= 0),
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- certificates
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.income_records(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'hex') check (token ~ '^[0-9a-f]{48}$'),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- certificate_views
-- Deliberately stores ONLY the moment of the visit: no IP, no browser, no location.
create table public.certificate_views (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- consents
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('process_document', 'ai_reading')),
  granted boolean not null,
  text_version text not null check (char_length(text_version) <= 20),
  created_at timestamptz not null default now()
);

create index on public.income_records (user_id, created_at desc);
create index on public.certificates (user_id, created_at desc);
create index on public.certificates (record_id);
create index on public.certificate_views (certificate_id, viewed_at desc);
create index on public.consents (user_id, purpose, created_at desc);

-- ---------------------------------------------------------------- RLS on every table
alter table public.income_records enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_views enable row level security;
alter table public.consents enable row level security;

-- income_records: the worker sees and manages only their own rows
create policy "records select own" on public.income_records for select using (user_id = auth.uid());
create policy "records insert own" on public.income_records for insert with check (user_id = auth.uid());
create policy "records delete own" on public.income_records for delete using (user_id = auth.uid());
-- No update policy on purpose: a saved record is immutable. To correct it, save a new one.

-- certificates: own rows; a certificate can only point at the worker's own record
create policy "certs select own" on public.certificates for select using (user_id = auth.uid());
create policy "certs insert own" on public.certificates
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.income_records r where r.id = record_id and r.user_id = auth.uid())
  );
create policy "certs revoke own" on public.certificates for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "certs delete own" on public.certificates for delete using (user_id = auth.uid());

-- certificate_views: the worker can read the log of their own certificates.
-- There is NO insert/update/delete policy: rows are written only by get_certificate() below.
create policy "views select own" on public.certificate_views for select
  using (exists (select 1 from public.certificates c where c.id = certificate_id and c.user_id = auth.uid()));

-- consents: append-only for the worker (no update), readable by the worker, deletable with "delete my data"
create policy "consents select own" on public.consents for select using (user_id = auth.uid());
create policy "consents insert own" on public.consents for insert with check (user_id = auth.uid());
create policy "consents delete own" on public.consents for delete using (user_id = auth.uid());

-- A certificate row may only be changed to REVOKE it: block any other column edit.
create or replace function public.certs_only_revoke() returns trigger
language plpgsql as $$
begin
  if new.record_id <> old.record_id or new.user_id <> old.user_id or new.token <> old.token
     or new.expires_at <> old.expires_at or new.created_at <> old.created_at then
    raise exception 'certificates can only be revoked';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'certificate already revoked';
  end if;
  return new;
end $$;
create trigger certs_only_revoke before update on public.certificates
  for each row execute function public.certs_only_revoke();

-- ---------------------------------------------------------------- public certificate lookup
-- The ONLY way a logged-out reader gets data. Knowing the 48-hex token is the capability.
-- Returns null for unknown, revoked or expired tokens. Writes one row to the access log.
create or replace function public.get_certificate(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.certificates;
  r public.income_records;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then
    return null;
  end if;
  select * into c from public.certificates
   where token = p_token and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  select * into r from public.income_records where id = c.record_id;
  if not found then
    return null;
  end if;
  insert into public.certificate_views (certificate_id) values (c.id);
  return jsonb_build_object(
    'title', r.title,
    'source_kind', r.source_kind,
    'source_name', r.source_name,
    'source_hash', r.source_hash,
    'reading_method', r.reading_method,
    'is_sample', r.is_sample,
    'months', r.months,
    'months_covered', r.months_covered,
    'deposits_included', r.deposits_included,
    'deposits_detected', r.deposits_detected,
    'total_amount', r.total_amount,
    'avg_monthly', r.avg_monthly,
    'min_month', r.min_month,
    'min_amount', r.min_amount,
    'period_start', r.period_start,
    'period_end', r.period_end,
    'issued_at', c.created_at,
    'expires_at', c.expires_at
  );
end $$;

revoke all on function public.get_certificate(text) from public;
grant execute on function public.get_certificate(text) to anon, authenticated;
