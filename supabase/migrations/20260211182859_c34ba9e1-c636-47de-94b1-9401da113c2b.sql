
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access to clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow all access to vendas" ON public.vendas;
DROP POLICY IF EXISTS "Allow all access to produtos" ON public.produtos;
DROP POLICY IF EXISTS "Allow all access to itens_venda" ON public.itens_venda;

-- Create authenticated-only policies
CREATE POLICY "Authenticated users can manage clientes"
  ON public.clientes FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage vendas"
  ON public.vendas FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage produtos"
  ON public.produtos FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage itens_venda"
  ON public.itens_venda FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
