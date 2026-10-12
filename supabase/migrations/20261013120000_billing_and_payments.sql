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
