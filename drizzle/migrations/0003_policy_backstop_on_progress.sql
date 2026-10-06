CREATE OR REPLACE FUNCTION public.guard_application_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin() THEN
    -- Policy-safe pool: a restricted student can't be moved forward in another drive
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('under_review','shortlisted','selected') THEN
      r := public.application_block_reason(NEW.student_id, NEW.drive_id);
      IF r IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot progress this applicant: restricted by your placement policy';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'withdrawn') THEN
    RAISE EXCEPTION 'Only the placement cell can change this application';
  END IF;
  RETURN NEW;
END $$;