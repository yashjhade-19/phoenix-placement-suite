
CREATE TYPE public.app_role AS ENUM ('admin','student');
CREATE TYPE public.drive_status AS ENUM ('draft','published','applications_open','applications_closed','selection_in_progress','completed');
CREATE TYPE public.application_status AS ENUM ('applied','under_review','shortlisted','selected','rejected','withdrawn');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  academic_year text,
  location text,
  contact_email text,
  contact_phone text,
  website text,
  description text,
  admin_code text NOT NULL DEFAULT 'PHOENIX-ADMIN',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.my_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  photo_url text,
  date_of_birth date,
  gender text,
  enrollment_no text NOT NULL,
  course text,
  branch text,
  graduation_year int,
  batch text,
  tenth_percentage numeric,
  twelfth_percentage numeric,
  diploma_percentage numeric,
  cgpa numeric,
  active_backlogs int NOT NULL DEFAULT 0,
  total_backlogs int NOT NULL DEFAULT 0,
  skills text[] NOT NULL DEFAULT '{}',
  certifications text,
  projects text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, enrollment_no)
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website text,
  industry text,
  description text,
  location text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.drives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  employment_type text NOT NULL DEFAULT 'full_time',
  location text,
  work_mode text NOT NULL DEFAULT 'onsite',
  ctc numeric,
  stipend numeric,
  benefits text,
  eligible_batches int[] NOT NULL DEFAULT '{}',
  opens_at timestamptz,
  deadline timestamptz,
  ppt_at timestamptz,
  drive_date timestamptz,
  status public.drive_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  group_index int NOT NULL DEFAULT 0,
  field text NOT NULL,
  operator text NOT NULL,
  value text NOT NULL
);

CREATE TABLE public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL,
  required boolean NOT NULL DEFAULT false,
  placeholder text,
  help_text text,
  options text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.recruitment_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id uuid NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  drive_id uuid NOT NULL REFERENCES public.drives(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.application_status NOT NULL DEFAULT 'applied',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drive_id, student_id)
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  audience_type text NOT NULL DEFAULT 'all',
  audience_drive_id uuid REFERENCES public.drives(id) ON DELETE CASCADE,
  audience_branch text,
  audience_year int,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations, public.profiles, public.user_roles, public.students, public.companies, public.drives, public.eligibility_rules, public.form_fields, public.recruitment_stages, public.applications, public.announcements TO authenticated;
GRANT ALL ON public.organizations, public.profiles, public.user_roles, public.students, public.companies, public.drives, public.eligibility_rules, public.form_fields, public.recruitment_stages, public.applications, public.announcements TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_read ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY org_admin_write ON public.organizations FOR UPDATE TO authenticated USING (public.is_admin() AND id = public.my_org()) WITH CHECK (public.is_admin());

CREATE POLICY profile_self ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profile_self_ins ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profile_self_upd ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY roles_self ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY students_read ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid() OR (public.is_admin() AND org_id = public.my_org()));
CREATE POLICY students_self_upd ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid() OR (public.is_admin() AND org_id = public.my_org())) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY students_admin_ins ON public.students FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND org_id = public.my_org());
CREATE POLICY students_admin_del ON public.students FOR DELETE TO authenticated USING (public.is_admin() AND org_id = public.my_org());

CREATE POLICY companies_read ON public.companies FOR SELECT TO authenticated USING (org_id = public.my_org());
CREATE POLICY companies_admin ON public.companies FOR ALL TO authenticated USING (public.is_admin() AND org_id = public.my_org()) WITH CHECK (public.is_admin() AND org_id = public.my_org());

CREATE POLICY drives_read ON public.drives FOR SELECT TO authenticated USING (org_id = public.my_org() AND (public.is_admin() OR status <> 'draft'));
CREATE POLICY drives_admin ON public.drives FOR ALL TO authenticated USING (public.is_admin() AND org_id = public.my_org()) WITH CHECK (public.is_admin() AND org_id = public.my_org());

CREATE POLICY rules_read ON public.eligibility_rules FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org()));
CREATE POLICY rules_admin ON public.eligibility_rules FOR ALL TO authenticated USING (public.is_admin() AND EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org())) WITH CHECK (public.is_admin());

CREATE POLICY fields_read ON public.form_fields FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org()));
CREATE POLICY fields_admin ON public.form_fields FOR ALL TO authenticated USING (public.is_admin() AND EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org())) WITH CHECK (public.is_admin());

CREATE POLICY stages_read ON public.recruitment_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org()));
CREATE POLICY stages_admin ON public.recruitment_stages FOR ALL TO authenticated USING (public.is_admin() AND EXISTS (SELECT 1 FROM public.drives d WHERE d.id = drive_id AND d.org_id = public.my_org())) WITH CHECK (public.is_admin());

CREATE POLICY apps_read ON public.applications FOR SELECT TO authenticated USING ((public.is_admin() AND org_id = public.my_org()) OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()));
CREATE POLICY apps_student_ins ON public.applications FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid() AND s.org_id = org_id));
CREATE POLICY apps_upd ON public.applications FOR UPDATE TO authenticated USING ((public.is_admin() AND org_id = public.my_org()) OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())) WITH CHECK (true);
CREATE POLICY apps_admin_del ON public.applications FOR DELETE TO authenticated USING (public.is_admin() AND org_id = public.my_org());

CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated USING (org_id = public.my_org());
CREATE POLICY ann_admin ON public.announcements FOR ALL TO authenticated USING (public.is_admin() AND org_id = public.my_org()) WITH CHECK (public.is_admin() AND org_id = public.my_org());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizations ORDER BY created_at LIMIT 1;
  INSERT INTO public.profiles (id, org_id, full_name, email)
  VALUES (NEW.id, v_org, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  UPDATE public.students SET user_id = NEW.id WHERE email = NEW.email AND user_id IS NULL;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE user_id = NEW.id) THEN
    INSERT INTO public.students (org_id, user_id, full_name, email, enrollment_no)
    VALUES (v_org, NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'enrollment_no', 'TMP-' || substr(NEW.id::text,1,8)));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.claim_admin(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.organizations o JOIN public.profiles p ON p.org_id = o.id
                 WHERE p.id = auth.uid() AND o.admin_code = _code) INTO ok;
  IF ok THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
    DELETE FROM public.students WHERE user_id = auth.uid();
  END IF;
  RETURN ok;
END; $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_students_upd BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_drives_upd BEFORE UPDATE ON public.drives FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_apps_upd BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "resumes read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');
CREATE POLICY "resumes insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "resumes update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resumes');
