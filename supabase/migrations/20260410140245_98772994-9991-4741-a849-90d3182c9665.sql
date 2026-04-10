
-- Drop existing auth-only policies
DROP POLICY IF EXISTS "Authenticated users can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can manage despesas" ON public.despesas;
DROP POLICY IF EXISTS "Authenticated users can manage itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Authenticated users can manage produtos" ON public.produtos;
DROP POLICY IF EXISTS "Authenticated users can manage vendas" ON public.vendas;

-- Create public access policies (anyone can read and write)
CREATE POLICY "Public full access on clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on despesas" ON public.despesas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on itens_venda" ON public.itens_venda FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access on vendas" ON public.vendas FOR ALL USING (true) WITH CHECK (true);
