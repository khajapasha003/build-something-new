CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  website_url text,
  builder text,
  intent text NOT NULL DEFAULT 'waitlist',
  consent_marketing boolean NOT NULL DEFAULT false,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist is server-only" ON public.waitlist FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX waitlist_ip_hash_created_at_idx ON public.waitlist (ip_hash, created_at DESC);