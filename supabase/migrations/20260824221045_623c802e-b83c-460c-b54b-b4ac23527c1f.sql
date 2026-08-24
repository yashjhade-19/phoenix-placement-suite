CREATE TABLE public.student_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  technologies text[] NOT NULL DEFAULT '{}'::text[],
  url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_projects TO authenticated;
GRANT ALL ON public.student_projects TO service_role;
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_read ON public.student_projects FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.user_id = auth.uid() OR (public.is_admin() AND s.org_id = public.my_org()))));
CREATE POLICY projects_ins ON public.student_projects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY projects_upd ON public.student_projects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY projects_del ON public.student_projects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.user_id = auth.uid() OR (public.is_admin() AND s.org_id = public.my_org()))));

CREATE TRIGGER t_student_projects_upd BEFORE UPDATE ON public.student_projects
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.student_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  credential_url text,
  issue_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_certifications TO authenticated;
GRANT ALL ON public.student_certifications TO service_role;
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY certs_read ON public.student_certifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.user_id = auth.uid() OR (public.is_admin() AND s.org_id = public.my_org()))));
CREATE POLICY certs_ins ON public.student_certifications FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY certs_upd ON public.student_certifications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY certs_del ON public.student_certifications FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND (s.user_id = auth.uid() OR (public.is_admin() AND s.org_id = public.my_org()))));

CREATE TRIGGER t_student_certifications_upd BEFORE UPDATE ON public.student_certifications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_student_projects_student ON public.student_projects(student_id);
CREATE INDEX idx_student_certifications_student ON public.student_certifications(student_id);