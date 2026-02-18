import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, startOfDay, endOfDay, differenceInDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, DollarSign } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Insights() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [diasInativo, setDiasInativo] = useState(30);

  const { data: vendas = [] } = useQuery({
    queryKey: ["insights-vendas", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, total, data, cliente_id, forma_pagamento, prazo_dias, clientes(nome, nicho)")
        .gte("data", startOfDay(new Date(startDate)).toISOString())
        .lte("data", endOfDay(new Date(endDate)).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["insights-despesas", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .gte("data", startOfDay(new Date(startDate)).toISOString())
        .lte("data", endOfDay(new Date(endDate)).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allClientes = [] } = useQuery({
    queryKey: ["insights-all-clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome, nicho");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allVendas = [] } = useQuery({
    queryKey: ["insights-all-vendas-dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendas").select("cliente_id, data").order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Entradas x Despesas por dia
  const entradasDespesasData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = eachDayOfInterval({ start, end });
    const mapEntradas = new Map<string, number>();
    const mapDespesas = new Map<string, number>();
    days.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      mapEntradas.set(key, 0);
      mapDespesas.set(key, 0);
    });
    vendas.forEach((v: any) => {
      const key = format(new Date(v.data), "yyyy-MM-dd");
      mapEntradas.set(key, (mapEntradas.get(key) ?? 0) + v.total);
    });
    despesas.forEach((d: any) => {
      const key = format(new Date(d.data), "yyyy-MM-dd");
      mapDespesas.set(key, (mapDespesas.get(key) ?? 0) + d.valor);
    });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return {
        date: format(d, "dd/MM", { locale: ptBR }),
        entradas: mapEntradas.get(key) ?? 0,
        despesas: mapDespesas.get(key) ?? 0,
      };
    });
  }, [vendas, despesas, startDate, endDate]);

  const clientesInativos = useMemo(() => {
    const now = new Date();
    const lastPurchase = new Map<string, Date>();
    allVendas.forEach((v) => {
      if (!lastPurchase.has(v.cliente_id)) lastPurchase.set(v.cliente_id, new Date(v.data));
    });
    return allClientes
      .map((c) => {
        const last = lastPurchase.get(c.id);
        const dias = last ? differenceInDays(now, last) : Infinity;
        return { ...c, ultimaCompra: last, diasSemCompra: dias };
      })
      .filter((c) => c.diasSemCompra >= diasInativo)
      .sort((a, b) => b.diasSemCompra - a.diasSemCompra);
  }, [allClientes, allVendas, diasInativo]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const chartConfigED = {
    entradas: { label: "Entradas (R$)", color: "hsl(var(--primary))" },
    despesas: { label: "Despesas (R$)", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Insights Comerciais</h1>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Inativo após (dias)</Label>
          <Input type="number" value={diasInativo} onChange={(e) => setDiasInativo(Number(e.target.value))} className="h-8 w-20 text-xs" min={1} />
        </div>
      </div>

      {/* Entradas x Despesas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-primary" />
            Entradas x Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entradasDespesasData.length > 0 ? (
            <ChartContainer config={chartConfigED} className="h-[220px] w-full">
              <BarChart data={entradasDespesasData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="entradas" fill="var(--color-entradas)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período.</p>
          )}
        </CardContent>
      </Card>

      {/* Clientes Inativos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Clientes Inativos ({clientesInativos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientesInativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente inativo.</p>
          ) : (
            <div className="space-y-2">
              {clientesInativos.slice(0, 15).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-2">
                  <div>
                    <p className="text-sm font-medium">{c.nome}</p>
                    {c.nicho && <p className="text-xs text-muted-foreground">{c.nicho}</p>}
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {c.diasSemCompra === Infinity ? "Nunca comprou" : `${c.diasSemCompra}d sem compra`}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
