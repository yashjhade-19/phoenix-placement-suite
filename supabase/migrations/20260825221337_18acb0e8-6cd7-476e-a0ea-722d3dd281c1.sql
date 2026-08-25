ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_size text,
  ADD COLUMN IF NOT EXISTS linkedin_url text;