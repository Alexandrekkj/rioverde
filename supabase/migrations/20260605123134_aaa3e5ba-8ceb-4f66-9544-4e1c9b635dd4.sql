
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS ultima_compra timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_pedido_id uuid;

CREATE OR REPLACE FUNCTION public.atualizar_ultima_compra_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET ultima_compra = NEW.data,
      ultimo_pedido_id = NEW.id
  WHERE id = NEW.cliente_id
    AND (ultima_compra IS NULL OR NEW.data >= ultima_compra);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atualizar_ultima_compra ON public.vendas;
CREATE TRIGGER trg_atualizar_ultima_compra
AFTER INSERT OR UPDATE OF data, cliente_id ON public.vendas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_ultima_compra_cliente();
