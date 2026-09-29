ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS party_size integer NOT NULL DEFAULT 1 CHECK (party_size >= 1 AND party_size <= 100);
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS seat_capacity integer CHECK (seat_capacity IS NULL OR seat_capacity >= 1);
COMMENT ON COLUMN public.businesses.seat_capacity IS 'Max guests seated at the same time; NULL = one booking per slot';