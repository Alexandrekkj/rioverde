CREATE TABLE public.nichos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nichos TO anon, authenticated;
GRANT ALL ON public.nichos TO service_role;

ALTER TABLE public.nichos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access on nichos"
ON public.nichos
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.nichos (nome) VALUES
  ('Comercial'),
  ('Churrascaria'),
  ('Mercado'),
  ('Padaria'),
  ('Restaurante')
ON CONFLICT (nome) DO NOTHING;