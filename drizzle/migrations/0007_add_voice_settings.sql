ALTER TABLE public.nagi_settings
  ADD COLUMN IF NOT EXISTS voice_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voice_phone_number text,
  ADD COLUMN IF NOT EXISTS voice_greeting text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS nagi_settings_voice_phone_number_key
  ON public.nagi_settings (voice_phone_number)
  WHERE voice_phone_number IS NOT NULL;