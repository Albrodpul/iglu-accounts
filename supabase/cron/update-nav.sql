-- Hourly investment price update, scheduled from Supabase (pg_cron + pg_net).
--
-- Not a migration: run it by hand in the SQL Editor, once. Re-running is safe
-- (it replaces the function and the job). The secret is NOT in this file.
--
-- Window, in Spain time (summer/winter handled by 'Europe/Madrid'):
--   Monday 06:00 → Saturday 03:00, every hour on the hour, except 04:00 and 05:00.
--   Weekends off: last call Saturday 03:00, next one Monday 06:00.
-- pg_cron fires every hour (UTC); the function decides whether this hour counts.

-- 1. Extensions (also under Dashboard → Integrations → Cron / pg_net).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. The secret, stored encrypted in Vault. Run ONCE, with the real value of
--    CRON_SECRET from Vercel (Settings → Environment Variables), then delete it
--    from the editor. To change it later: vault.update_secret.
-- select vault.create_secret('PEGA_AQUI_EL_CRON_SECRET', 'cron_secret');

-- 3. What runs every hour.
create or replace function public.trigger_update_nav(force boolean default false)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_now timestamp := now() at time zone 'Europe/Madrid';
  local_dow int := extract(isodow from local_now)::int;  -- 1 = lunes … 7 = domingo
  local_hour int := extract(hour from local_now)::int;
  secret text;
begin
  if not force and not (
    (local_dow between 1 and 5 and local_hour >= 6)     -- lun-vie, 06:00-23:00
    or (local_dow between 2 and 6 and local_hour <= 3)  -- mar-sáb, 00:00-03:00
  ) then
    return null;
  end if;

  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if secret is null then
    raise exception 'Falta el secreto "cron_secret" en Vault (paso 2)';
  end if;

  -- Returns the request id: look it up in net._http_response.
  return net.http_get(
    url := 'https://iglu-management.vercel.app/api/cron/update-nav',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 120000
  );
end;
$$;

-- Only pg_cron (as postgres) may call it, never the app's public API.
revoke all on function public.trigger_update_nav(boolean) from public, anon, authenticated;

-- 4. The schedule: minute 0 of every hour. Same name = replaces the old job.
select cron.schedule('update-nav', '0 * * * *', 'select public.trigger_update_nav()');


-- ─── Checks (run any of these when you want) ───────────────────────────────

-- Try it now, outside the window too:
--   select public.trigger_update_nav(force => true);

-- The job:
--   select jobname, schedule, active from cron.job;

-- Last runs of the job:
--   select start_time, status, return_message
--   from cron.job_run_details order by start_time desc limit 10;

-- What the app answered (200 = OK; the body lists each fund):
--   select created, status_code, error_msg, left(content::text, 300)
--   from net._http_response order by created desc limit 10;

-- Pause / resume / remove:
--   select cron.alter_job((select jobid from cron.job where jobname = 'update-nav'), active := false);
--   select cron.alter_job((select jobid from cron.job where jobname = 'update-nav'), active := true);
--   select cron.unschedule('update-nav');
