CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind text NOT NULL,
  customer_name text,
  customer_phone text,
  starts_at timestamptz,
  detail text,
  call_id uuid REFERENCES public.calls(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_business_created_idx ON public.notifications (business_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_all_own ON public.notifications FOR ALL TO authenticated
  USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c_name text; c_phone text; k text;
BEGIN
  IF NEW.source = 'manual' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    k := 'booking_created';
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    k := 'booking_cancelled';
  ELSIF NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    k := 'booking_rescheduled';
  ELSE
    RETURN NEW;
  END IF;
  SELECT name, phone INTO c_name, c_phone FROM public.customers WHERE id = NEW.customer_id;
  INSERT INTO public.notifications (business_id, kind, customer_name, customer_phone, starts_at, appointment_id, detail)
  VALUES (NEW.business_id, k, c_name, c_phone, NEW.starts_at, NEW.id, NEW.source);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_appointment_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER appointments_notify AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_change();

CREATE OR REPLACE FUNCTION public.notify_call_finished()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.channel = 'chat' THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO public.notifications (business_id, kind, customer_phone, call_id, detail)
    VALUES (NEW.business_id, 'call_finished', NEW.from_number, NEW.id, left(coalesce(NEW.summary, ''), 500));
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_call_finished() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER calls_notify AFTER INSERT OR UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.notify_call_finished();