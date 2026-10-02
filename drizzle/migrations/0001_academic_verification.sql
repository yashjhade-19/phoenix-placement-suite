ALTER TABLE public.students
  ADD COLUMN academic_verification_status text NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN academic_verified_at timestamptz,
  ADD COLUMN academic_verified_by uuid,
  ADD COLUMN academic_verification_notes text;

UPDATE public.students SET academic_verification_status = 'verified', academic_verified_at = now();

ALTER TABLE public.students ADD CONSTRAINT students_academic_verification_status_check
  CHECK (academic_verification_status IN ('pending_verification','verified','needs_correction'));

CREATE OR REPLACE FUNCTION public.guard_student_academic()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE academic_changed boolean;
BEGIN
  academic_changed := NEW.cgpa IS DISTINCT FROM OLD.cgpa
    OR NEW.tenth_percentage IS DISTINCT FROM OLD.tenth_percentage
    OR NEW.twelfth_percentage IS DISTINCT FROM OLD.twelfth_percentage
    OR NEW.diploma_percentage IS DISTINCT FROM OLD.diploma_percentage
    OR NEW.active_backlogs IS DISTINCT FROM OLD.active_backlogs
    OR NEW.total_backlogs IS DISTINCT FROM OLD.total_backlogs
    OR NEW.branch IS DISTINCT FROM OLD.branch
    OR NEW.course IS DISTINCT FROM OLD.course
    OR NEW.graduation_year IS DISTINCT FROM OLD.graduation_year
    OR NEW.enrollment_no IS DISTINCT FROM OLD.enrollment_no;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin() THEN
    -- Admin edits to verified academic data require re-verification unless the same update verifies.
    IF academic_changed AND OLD.academic_verification_status = 'verified'
       AND NEW.academic_verification_status = 'verified'
       AND NEW.academic_verified_at IS NOT DISTINCT FROM OLD.academic_verified_at THEN
      NEW.academic_verification_status := 'pending_verification';
      NEW.academic_verified_at := NULL;
      NEW.academic_verified_by := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.academic_verification_status IS DISTINCT FROM OLD.academic_verification_status
     OR NEW.academic_verified_at IS DISTINCT FROM OLD.academic_verified_at
     OR NEW.academic_verified_by IS DISTINCT FROM OLD.academic_verified_by
     OR NEW.academic_verification_notes IS DISTINCT FROM OLD.academic_verification_notes THEN
    RAISE EXCEPTION 'Only the placement cell can change academic verification';
  END IF;
  IF academic_changed AND OLD.academic_verification_status = 'verified' THEN
    RAISE EXCEPTION 'Your academic information has been verified by the Placement Cell and cannot be edited.';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER t_students_academic_guard BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_academic();