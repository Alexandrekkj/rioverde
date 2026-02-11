import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Users, Package, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [vendasRes, clientesRes, produtosRes] = await Promise.all([
        supabase.from("vendas").select("total").gte("data", startOfMonth),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("produtos").select("id", { count: "exact", head: true }),
      ]);

      const vendas = vendasRes.data ?? [];
      const totalMes = vendas.reduce((s, v) => s + v.total, 0);
      const qtdVendas = vendas.length;
      const ticketMedio = qtdVendas > 0 ? totalMes / qtdVendas : 0;

      return {
        totalMes,
        qtdVendas,
        ticketMedio,
        clientes: clientesRes.count ?? 0,
        produtos: produtosRes.count ?? 0,
      };
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Vendas no Mês", value: fmt(stats?.totalMes ?? 0), icon: TrendingUp },
    { label: "Qtd. Vendas", value: String(stats?.qtdVendas ?? 0), icon: ShoppingCart },
    { label: "Ticket Médio", value: fmt(stats?.ticketMedio ?? 0), icon: TrendingUp },
    { label: "Clientes", value: String(stats?.clientes ?? 0), icon: Users },
    { label: "Produtos", value: String(stats?.produtos ?? 0), icon: Package },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex flex-col items-start gap-1 p-4">
              <c.icon className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">{c.value}</span>
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
