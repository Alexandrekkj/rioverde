
CREATE OR REPLACE FUNCTION public.atualizar_ultima_compra_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
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
