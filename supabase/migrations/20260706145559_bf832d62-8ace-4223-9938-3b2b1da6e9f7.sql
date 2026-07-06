
-- Add "paga" column to vendas to mark paid installment sales
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS paga boolean NOT NULL DEFAULT false;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS paga_em timestamptz;

-- Sellers table
CREATE TABLE IF NOT EXISTS public.vendedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO anon;
GRANT ALL ON public.vendedores TO service_role;
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on vendedores" ON public.vendedores FOR ALL USING (true) WITH CHECK (true);

-- Join table venda_vendedores
CREATE TABLE IF NOT EXISTS public.venda_vendedores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(venda_id, vendedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_vendedores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_vendedores TO anon;
GRANT ALL ON public.venda_vendedores TO service_role;
ALTER TABLE public.venda_vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on venda_vendedores" ON public.venda_vendedores FOR ALL USING (true) WITH CHECK (true);

-- Seed 3 default sellers
INSERT INTO public.vendedores (nome) VALUES ('Jorge Star'), ('Yuri C.'), ('Alexandre H.')
ON CONFLICT DO NOTHING;
