import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, Package, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

export default function Index() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: vendas = [] } = useQuery({
    queryKey: ["dashboard-vendas", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("total, data, cliente_id")
        .gte("data", startOfDay(new Date(startDate)).toISOString())
        .lte("data", endOfDay(new Date(endDate)).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: totalClientes = 0 } = useQuery({
    queryKey: ["dashboard-clientes-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("clientes").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: totalProdutos = 0 } = useQuery({
    queryKey: ["dashboard-produtos-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("produtos").select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = useMemo(() => {
    const totalMes = vendas.reduce((s, v) => s + v.total, 0);
    const qtdVendas = vendas.length;
    const ticketMedio = qtdVendas > 0 ? totalMes / qtdVendas : 0;
    const clientesAtivos = new Set(vendas.map((v) => v.cliente_id)).size;
    return { totalMes, qtdVendas, ticketMedio, clientesAtivos };
  }, [vendas]);

  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = eachDayOfInterval({ start, end });
    const map = new Map<string, number>();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), 0));
    vendas.forEach((v) => {
      const key = format(new Date(v.data), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + v.total);
    });
    return Array.from(map.entries()).map(([date, total]) => ({
      date: format(new Date(date), "dd/MM", { locale: ptBR }),
      total,
    }));
  }, [vendas, startDate, endDate]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Vendas no Período", value: fmt(stats.totalMes), icon: TrendingUp },
    { label: "Qtd. Vendas", value: String(stats.qtdVendas), icon: ShoppingCart },
    { label: "Ticket Médio", value: fmt(stats.ticketMedio), icon: TrendingUp },
    { label: "Clientes Ativos", value: String(stats.clientesAtivos), icon: Users },
    { label: "Clientes", value: String(totalClientes), icon: Users },
    { label: "Produtos", value: String(totalProdutos), icon: Package },
  ];

  const chartConfig = {
    total: { label: "Vendas (R$)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Filtro de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
      </div>

      {/* KPI Cards */}
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

      {/* Gráfico de vendas por dia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vendas por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
