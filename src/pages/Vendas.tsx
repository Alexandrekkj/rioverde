import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Vendas() {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Vendas</h1>
        <Button size="sm" asChild>
          <Link to="/vendas/nova"><Plus className="mr-1 h-4 w-4" />Nova Venda</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
      ) : (
        <div className="grid gap-2">
          {vendas.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{v.clientes?.nome ?? "Cliente removido"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(v.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(v.total)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
