import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, eachDayOfInterval, subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertTriangle, Sparkles,
  RefreshCw, Target, BarChart3, Scissors,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { toast } from "sonner";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

function KpiCard({
  label, value, sub, icon: Icon, highlight, trend, warn,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  highlight?: boolean; trend?: "up" | "down" | "neutral"; warn?: boolean;
}) {
  return (
    <Card className={`kpi-card card-interactive ${warn ? "border-orange-400/40" : highlight ? "border-primary/30" : ""}`}>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${warn ? "bg-orange-500/10" : highlight ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`h-4 w-4 ${warn ? "text-orange-500" : highlight ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          {trend && (
            <span className={trend === "up" ? "text-primary" : trend === "down" ? "text-destructive" : "text-muted-foreground"}>
              {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : trend === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
            </span>
          )}
        </div>
        <span className={`text-lg font-bold mt-1 ${warn ? "text-orange-500" : highlight ? "text-primary" : ""}`}>{value}</span>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {sub && <span className="text-[10px] text-muted-foreground/70">{sub}</span>}
      </CardContent>
    </Card>
  );
}

function AnalisadorIA({ periodo, dados }: { periodo: string; dados: Record<string, number | string[] | undefined> }) {
  const [analise, setAnalise] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const gerarAnalise = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analise-financeira", { body: { periodo, dados } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAnalise(data?.analise ?? "Análise não disponível.");
    } catch (e: any) { toast.error("Erro ao gerar análise: " + (e?.message ?? "desconhecido")); }
    finally { setLoading(false); }
  }, [periodo, dados]);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Resumo Executivo com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analise ? (
          <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{analise}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Clique em "Gerar Análise" para obter um resumo interpretativo inteligente do período.</p>
        )}
        <Button size="sm" variant={analise ? "outline" : "default"} onClick={gerarAnalise} disabled={loading} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analisando..." : analise ? "Regenerar" : "Gerar Análise"}
        </Button>
      </CardContent>
    </Card>
  );
}

function useVendasPeriodo(inicio: Date, fim: Date, queryKey: string) {
  return useQuery({
    queryKey: ["dash-est-vendas", queryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendas").select("id, total, data, cliente_id, desconto_geral, clientes(nome)").gte("data", startOfDay(inicio).toISOString()).lte("data", endOfDay(fim).toISOString());
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
      const { data, error } = await supabase.from("itens_venda").select("produto_id, quantidade, preco_unitario, desconto, venda_id, produtos(nome, preco_custo, preco)").in("venda_id", vendaIds);
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
      const { data, error } = await supabase.from("despesas").select("*").gte("data", startOfDay(inicio).toISOString()).lte("data", endOfDay(fim).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });
}

function calcFinanceiro(vendas: any[], itens: any[], despesas: any[]) {
  const receita = vendas.reduce((s, v) => s + (v.total ?? 0), 0);
  const custo = itens.reduce((s, i) => { const c = (i.produtos as any)?.preco_custo ?? 0; return s + c * (i.quantidade ?? 1); }, 0);
  const receitaTeorica = itens.reduce((s, i) => { const precoTabela = (i.produtos as any)?.preco ?? i.preco_unitario ?? 0; return s + precoTabela * (i.quantidade ?? 1); }, 0);
  const descontoTotal = Math.max(0, receitaTeorica - receita);
  const lucroBruto = receita - custo;
  const lucroBrutoTeorico = receitaTeorica - custo;
  const totalDespesas = despesas.reduce((s, d) => s + (d.valor ?? 0), 0);
  const lucroLiquido = lucroBruto - totalDespesas;
  const margemBruta = receita > 0 ? (lucroBruto / receita) * 100 : 0;
  const margemLiquida = receita > 0 ? (lucroLiquido / receita) * 100 : 0;
  const margemTeorica = receitaTeorica > 0 ? (lucroBrutoTeorico / receitaTeorica) * 100 : 0;
  const impactoDesconto = lucroBrutoTeorico > 0 ? (descontoTotal / lucroBrutoTeorico) * 100 : 0;
  const qtdVendas = vendas.length;
  const ticketMedio = qtdVendas > 0 ? receita / qtdVendas : 0;
  return { receita, custo, lucroBruto, lucroBrutoTeorico, totalDespesas, lucroLiquido, margemBruta, margemLiquida, margemTeorica, qtdVendas, ticketMedio, descontoTotal, impactoDesconto, receitaTeorica };
}

function gerarAlertas(fin: ReturnType<typeof calcFinanceiro>): string[] {
  const alertas: string[] = [];
  if (fin.margemLiquida < 5 && fin.receita > 0) alertas.push("Margem líquida muito baixa (< 5%)");
  if (fin.margemBruta < 15 && fin.receita > 0) alertas.push("Margem bruta abaixo de 15%");
  if (fin.totalDespesas > fin.lucroBruto && fin.lucroBruto > 0) alertas.push("Despesas superam o lucro bruto");
  if (fin.lucroLiquido < 0) alertas.push("Operação com prejuízo líquido");
  if (fin.impactoDesconto > 20) alertas.push(`Descontos consomem ${fin.impactoDesconto.toFixed(0)}% do lucro bruto`);
  return alertas;
}

function CardDescontos({ fin }: { fin: ReturnType<typeof calcFinanceiro> }) {
  if (fin.descontoTotal <= 0) return null;
  const difMargem = fin.margemTeorica - fin.margemBruta;
  return (
    <Card className="border-orange-400/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-orange-500">
          <Scissors className="h-4 w-4" /> Impacto dos Descontos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Descontos</p><p className="text-base font-bold text-orange-500">{fmt(fin.descontoTotal)}</p></div>
          <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Margem teórica</p><p className="text-base font-bold">{fin.margemTeorica.toFixed(1)}%</p></div>
          <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Margem real</p><p className="text-base font-bold text-orange-500">{fin.margemBruta.toFixed(1)}%</p></div>
          <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Impacto</p><p className="text-base font-bold text-destructive">-{fin.impactoDesconto.toFixed(1)}%</p></div>
        </div>
        {difMargem > 0 && <p className="text-xs text-orange-500 mt-3">⚠️ Descontos reduziram a margem em <strong>{difMargem.toFixed(1)} p.p.</strong></p>}
      </CardContent>
    </Card>
  );
}

function PainelDiario() {
  const hoje = new Date();
  const { data: vendas = [] } = useVendasPeriodo(hoje, hoje, "diario");
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, "diario");
  const { data: despesas = [] } = useDespesasPeriodo(hoje, hoje, "diario");
  const { data: vendas7 = [] } = useVendasPeriodo(subDays(hoje, 6), hoje, "diario-7d");
  const { data: itens7 = [] } = useItensVenda(vendas7.map((v: any) => v.id), vendas7.length > 0, "diario-7d");
  const { data: despesas7 = [] } = useDespesasPeriodo(subDays(hoje, 6), hoje, "diario-7d");
  const fin = useMemo(() => calcFinanceiro(vendas, itens, despesas), [vendas, itens, despesas]);
  const alertas = useMemo(() => gerarAlertas(fin), [fin]);
  const evolucao7d = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(hoje, 6), end: hoje });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd"); const vDia = vendas7.filter((v: any) => format(new Date(v.data), "yyyy-MM-dd") === key);
      const iDia = itens7.filter((i: any) => vDia.some((v: any) => v.id === i.venda_id)); const dDia = despesas7.filter((d2: any) => format(new Date(d2.data), "yyyy-MM-dd") === key);
      const f = calcFinanceiro(vDia, iDia, dDia); return { date: format(d, "dd/MM", { locale: ptBR }), lucro: f.lucroLiquido, receita: f.receita };
    });
  }, [vendas7, itens7, despesas7]);
  const media7 = evolucao7d.length > 0 ? evolucao7d.reduce((s, d) => s + d.lucro, 0) / evolucao7d.length : 0;
  const dadosIA = { receita: fin.receita, custo: fin.custo, lucroBruto: fin.lucroBruto, despesas: fin.totalDespesas, lucroLiquido: fin.lucroLiquido, margemBruta: fin.margemBruta, margemLiquida: fin.margemLiquida, margemTeorica: fin.margemTeorica, descontoTotal: fin.descontoTotal, impactoDesconto: fin.impactoDesconto, qtdVendas: fin.qtdVendas, ticketMedio: fin.ticketMedio, mediaLucro7dias: media7, alertas };
  const barData = [
    { name: "Receita", valor: fin.receita, fill: "hsl(var(--primary))" }, { name: "Custo Rep.", valor: fin.custo, fill: "hsl(var(--muted-foreground))" },
    { name: "Descontos", valor: fin.descontoTotal, fill: "hsl(30 80% 55%)" }, { name: "Despesas", valor: fin.totalDespesas, fill: "hsl(var(--destructive))" },
    { name: "Lucro Liq.", valor: Math.max(0, fin.lucroLiquido), fill: "hsl(160 60% 45%)" },
  ];
  return (
    <div className="space-y-4">
      {alertas.length > 0 && <Card className="border-destructive/40"><CardContent className="flex items-start gap-2 p-3"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /><div className="space-y-0.5">{alertas.map((a, i) => <p key={i} className="text-xs text-destructive font-medium">{a}</p>)}</div></CardContent></Card>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Receita Hoje" value={fmt(fin.receita)} icon={DollarSign} />
        <KpiCard label="Custo Reposição" value={fmt(fin.custo)} icon={ShoppingCart} />
        <KpiCard label="Lucro Bruto Real" value={fmt(fin.lucroBruto)} icon={TrendingUp} highlight={fin.lucroBruto > 0} />
        <KpiCard label="Descontos" value={fmt(fin.descontoTotal)} icon={Scissors} warn={fin.descontoTotal > 0} sub={fin.descontoTotal > 0 ? `-${fin.impactoDesconto.toFixed(1)}% lucro` : undefined} />
        <KpiCard label="Despesas" value={fmt(fin.totalDespesas)} icon={TrendingDown} />
        <KpiCard label="Lucro Líquido" value={fmt(fin.lucroLiquido)} icon={Target} highlight={fin.lucroLiquido > 0} trend={fin.lucroLiquido >= 0 ? "up" : "down"} />
      </div>
      <CardDescontos fin={fin} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Resumo do Dia</CardTitle></CardHeader><CardContent><ChartContainer config={{ valor: { label: "R$", color: "hsl(var(--primary))" } }} className="h-[200px] w-full"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} /><XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} /><YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="valor" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" /></BarChart></ChartContainer></CardContent></Card>
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Lucro — Últimos 7 dias</CardTitle></CardHeader><CardContent><ChartContainer config={{ receita: { label: "Receita", color: "hsl(var(--primary))" }, lucro: { label: "Lucro Líquido", color: "hsl(160 60% 45%)" } }} className="h-[200px] w-full"><LineChart data={evolucao7d}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} /><XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} /><YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="lucro" stroke="hsl(160 60% 45%)" strokeWidth={2} dot={false} /></LineChart></ChartContainer></CardContent></Card>
      </div>
      <AnalisadorIA periodo={`Diário — ${format(hoje, "dd/MM/yyyy", { locale: ptBR })}`} dados={dadosIA as any} />
    </div>
  );
}

function PainelSemanal() {
  const hoje = new Date(); const inicioSemana = startOfWeek(hoje, { locale: ptBR }); const fimSemana = endOfWeek(hoje, { locale: ptBR });
  const { data: vendas = [] } = useVendasPeriodo(inicioSemana, fimSemana, "semanal");
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, "semanal");
  const { data: despesas = [] } = useDespesasPeriodo(inicioSemana, fimSemana, "semanal");
  const fin = useMemo(() => calcFinanceiro(vendas, itens, despesas), [vendas, itens, despesas]);
  const alertas = useMemo(() => gerarAlertas(fin), [fin]);
  const mediaDiariaLucro = fin.lucroLiquido / 7;
  const evolucaoDiaria = useMemo(() => {
    const days = eachDayOfInterval({ start: inicioSemana, end: fimSemana });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd"); const vDia = vendas.filter((v: any) => format(new Date(v.data), "yyyy-MM-dd") === key);
      const iDia = itens.filter((i: any) => vDia.some((v: any) => v.id === i.venda_id)); const dDia = despesas.filter((d2: any) => format(new Date(d2.data), "yyyy-MM-dd") === key);
      const f = calcFinanceiro(vDia, iDia, dDia); return { date: format(d, "EEE", { locale: ptBR }), receita: f.receita, lucro: f.lucroLiquido, desconto: f.descontoTotal };
    });
  }, [vendas, itens, despesas]);
  const rankingProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; lucro: number }>();
    itens.forEach((i: any) => { const nome = i.produtos?.nome ?? "Desc."; const custo = (i.produtos?.preco_custo ?? 0) * (i.quantidade ?? 1); const receitaItem = (i.preco_unitario - (i.desconto ?? 0)) * (i.quantidade ?? 1); const existing = map.get(i.produto_id) ?? { nome, qtd: 0, lucro: 0 }; existing.qtd += i.quantidade ?? 1; existing.lucro += receitaItem - custo; map.set(i.produto_id, existing); });
    return Array.from(map.values()).sort((a, b) => b.lucro - a.lucro).slice(0, 5);
  }, [itens]);
  const despesasPorTipo = useMemo(() => {
    const map = new Map<string, number>(); despesas.forEach((d: any) => map.set(d.tipo, (map.get(d.tipo) ?? 0) + d.valor));
    return Array.from(map.entries()).map(([tipo, valor]) => ({ tipo, valor })).sort((a, b) => b.valor - a.valor);
  }, [despesas]);
  const dadosIA = { receita: fin.receita, custo: fin.custo, lucroBruto: fin.lucroBruto, despesas: fin.totalDespesas, lucroLiquido: fin.lucroLiquido, margemBruta: fin.margemBruta, margemLiquida: fin.margemLiquida, margemTeorica: fin.margemTeorica, descontoTotal: fin.descontoTotal, impactoDesconto: fin.impactoDesconto, qtdVendas: fin.qtdVendas, ticketMedio: fin.ticketMedio, alertas };
  return (
    <div className="space-y-4">
      {alertas.length > 0 && <Card className="border-destructive/40"><CardContent className="flex items-start gap-2 p-3"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /><div className="space-y-0.5">{alertas.map((a, i) => <p key={i} className="text-xs text-destructive font-medium">{a}</p>)}</div></CardContent></Card>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Receita Semanal" value={fmt(fin.receita)} icon={DollarSign} />
        <KpiCard label="Lucro Bruto Real" value={fmt(fin.lucroBruto)} icon={TrendingUp} highlight />
        <KpiCard label="Lucro Líquido" value={fmt(fin.lucroLiquido)} icon={Target} highlight={fin.lucroLiquido > 0} trend={fin.lucroLiquido >= 0 ? "up" : "down"} />
        <KpiCard label="Descontos" value={fmt(fin.descontoTotal)} icon={Scissors} warn={fin.descontoTotal > 0} sub={fin.descontoTotal > 0 ? `-${fin.impactoDesconto.toFixed(1)}% lucro` : undefined} />
        <KpiCard label="Despesas" value={fmt(fin.totalDespesas)} icon={TrendingDown} />
        <KpiCard label="Média Diária" value={fmt(mediaDiariaLucro)} icon={BarChart3} sub={`${fin.qtdVendas} vendas`} />
      </div>
      <CardDescontos fin={fin} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Receita x Lucro por Dia</CardTitle></CardHeader><CardContent><ChartContainer config={{ receita: { label: "Receita", color: "hsl(var(--primary))" }, lucro: { label: "Lucro", color: "hsl(160 60% 45%)" }, desconto: { label: "Desconto", color: "hsl(30 80% 55%)" } }} className="h-[200px] w-full"><BarChart data={evolucaoDiaria}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} /><XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} /><YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /><Bar dataKey="lucro" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} /><Bar dataKey="desconto" fill="hsl(30 80% 55%)" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Produtos por Lucro</CardTitle></CardHeader><CardContent>{rankingProdutos.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p> : <div className="space-y-2.5">{rankingProdutos.map((p, i) => (<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><Badge variant={i < 3 ? "default" : "secondary"} className="w-5 h-5 justify-center text-xs p-0">{i + 1}</Badge><span className="text-sm truncate max-w-[130px]">{p.nome}</span></div><div className="text-right"><p className="text-sm font-bold text-primary">{fmt(p.lucro)}</p><p className="text-[10px] text-muted-foreground">{p.qtd} un</p></div></div>))}</div>}</CardContent></Card>
      </div>
      {despesasPorTipo.length > 0 && <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Despesas por Categoria</CardTitle></CardHeader><CardContent><div className="space-y-2">{despesasPorTipo.map((d, i) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{d.tipo}</span><span className="text-sm font-medium text-destructive">{fmt(d.valor)}</span></div>))}</div></CardContent></Card>}
      <AnalisadorIA periodo={`Semanal — ${format(inicioSemana, "dd/MM", { locale: ptBR })} a ${format(fimSemana, "dd/MM/yyyy", { locale: ptBR })}`} dados={dadosIA as any} />
    </div>
  );
}

function PainelMensal() {
  const hoje = new Date(); const inicioMes = startOfMonth(hoje); const fimMes = endOfMonth(hoje);
  const inicioMesAnt = startOfMonth(subMonths(hoje, 1)); const fimMesAnt = endOfMonth(subMonths(hoje, 1));
  const { data: vendas = [] } = useVendasPeriodo(inicioMes, fimMes, "mensal");
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, "mensal");
  const { data: despesas = [] } = useDespesasPeriodo(inicioMes, fimMes, "mensal");
  const { data: vendasAnt = [] } = useVendasPeriodo(inicioMesAnt, fimMesAnt, "mensal-ant");
  const { data: itensAnt = [] } = useItensVenda(vendasAnt.map((v: any) => v.id), vendasAnt.length > 0, "mensal-ant");
  const { data: despesasAnt = [] } = useDespesasPeriodo(inicioMesAnt, fimMesAnt, "mensal-ant");
  const fin = useMemo(() => calcFinanceiro(vendas, itens, despesas), [vendas, itens, despesas]);
  const finAnt = useMemo(() => calcFinanceiro(vendasAnt, itensAnt, despesasAnt), [vendasAnt, itensAnt, despesasAnt]);
  const alertas = useMemo(() => gerarAlertas(fin), [fin]);
  const crescimentoLucro = finAnt.lucroLiquido > 0 ? ((fin.lucroLiquido - finAnt.lucroLiquido) / finAnt.lucroLiquido) * 100 : 0;
  const diaAtual = hoje.getDate(); const totalDias = fimMes.getDate();
  const projecaoReceita = diaAtual > 0 ? (fin.receita / diaAtual) * totalDias : 0;
  const projecaoLucro = diaAtual > 0 ? (fin.lucroLiquido / diaAtual) * totalDias : 0;
  const evolucaoMensal = useMemo(() => {
    const days = eachDayOfInterval({ start: inicioMes, end: hoje });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd"); const vDia = vendas.filter((v: any) => format(new Date(v.data), "yyyy-MM-dd") === key);
      const iDia = itens.filter((i: any) => vDia.some((v: any) => v.id === i.venda_id)); const dDia = despesas.filter((d2: any) => format(new Date(d2.data), "yyyy-MM-dd") === key);
      const f = calcFinanceiro(vDia, iDia, dDia); return { date: format(d, "dd", { locale: ptBR }), receita: f.receita, lucro: f.lucroLiquido, desconto: f.descontoTotal };
    });
  }, [vendas, itens, despesas]);
  const topClientes = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; lucro: number }>();
    vendas.forEach((v: any) => { const nome = v.clientes?.nome ?? "Desc."; const iv = itens.filter((i: any) => i.venda_id === v.id); const custo = iv.reduce((s: number, i: any) => s + (i.produtos?.preco_custo ?? 0) * (i.quantidade ?? 1), 0); const existing = map.get(v.cliente_id) ?? { nome, total: 0, lucro: 0 }; existing.total += v.total; existing.lucro += v.total - custo; map.set(v.cliente_id, existing); });
    return Array.from(map.values()).sort((a, b) => b.lucro - a.lucro).slice(0, 5);
  }, [vendas, itens]);
  const dadosIA = { receita: fin.receita, custo: fin.custo, lucroBruto: fin.lucroBruto, despesas: fin.totalDespesas, lucroLiquido: fin.lucroLiquido, margemBruta: fin.margemBruta, margemLiquida: fin.margemLiquida, margemTeorica: fin.margemTeorica, descontoTotal: fin.descontoTotal, impactoDesconto: fin.impactoDesconto, qtdVendas: fin.qtdVendas, ticketMedio: fin.ticketMedio, crescimento: crescimentoLucro, projecaoMes: projecaoLucro, alertas };
  const statusNegocio = crescimentoLucro > 5 ? "📈 Crescendo" : crescimentoLucro < -5 ? "📉 Regredindo" : "➡️ Estagnado";
  return (
    <div className="space-y-4">
      {alertas.length > 0 && <Card className="border-destructive/40"><CardContent className="flex items-start gap-2 p-3"><AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /><div className="space-y-0.5">{alertas.map((a, i) => <p key={i} className="text-xs text-destructive font-medium">{a}</p>)}</div></CardContent></Card>}
      <div className="flex items-center gap-2 flex-wrap"><Badge variant="outline" className="text-xs gap-1 font-semibold">Status: {statusNegocio}</Badge><Badge variant="outline" className="text-xs font-medium">{diaAtual}/{totalDias} dias</Badge></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Receita do Mês" value={fmt(fin.receita)} icon={DollarSign} sub={`Ant: ${fmt(finAnt.receita)}`} />
        <KpiCard label="Custo Reposição" value={fmt(fin.custo)} icon={ShoppingCart} />
        <KpiCard label="Lucro Bruto Real" value={fmt(fin.lucroBruto)} icon={TrendingUp} highlight />
        <KpiCard label="Descontos" value={fmt(fin.descontoTotal)} icon={Scissors} warn={fin.descontoTotal > 0} sub={fin.descontoTotal > 0 ? `-${fin.impactoDesconto.toFixed(1)}% lucro` : undefined} />
        <KpiCard label="Despesas" value={fmt(fin.totalDespesas)} icon={TrendingDown} />
        <KpiCard label="Lucro Líquido" value={fmt(fin.lucroLiquido)} icon={Target} highlight={fin.lucroLiquido > 0} trend={crescimentoLucro >= 0 ? "up" : "down"} sub={finAnt.lucroLiquido !== 0 ? pct(crescimentoLucro) + " vs ant." : ""} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-interactive"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Margem teórica</p><p className="text-lg font-bold">{fin.margemTeorica.toFixed(1)}%</p></CardContent></Card>
        <Card className="card-interactive"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Margem real</p><p className={`text-lg font-bold ${fin.descontoTotal > 0 ? "text-orange-500" : "text-primary"}`}>{fin.margemBruta.toFixed(1)}%</p></CardContent></Card>
        <Card className="card-interactive"><CardContent className="p-4"><p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Margem líquida</p><p className={`text-lg font-bold ${fin.margemLiquida >= 10 ? "text-primary" : "text-destructive"}`}>{fin.margemLiquida.toFixed(1)}%</p></CardContent></Card>
      </div>
      <CardDescontos fin={fin} />
      <Card className="border-primary/20 bg-primary/5 card-interactive"><CardContent className="p-5"><p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">📊 Projeção ao final do mês</p><div className="grid grid-cols-2 gap-4"><div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Receita projetada</p><p className="text-lg font-bold text-primary">{fmt(projecaoReceita)}</p></div><div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Lucro líq. projetado</p><p className={`text-lg font-bold ${projecaoLucro >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(projecaoLucro)}</p></div></div></CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Receita x Lucro no Mês</CardTitle></CardHeader><CardContent><ChartContainer config={{ receita: { label: "Receita", color: "hsl(var(--primary))" }, lucro: { label: "Lucro", color: "hsl(160 60% 45%)" }, desconto: { label: "Desconto", color: "hsl(30 80% 55%)" } }} className="h-[200px] w-full"><LineChart data={evolucaoMensal}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} /><XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} /><YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="lucro" stroke="hsl(160 60% 45%)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="desconto" stroke="hsl(30 80% 55%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" /></LineChart></ChartContainer></CardContent></Card>
        <Card className="card-interactive"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top 5 Clientes por Lucro</CardTitle></CardHeader><CardContent>{topClientes.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p> : <div className="space-y-2.5">{topClientes.map((c, i) => (<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><Badge variant={i < 3 ? "default" : "secondary"} className="w-5 h-5 justify-center text-xs p-0">{i + 1}</Badge><span className="text-sm truncate max-w-[130px]">{c.nome}</span></div><div className="text-right"><p className="text-sm font-bold text-primary">{fmt(c.lucro)}</p><p className="text-[10px] text-muted-foreground">Total: {fmt(c.total)}</p></div></div>))}</div>}</CardContent></Card>
      </div>
      <AnalisadorIA periodo={`Mensal — ${format(inicioMes, "MMMM/yyyy", { locale: ptBR })}`} dados={dadosIA as any} />
    </div>
  );
}

export default function DashboardEstrategico() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="heading-gradient text-2xl md:text-3xl">Dashboard Estratégico</h1>
        <p className="text-xs text-muted-foreground mt-1 font-medium">Análise financeira com lucro real e resumos inteligentes</p>
      </div>
      <Tabs defaultValue="diario">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="diario" className="mt-4"><PainelDiario /></TabsContent>
        <TabsContent value="semanal" className="mt-4"><PainelSemanal /></TabsContent>
        <TabsContent value="mensal" className="mt-4"><PainelMensal /></TabsContent>
      </Tabs>
    </div>
  );
}
