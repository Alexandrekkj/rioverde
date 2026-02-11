
-- Add payment method fields to vendas
ALTER TABLE public.vendas ADD COLUMN forma_pagamento text NOT NULL DEFAULT 'dinheiro';
ALTER TABLE public.vendas ADD COLUMN prazo_dias integer;

-- Create despesas table
CREATE TABLE public.despesas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data timestamp with time zone NOT NULL DEFAULT now(),
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on despesas
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- RLS policy for despesas
CREATE POLICY "Authenticated users can manage despesas"
  ON public.despesas
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
