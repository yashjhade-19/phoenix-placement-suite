ALTER TABLE public.offers DROP CONSTRAINT offers_status_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_status_check CHECK (status IN ('draft','released','accepted','declined','placed','revoked'));
UPDATE public.offers SET status = 'placed' WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION public.guard_offer()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a record;
BEGIN
  SELECT * INTO a FROM public.applications WHERE id = NEW.application_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  NEW.student_id := a.student_id; NEW.drive_id := a.drive_id; NEW.org_id := a.org_id;
  IF NEW.status IN ('released','accepted','declined','placed') AND a.status <> 'selected'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'A placement outcome can only be recorded for a selected applicant';
  END IF;
  IF NEW.release_date IS NULL THEN NEW.release_date := current_date; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.application_block_reason(_student uuid, _drive uuid)
 RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p record; v_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.students WHERE id = _student;
  SELECT * INTO p FROM public.placement_policies WHERE org_id = v_org;
  IF p.org_id IS NULL THEN
    p := ROW(v_org, true, true, false, false, NULL, false, now())::public.placement_policies;
  END IF;
  IF NOT p.allow_after_placed AND EXISTS (SELECT 1 FROM public.offers WHERE student_id = _student AND status = 'placed' AND drive_id <> _drive) THEN
    RETURN 'You are marked as Placed. Your college placement policy does not allow further applications.';
  END IF;
  IF NOT p.allow_with_pending_offer AND EXISTS (SELECT 1 FROM public.offers WHERE student_id = _student AND status IN ('released','accepted') AND drive_id <> _drive) THEN
    RETURN 'You have received an offer and your college placement policy does not allow applications to additional drives.';
  END IF;
  IF NOT p.allow_after_selection AND EXISTS (SELECT 1 FROM public.applications WHERE student_id = _student AND status = 'selected' AND drive_id <> _drive) THEN
    RETURN 'Applications are restricted after selection according to your college placement policy.';
  END IF;
  RETURN NULL;
END $function$;

REVOKE EXECUTE ON FUNCTION public.respond_offer(uuid, boolean) FROM authenticated, anon, public;
COMMENT ON FUNCTION public.respond_offer(uuid, boolean) IS 'DEPRECATED: placement cell records outcomes; students no longer respond in-app';
COMMENT ON COLUMN public.offers.ctc IS 'DEPRECATED: offer terms are managed by the company';
COMMENT ON COLUMN public.offers.joining_date IS 'DEPRECATED: offer terms are managed by the company';
COMMENT ON COLUMN public.offers.expiry_date IS 'DEPRECATED: offer terms are managed by the company';
COMMENT ON COLUMN public.offers.document_path IS 'DEPRECATED: offer letters are not stored in HirePhoenix';
COMMENT ON COLUMN public.offers.release_date IS 'Date the placement outcome was recorded/communicated';