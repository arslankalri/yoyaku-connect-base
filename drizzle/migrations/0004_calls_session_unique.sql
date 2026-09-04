CREATE UNIQUE INDEX IF NOT EXISTS calls_business_session_key_uidx
  ON public.calls (business_id, session_key)
  WHERE session_key IS NOT NULL;