-- apps: revoke update and insert, grant specific insert columns to authenticated
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
