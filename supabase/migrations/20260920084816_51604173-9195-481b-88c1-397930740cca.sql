CREATE TABLE public.scans (
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
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();