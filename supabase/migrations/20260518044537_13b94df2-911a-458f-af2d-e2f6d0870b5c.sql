
CREATE TABLE public.daily_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  mode text NOT NULL CHECK (mode IN ('clinical','pediatrics','gyneco')),
  title text NOT NULL,
  case_text text NOT NULL,
  exam_options jsonb NOT NULL,
  exam_results jsonb NOT NULL,
  correct_exam text NOT NULL,
  treatment_options jsonb NOT NULL,
  correct_treatment text NOT NULL,
  diagnosis text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date, mode)
);

ALTER TABLE public.daily_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily cases"
  ON public.daily_cases FOR SELECT
  USING (true);

-- Writes are blocked from clients; admin writes go through server function using service role.

-- Seed a few cases for today and tomorrow per mode
INSERT INTO public.daily_cases (date, mode, title, case_text, exam_options, exam_results, correct_exam, treatment_options, correct_treatment, diagnosis) VALUES
(CURRENT_DATE, 'clinical', 'Dor torácica súbita',
 E'Homem, 58 anos, tabagista. Queixa: dor torácica súbita há 2 horas, associada a dispneia.\n\nSinais vitais: PA 110/70, FC 118, FR 28, SatO2 88% em ar ambiente, Tax 36.8°C.\n\nExame físico: taquipneico, MV preservado, sem estertores, edema assimétrico em MID.',
 '["EAS","Hemograma","Angiotomografia de tórax","Raio-X de tórax","Gasometria arterial"]'::jsonb,
 '{"EAS":"Sem alterações.","Hemograma":"Leucócitos normais.","Angiotomografia de tórax":"Defeito de enchimento em artéria pulmonar direita.","Raio-X de tórax":"Sem alterações agudas.","Gasometria arterial":"Hipoxemia discreta."}'::jsonb,
 'Angiotomografia de tórax',
 '["Alta hospitalar","Anticoagulação plena","Antibioticoterapia","Corticoide endovenoso","Broncodilatador inalatório"]'::jsonb,
 'Anticoagulação plena',
 'Tromboembolismo pulmonar'),

(CURRENT_DATE, 'pediatrics', 'Lactente com febre e tosse',
 E'Lactente, 8 meses, previamente hígido. Febre 39°C há 3 dias, tosse e dificuldade para mamar.\n\nSinais vitais: FC 160, FR 60, SatO2 92%, Tax 39.1°C.\n\nExame físico: tiragem subcostal, sibilos difusos, MV diminuído à direita.',
 '["Hemograma","Raio-X de tórax","Teste rápido para influenza","Urocultura","Punção lombar"]'::jsonb,
 '{"Hemograma":"Leucocitose discreta.","Raio-X de tórax":"Infiltrado intersticial bilateral com consolidação à direita.","Teste rápido para influenza":"Negativo.","Urocultura":"Sem crescimento.","Punção lombar":"Líquor cristalino, sem alterações."}'::jsonb,
 'Raio-X de tórax',
 '["Amoxicilina oral + oxigenoterapia","Alta com sintomáticos","Corticoide sistêmico","Antiviral (oseltamivir)","Apenas observação domiciliar"]'::jsonb,
 'Amoxicilina oral + oxigenoterapia',
 'Pneumonia bacteriana'),

(CURRENT_DATE, 'gyneco', 'Sangramento na gestação',
 E'Mulher, 28 anos, G2P1, IG 32 semanas. Sangramento vaginal vermelho-vivo, indolor, há 1 hora.\n\nSinais vitais: PA 100/60, FC 102, FR 18, Tax 36.5°C.\n\nExame físico: abdome flácido, útero indolor, BCF 140 bpm. Ausência de contrações.',
 '["Toque vaginal imediato","Ultrassonografia obstétrica","Cardiotocografia","Amniocentese","Tomografia abdominal"]'::jsonb,
 '{"Toque vaginal imediato":"Contraindicado neste contexto.","Ultrassonografia obstétrica":"Placenta recobrindo orifício interno do colo.","Cardiotocografia":"BCF reativo, sem desacelerações.","Amniocentese":"Não indicada.","Tomografia abdominal":"Sem alterações relevantes."}'::jsonb,
 'Ultrassonografia obstétrica',
 '["Cesariana de urgência se sangramento volumoso","Indução do parto vaginal","Alta com repouso","Toque vaginal seriado","Antibioticoterapia empírica"]'::jsonb,
 'Cesariana de urgência se sangramento volumoso',
 'Placenta prévia');
