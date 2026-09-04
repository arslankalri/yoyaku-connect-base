DROP INDEX IF EXISTS public.calls_business_session_key_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS calls_business_session_key_uidx
  ON public.calls (business_id, session_key);