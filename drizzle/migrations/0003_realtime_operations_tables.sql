-- Chat/voice conversation channel for the call history feature
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'chat';
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS session_key text;
CREATE UNIQUE INDEX IF NOT EXISTS calls_business_session_key_idx
  ON public.calls (business_id, session_key) WHERE session_key IS NOT NULL;

-- Owners manage their own conversation records
DROP POLICY IF EXISTS calls_all_own ON public.calls;
CREATE POLICY calls_all_own ON public.calls FOR ALL TO authenticated
  USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE INDEX IF NOT EXISTS appointments_business_start_idx ON public.appointments (business_id, starts_at);
CREATE INDEX IF NOT EXISTS customers_business_idx ON public.customers (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS calls_business_created_idx ON public.calls (business_id, created_at DESC);

-- updated_at maintenance
DROP TRIGGER IF EXISTS appointments_touch ON public.appointments;
CREATE TRIGGER appointments_touch BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS customers_touch ON public.customers;
CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calls TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.calls TO service_role;

-- Realtime streaming for the operations pages
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.calls; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
