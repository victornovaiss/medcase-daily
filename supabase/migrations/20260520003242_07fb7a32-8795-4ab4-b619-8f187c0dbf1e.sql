CREATE TABLE public.premium_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preference_id TEXT,
  payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC(10,2),
  payer_email TEXT,
  premium_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_premium_purchases_preference ON public.premium_purchases(preference_id);
CREATE INDEX idx_premium_purchases_payment ON public.premium_purchases(payment_id);

ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;

-- No public policies: only service role (server) can access this table.
