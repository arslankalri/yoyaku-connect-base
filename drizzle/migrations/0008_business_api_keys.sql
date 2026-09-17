CREATE TABLE IF NOT EXISTS public.business_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Voice agent',
  api_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS business_api_keys_business_id_idx
  ON public.business_api_keys (business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_api_keys TO authenticated;
GRANT ALL ON public.business_api_keys TO service_role;

ALTER TABLE public.business_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their business api keys" ON public.business_api_keys;
CREATE POLICY "Owners manage their business api keys"
  ON public.business_api_keys
  FOR ALL
  TO authenticated
  USING (public.owns_business(business_id))
  WITH CHECK (public.owns_business(business_id));