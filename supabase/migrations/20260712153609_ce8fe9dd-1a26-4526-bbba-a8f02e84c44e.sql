
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS estoque INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.ajustar_estoque_venda()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.produtos SET estoque = estoque - NEW.quantidade WHERE id = NEW.produto_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.produtos SET estoque = estoque + OLD.quantidade WHERE id = OLD.produto_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.produto_id = NEW.produto_id THEN
      UPDATE public.produtos SET estoque = estoque + OLD.quantidade - NEW.quantidade WHERE id = NEW.produto_id;
    ELSE
      UPDATE public.produtos SET estoque = estoque + OLD.quantidade WHERE id = OLD.produto_id;
      UPDATE public.produtos SET estoque = estoque - NEW.quantidade WHERE id = NEW.produto_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ajustar_estoque_venda ON public.itens_venda;
CREATE TRIGGER trg_ajustar_estoque_venda
AFTER INSERT OR UPDATE OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.ajustar_estoque_venda();
