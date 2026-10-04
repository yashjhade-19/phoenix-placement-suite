CREATE TABLE public.placement_policies (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  allow_after_selection boolean NOT NULL DEFAULT true,
  allow_with_pending_offer boolean NOT NULL DEFAULT true,
  allow_after_placed boolean NOT NULL DEFAULT false,
  allow_upgrades boolean NOT NULL DEFAULT false,
  upgrade_min_ctc numeric,
  use_tiers boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.placement_policies TO authenticated;
GRANT ALL ON public.placement_policies TO service_role;
ALTER TABLE public.placement_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_read ON public.placement_policies FOR SELECT TO authenticated USING (org_id = public.my_org());
CREATE POLICY pp_admin_ins ON public.placement_policies FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND org_id = public.my_org());
CREATE POLICY pp_admin_upd ON public.placement_policies FOR UPDATE TO authenticated USING (public.is_admin() AND org_id = public.my_org()) WITH CHECK (public.is_admin() AND org_id = public.my_org());
CREATE TRIGGER t_pp_upd BEFORE UPDATE ON public.placement_policies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.placement_policies (org_id) SELECT id FROM public.organizations ON CONFLICT DO NOTHING;

ALTER TABLE public.drives ADD COLUMN placement_tier text NOT NULL DEFAULT 'regular';
ALTER TABLE public.drives ADD CONSTRAINT drives_tier_chk CHECK (placement_tier IN ('regular','dream','super_dream'));

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  drive_id uuid NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  ctc numeric,
  release_date date,
  joining_date date,
  expiry_date date,
  notes text,
  document_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','accepted','declined','revoked')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_admin ON public.offers FOR ALL TO authenticated
  USING (public.is_admin() AND org_id = public.my_org())
  WITH CHECK (public.is_admin() AND org_id = public.my_org());
CREATE POLICY offers_student_read ON public.offers FOR SELECT TO authenticated
  USING (status <> 'draft' AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = offers.student_id AND s.user_id = auth.uid()));
CREATE INDEX offers_student_idx ON public.offers(student_id);

CREATE OR REPLACE FUNCTION public.guard_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record;
BEGIN
  SELECT * INTO a FROM public.applications WHERE id = NEW.application_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  NEW.student_id := a.student_id; NEW.drive_id := a.drive_id; NEW.org_id := a.org_id;
  IF NEW.status IN ('released','accepted') AND a.status <> 'selected'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    RAISE EXCEPTION 'An offer can only be released to a selected applicant';
  END IF;
  IF NEW.status = 'released' AND NEW.release_date IS NULL THEN NEW.release_date := current_date; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER t_offers_guard BEFORE INSERT OR UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.guard_offer();

-- Students respond only through this function (no direct UPDATE policy for students)
CREATE OR REPLACE FUNCTION public.respond_offer(_offer uuid, _accept boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  SELECT o2.* INTO o FROM public.offers o2 JOIN public.students s ON s.id = o2.student_id
   WHERE o2.id = _offer AND s.user_id = auth.uid() FOR UPDATE OF o2;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF o.status <> 'released' THEN RAISE EXCEPTION 'This offer is no longer awaiting your response'; END IF;
  IF o.expiry_date IS NOT NULL AND o.expiry_date < current_date THEN RAISE EXCEPTION 'This offer has expired'; END IF;
  UPDATE public.offers SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END, responded_at = now() WHERE id = _offer;
  RETURN CASE WHEN _accept THEN 'accepted' ELSE 'declined' END;
END $$;
GRANT EXECUTE ON FUNCTION public.respond_offer(uuid, boolean) TO authenticated;

-- Returns NULL if allowed, otherwise the reason the policy blocks a new application
CREATE OR REPLACE FUNCTION public.application_block_reason(_student uuid, _drive uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; v_org uuid;
BEGIN
  SELECT org_id INTO v_org FROM public.students WHERE id = _student;
  SELECT * INTO p FROM public.placement_policies WHERE org_id = v_org;
  IF p.org_id IS NULL THEN
    p := ROW(v_org, true, true, false, false, NULL, false, now())::public.placement_policies;
  END IF;
  IF NOT p.allow_after_placed AND EXISTS (SELECT 1 FROM public.offers WHERE student_id = _student AND status = 'accepted' AND drive_id <> _drive) THEN
    RETURN 'You have already accepted a placement offer and are marked as Placed. Your college placement policy does not allow further applications.';
  END IF;
  IF NOT p.allow_with_pending_offer AND EXISTS (SELECT 1 FROM public.offers WHERE student_id = _student AND status = 'released' AND drive_id <> _drive) THEN
    RETURN 'You have an active offer and your college placement policy does not allow applications to additional drives.';
  END IF;
  IF NOT p.allow_after_selection AND EXISTS (SELECT 1 FROM public.applications WHERE student_id = _student AND status = 'selected' AND drive_id <> _drive) THEN
    RETURN 'Applications are restricted after selection according to your college placement policy.';
  END IF;
  RETURN NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.application_block_reason(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_application_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  r := public.application_block_reason(NEW.student_id, NEW.drive_id);
  IF r IS NOT NULL THEN RAISE EXCEPTION '%', r; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER t_apps_policy BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.guard_application_insert();

-- Backfill: existing selected applicants keep their placed status via an accepted offer
INSERT INTO public.offers (org_id, application_id, student_id, drive_id, company_id, role, ctc, release_date, status, responded_at)
SELECT a.org_id, a.id, a.student_id, a.drive_id, d.company_id, d.title, d.ctc, a.updated_at::date, 'accepted', a.updated_at
FROM public.applications a JOIN public.drives d ON d.id = a.drive_id
WHERE a.status = 'selected'
ON CONFLICT (application_id) DO NOTHING;