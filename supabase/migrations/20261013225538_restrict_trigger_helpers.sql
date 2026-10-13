BEGIN;
REVOKE ALL ON FUNCTION public.queue_quote_notifications(),
  public.enforce_quote_lifecycle(), public.check_load_quote()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_quote_notifications(),
  public.enforce_quote_lifecycle(), public.check_load_quote() TO service_role;
COMMIT;
