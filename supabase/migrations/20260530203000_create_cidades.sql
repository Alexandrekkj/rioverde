CREATE TABLE public.cidades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cidades TO anon, authenticated;
GRANT ALL ON public.cidades TO service_role;

ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public full access on cidades"
ON public.cidades
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.cidades (nome) VALUES ('Rio Verde') ON CONFLICT (nome) DO NOTHING;
