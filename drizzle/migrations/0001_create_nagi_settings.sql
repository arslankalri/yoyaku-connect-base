CREATE TABLE public.nagi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  tone text NOT NULL DEFAULT 'professional',
  custom_instructions text NOT NULL DEFAULT '',
  can_answer_faqs boolean NOT NULL DEFAULT true,
  can_explain_services boolean NOT NULL DEFAULT true,
  can_explain_prices boolean NOT NULL DEFAULT true,
  can_explain_hours boolean NOT NULL DEFAULT true,
  can_accept_appointments boolean NOT NULL DEFAULT true,
  can_change_appointments boolean NOT NULL DEFAULT true,
  can_cancel_appointments boolean NOT NULL DEFAULT true,
  can_transfer_to_staff boolean NOT NULL DEFAULT true,
  handoff_on_request boolean NOT NULL DEFAULT true,
  handoff_on_unknown boolean NOT NULL DEFAULT true,
  handoff_on_complaint boolean NOT NULL DEFAULT true,
  handoff_outside_scope boolean NOT NULL DEFAULT true,
  handoff_manual_enabled boolean NOT NULL DEFAULT false,
  cancellation_policy text NOT NULL DEFAULT '',
  late_arrival_policy text NOT NULL DEFAULT '',
  reservation_policy text NOT NULL DEFAULT '',
  other_policies text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nagi_settings TO authenticated;
GRANT ALL ON public.nagi_settings TO service_role;

ALTER TABLE public.nagi_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY nagi_settings_all_own ON public.nagi_settings
  FOR ALL TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));

CREATE TRIGGER nagi_settings_touch BEFORE UPDATE ON public.nagi_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
