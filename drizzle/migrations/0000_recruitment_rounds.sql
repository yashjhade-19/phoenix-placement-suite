ALTER TABLE public.recruitment_stages
  ADD COLUMN IF NOT EXISTS round_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'upcoming';

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS current_stage_id uuid REFERENCES public.recruitment_stages(id) ON DELETE SET NULL;

CREATE TABLE public.application_round_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.recruitment_stages(id) ON DELETE CASCADE,
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','qualified','not_qualified','absent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, stage_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_round_results TO authenticated;
GRANT ALL ON public.application_round_results TO service_role;
ALTER TABLE public.application_round_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY rr_admin ON public.application_round_results FOR ALL TO authenticated
USING (public.is_admin() AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.org_id = public.my_org()))
WITH CHECK (public.is_admin() AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id AND a.org_id = public.my_org()));

CREATE POLICY rr_student_read ON public.application_round_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.students s ON s.id = a.student_id WHERE a.id = application_id AND s.user_id = auth.uid()));

CREATE TRIGGER t_rr_upd BEFORE UPDATE ON public.application_round_results
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Students may only withdraw; recruitment fields are admin-only
CREATE OR REPLACE FUNCTION public.guard_application_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn') THEN
    RAISE EXCEPTION 'Only the placement cell can change this application';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_apps_guard BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_update();