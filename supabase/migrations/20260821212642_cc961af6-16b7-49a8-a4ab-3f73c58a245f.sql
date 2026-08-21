ALTER TABLE public.form_fields
  ADD COLUMN IF NOT EXISTS profile_field text,
  ADD COLUMN IF NOT EXISTS validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS t_form_fields_upd ON public.form_fields;
CREATE TRIGGER t_form_fields_upd BEFORE UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.application_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE RESTRICT,
  label text NOT NULL,
  field_type text NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, field_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_responses TO authenticated;
GRANT ALL ON public.application_responses TO service_role;

ALTER TABLE public.application_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY resp_read ON public.application_responses
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  LEFT JOIN public.students s ON s.id = a.student_id
  WHERE a.id = application_responses.application_id
    AND ((public.is_admin() AND a.org_id = public.my_org()) OR s.user_id = auth.uid())
));

CREATE POLICY resp_student_ins ON public.application_responses
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.applications a
  JOIN public.students s ON s.id = a.student_id
  WHERE a.id = application_responses.application_id AND s.user_id = auth.uid()
));

CREATE POLICY resp_admin_del ON public.application_responses
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  WHERE a.id = application_responses.application_id
    AND public.is_admin() AND a.org_id = public.my_org()
));

CREATE INDEX IF NOT EXISTS idx_app_responses_app ON public.application_responses(application_id);
CREATE INDEX IF NOT EXISTS idx_app_responses_field ON public.application_responses(field_id);

CREATE TRIGGER t_app_responses_upd BEFORE UPDATE ON public.application_responses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();