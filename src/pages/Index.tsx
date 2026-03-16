import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, Package, TrendingUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, eachDayOfInterval, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

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
    { label: "Vendas no Período", value: fmt(stats.totalMes), icon: TrendingUp, color: "text-primary" },
    { label: "Qtd. Vendas", value: String(stats.qtdVendas), icon: ShoppingCart, color: "text-blue-600" },
    { label: "Ticket Médio", value: fmt(stats.ticketMedio), icon: Sparkles, color: "text-amber-600" },
    { label: "Clientes Ativos", value: String(stats.clientesAtivos), icon: Users, color: "text-violet-600" },
    { label: "Clientes", value: String(totalClientes), icon: Users, color: "text-rose-600" },
    { label: "Produtos", value: String(totalProdutos), icon: Package, color: "text-cyan-600" },
  ];

  const chartConfig = {
    total: { label: "Vendas (R$)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs font-medium text-muted-foreground">De</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs font-medium text-muted-foreground">Até</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, index) => (
          <Card
            key={c.label}
            className="card-interactive animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-muted">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold text-foreground tracking-tight">
                {c.value}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                {c.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Vendas por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
