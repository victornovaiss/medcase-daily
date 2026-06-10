
CREATE TABLE public.premium_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  type text NOT NULL DEFAULT 'full_access',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read premium codes"
ON public.premium_codes FOR SELECT
USING (true);

CREATE TABLE public.emergency_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read emergency cases"
ON public.emergency_cases FOR SELECT
USING (true);
