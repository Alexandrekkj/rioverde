CREATE TABLE public.cidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cidades TO anon, authenticated;
GRANT ALL ON public.cidades TO service_role;
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on cidades" ON public.cidades FOR ALL USING (true) WITH CHECK (true);