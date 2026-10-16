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

CREATE INDEX waitlist_ip_hash_created_at_idx ON public.waitlist (ip_hash, created_at DESC);-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- apps
CREATE TABLE public.apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  origin text NOT NULL,
  built_with text,
  verification_status text NOT NULL DEFAULT 'pending',
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apps_status_check CHECK (verification_status IN ('pending','verified','failed')),
  CONSTRAINT apps_origin_https CHECK (origin LIKE 'https://%'),
  CONSTRAINT apps_user_origin_unique UNIQUE (user_id, origin)
);
CREATE UNIQUE INDEX apps_one_verified_owner_per_origin
  ON public.apps (origin) WHERE verification_status = 'verified';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps TO authenticated;
GRANT ALL ON public.apps TO service_role;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps_select_own" ON public.apps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "apps_insert_own" ON public.apps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "apps_update_own" ON public.apps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "apps_delete_own" ON public.apps FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- verification attempts
CREATE TABLE public.verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  result text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_attempts_method_check CHECK (method IN ('dns','meta','file')),
  CONSTRAINT verification_attempts_result_check CHECK (result IN ('verified','failed'))
);
CREATE INDEX verification_attempts_app_created_idx ON public.verification_attempts (app_id, created_at DESC);
GRANT SELECT ON public.verification_attempts TO authenticated;
GRANT ALL ON public.verification_attempts TO service_role;
ALTER TABLE public.verification_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification_attempts_select_own" ON public.verification_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON public.apps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;CREATE TABLE public.scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  progress SMALLINT NOT NULL DEFAULT 0,
  progress_message TEXT,
  worker_id TEXT,
  claim_token UUID,
  error TEXT,
  bug_count INTEGER NOT NULL DEFAULT 0,
  needs_review_count INTEGER NOT NULL DEFAULT 0,
  passed_count INTEGER NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scans_status_check CHECK (status IN ('queued','claimed','running','completed','failed','cancelled')),
  CONSTRAINT scans_progress_check CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT scans_target_https_check CHECK (target_url ~ '^https://')
);

CREATE INDEX scans_user_created_idx ON public.scans (user_id, created_at DESC);
CREATE INDEX scans_queue_idx ON public.scans (status, created_at) WHERE status = 'queued';
CREATE UNIQUE INDEX scans_one_active_per_app ON public.scans (app_id)
  WHERE status IN ('queued','claimed','running');

GRANT SELECT, INSERT, UPDATE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scans" ON public.scans
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users queue scans for their verified apps" ON public.scans
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND status = 'queued'
    AND EXISTS (
      SELECT 1 FROM public.apps a
      WHERE a.id = app_id
        AND a.user_id = auth.uid()
        AND a.verification_status = 'verified'
    )
  );

CREATE POLICY "Users cancel own queued scans" ON public.scans
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'queued')
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

CREATE TABLE public.findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  page_url TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT findings_severity_check CHECK (severity IN ('bug','needs_review','passed'))
);

CREATE INDEX findings_scan_idx ON public.findings (scan_id, severity);

GRANT SELECT ON public.findings TO authenticated;
GRANT ALL ON public.findings TO service_role;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own findings" ON public.findings
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.scan_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress SMALLINT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scan_events_scan_idx ON public.scan_events (scan_id, created_at);

GRANT SELECT ON public.scan_events TO authenticated;
GRANT ALL ON public.scan_events TO service_role;
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scan events" ON public.scan_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.findings
  ADD COLUMN review_status text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN review_note text,
  ADD COLUMN reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN reviewed_at timestamptz;

ALTER TABLE public.findings
  ADD CONSTRAINT findings_review_status_check
  CHECK (review_status IN ('unreviewed', 'approved', 'flagged'));

