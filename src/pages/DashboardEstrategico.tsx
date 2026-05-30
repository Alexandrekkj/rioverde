import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function KpiCard({
  label, value, icon: Icon, highlight, warn,
}: {
  label: string; value: string; icon: React.ElementType;
  highlight?: boolean; warn?: boolean;
}) {
  return (
    <Card className={`kpi-card card-interactive ${warn ? "border-orange-400/40" : highlight ? "border-primary/30" : ""}`}>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className={`p-2 rounded-lg w-fit ${warn ? "bg-orange-500/10" : highlight ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${warn ? "text-orange-500" : highlight ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <span className={`text-lg font-bold mt-1 ${warn ? "text-orange-500" : highlight ? "text-primary" : ""}`}>{value}</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </CardContent>
    </Card>
  );
}

function useVendasPeriodo(inicio: Date, fim: Date, queryKey: string) {
  return useQuery({
    queryKey: ["dash-est-vendas", queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, total, data, cliente_id, desconto_geral")
        .gte("data", startOfDay(inicio).toISOString())
        .lte("data", endOfDay(fim).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useItensVenda(vendaIds: string[], enabled: boolean, queryKey: string) {
  return useQuery({
    queryKey: ["dash-est-itens", queryKey],
    queryFn: async () => {
      if (vendaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade, preco_unitario, desconto, venda_id, produtos(nome, preco_custo, preco)")
        .in("venda_id", vendaIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });
}

function useDespesasPeriodo(inicio: Date, fim: Date, queryKey: string) {
  return useQuery({
    queryKey: ["dash-est-despesas", queryKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .gte("data", startOfDay(inicio).toISOString())
        .lte("data", endOfDay(fim).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });
}

function calcFinanceiro(vendas: any[], itens: any[], despesas: any[]) {
  const receita = vendas.reduce((s, v) => s + (v.total ?? 0), 0);
  const custo = itens.reduce((s, i) => {
    const c = (i.produtos as any)?.preco_custo ?? 0;
    return s + c * (i.quantidade ?? 1);
  }, 0);
  const lucroBruto = receita - custo;
  const totalDespesas = despesas.reduce((s, d) => s + (d.valor ?? 0), 0);
  const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0;
  const qtdVendas = vendas.length;
  return { receita, custo, lucroBruto, totalDespesas, margemBruta, qtdVendas };
}

function gerarAlertas(fin: ReturnType<typeof calcFinanceiro>): string[] {
  const alertas: string[] = [];
  if (fin.margemBruta < 15 && fin.receita > 0) alertas.push("Margem bruta abaixo de 15%");
  if (fin.totalDespesas > fin.lucroBruto && fin.lucroBruto > 0) alertas.push("Despesas superam o lucro bruto");
  return alertas;
}

function PainelGenerico({ inicio, fim, queryKey, despesasPorTipoEnabled = false }: {
  inicio: Date; fim: Date; queryKey: string; despesasPorTipoEnabled?: boolean;
}) {
  const { data: vendas = [] } = useVendasPeriodo(inicio, fim, queryKey);
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, queryKey);
  const { data: despesas = [] } = useDespesasPeriodo(inicio, fim, queryKey);
  const fin = useMemo(() => calcFinanceiro(vendas, itens, despesas), [vendas, itens, despesas]);
  const alertas = useMemo(() => gerarAlertas(fin), [fin]);

  const barData = [
    { name: "Receita", valor: fin.receita, fill: "hsl(var(--primary))" },
    { name: "Despesas", valor: fin.totalDespesas, fill: "hsl(var(--destructive))" },
  ];

  const despesasPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    despesas.forEach((d: any) => map.set(d.tipo, (map.get(d.tipo) ?? 0) + d.valor));
    return Array.from(map.entries())
      .map(([tipo, valor]) => ({ tipo, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [despesas]);

  return (
    <div className="space-y-4">
      {alertas.length > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-2 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              {alertas.map((a, i) => <p key={i} className="text-xs text-destructive font-medium">{a}</p>)}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Receita" value={fmt(fin.receita)} icon={DollarSign} highlight />
        <KpiCard label="Despesas" value={fmt(fin.totalDespesas)} icon={TrendingDown} warn={fin.totalDespesas > 0} />
        <KpiCard label="Margem Bruta" value={`${fin.margemBruta.toFixed(1)}%`} icon={TrendingUp} />
      </div>

      <Card className="card-interactive">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Receita x Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ valor: { label: "R$", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {despesasPorTipoEnabled && despesasPorTipo.length > 0 && (
        <Card className="card-interactive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {despesasPorTipo.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{d.tipo}</span>
                  <span className="text-sm font-medium text-destructive">{fmt(d.valor)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">{fin.qtdVendas} vendas no período</Badge>
        <Badge variant="outline" className="text-xs">Lucro bruto: {fmt(fin.lucroBruto)}</Badge>
      </div>
    </div>
  );
}

export default function DashboardEstrategico() {
  const hoje = new Date();
  const inicioSemana = startOfWeek(hoje, { locale: ptBR });
  const fimSemana = endOfWeek(hoje, { locale: ptBR });
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="heading-gradient text-2xl md:text-3xl">Dashboard Estratégico</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Visão financeira por período</p>
      </div>
      <Tabs defaultValue="diario">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="diario" className="mt-4">
          <PainelGenerico inicio={hoje} fim={hoje} queryKey="diario" />
        </TabsContent>
        <TabsContent value="semanal" className="mt-4">
          <PainelGenerico inicio={inicioSemana} fim={fimSemana} queryKey="semanal" despesasPorTipoEnabled />
        </TabsContent>
        <TabsContent value="mensal" className="mt-4">
          <PainelGenerico inicio={inicioMes} fim={fimMes} queryKey="mensal" despesasPorTipoEnabled />
        </TabsContent>
      </Tabs>
    </div>
  );
}