CREATE POLICY "Admins read all findings"
  ON public.findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins review findings"
  ON public.findings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all scans"
  ON public.scans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all apps"
  ON public.apps FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all scan events"
  ON public.scan_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT UPDATE (review_status, review_note, reviewed_by, reviewed_at) ON public.findings TO authenticated;REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;-- apps: revoke update and insert, grant specific insert columns to authenticated
REVOKE UPDATE ON public.apps FROM authenticated, anon;
REVOKE INSERT ON public.apps FROM authenticated, anon;
GRANT INSERT (user_id, url, origin, built_with) ON public.apps TO authenticated;
REVOKE ALL ON public.apps FROM anon;

-- apps triggers
CREATE OR REPLACE FUNCTION public.apps_insert_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.verification_status := 'pending';
    NEW.verified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apps_before_insert
  BEFORE INSERT ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.apps_insert_guard();

CREATE OR REPLACE FUNCTION public.apps_update_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.origin IS DISTINCT FROM OLD.origin
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'permission denied to modify protected columns'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apps_before_update
  BEFORE UPDATE ON public.apps
  FOR EACH ROW
  EXECUTE FUNCTION public.apps_update_guard();

-- scans: revoke insert, update; grant insert on specific columns and update on status
REVOKE INSERT, UPDATE ON public.scans FROM authenticated, anon;
GRANT INSERT (app_id, user_id, target_url, status, progress_message) ON public.scans TO authenticated;
GRANT UPDATE (status) ON public.scans TO authenticated;
REVOKE ALL ON public.scans FROM anon;

-- scans trigger
CREATE OR REPLACE FUNCTION public.scans_insert_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_app public.apps%ROWTYPE;
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    SELECT * INTO v_app
    FROM public.apps
    WHERE id = NEW.app_id;

    IF NOT FOUND OR v_app.user_id IS DISTINCT FROM NEW.user_id OR v_app.verification_status <> 'verified' THEN
      RAISE EXCEPTION 'permission denied: scan can only be queued for own verified app'
        USING ERRCODE = '42501';
    END IF;

    NEW.target_url := v_app.origin || '/';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scans_before_insert
  BEFORE INSERT ON public.scans
  FOR EACH ROW
  EXECUTE FUNCTION public.scans_insert_guard();

-- waitlist: revoke all from anon, authenticated
REVOKE ALL ON public.waitlist FROM anon, authenticated;
UPDATE public.waitlist SET ip_hash = NULL WHERE ip_hash IS NOT NULL;
-- Phase 4: Billing, Payments, and Entitlements

CREATE TYPE public.billing_plan AS ENUM ('sample', 'launch', 'retest');
CREATE TYPE public.order_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');

-- 1. User Credits & Entitlements
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.billing_plan NOT NULL DEFAULT 'sample',
  scan_credits integer NOT NULL DEFAULT 1,
  unlimited_scans boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Orders (One-time purchases, e.g. Launch Check)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  plan public.billing_plan NOT NULL,
  amount integer NOT NULL, -- in cents (e.g. 4900 for $49.00)
  currency text NOT NULL DEFAULT 'usd',
  status public.order_status NOT NULL DEFAULT 'pending',
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Subscriptions (Recurring plans, e.g. Monthly Re-test)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  plan public.billing_plan NOT NULL DEFAULT 'retest',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

GRANT ALL ON public.user_credits TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.subscriptions TO service_role;

REVOKE ALL ON public.user_credits FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.subscriptions FROM anon;

-- Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credits"
  ON public.user_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users read own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users read own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Triggers for automatic credits initialization on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan, scan_credits, unlimited_scans)
  VALUES (NEW.id, 'sample', 1, false)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_profile_create_credits ON public.profiles;
CREATE TRIGGER trg_on_profile_create_credits
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_credits();
-- Phase 5: Support and Customer Communications

CREATE TYPE public.ticket_category AS ENUM ('general', 'verification', 'scan_issue', 'billing', 'feature_request');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  subject text NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'general',
  message text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO service_role;

-- Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users insert own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Public insert tickets"
  ON public.support_tickets FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
