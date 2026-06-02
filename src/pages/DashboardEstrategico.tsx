import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Package, Trophy,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function KpiCard({
  label, value, sub, icon: Icon, highlight, warn, onClick,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  highlight?: boolean; warn?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`kpi-card card-interactive ${onClick ? "cursor-pointer hover:shadow-md" : ""} ${warn ? "border-orange-400/40" : highlight ? "border-primary/30" : ""}`}
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <div className={`p-2 rounded-lg w-fit ${warn ? "bg-orange-500/10" : highlight ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${warn ? "text-orange-500" : highlight ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <span className={`text-lg font-bold mt-1 truncate ${warn ? "text-orange-500" : highlight ? "text-primary" : ""}`}>{value}</span>
        {sub && <span className="text-[11px] text-muted-foreground truncate">{sub}</span>}
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
    queryKey: ["dash-est-itens", queryKey, vendaIds.length],
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
  const qtdVendas = vendas.length;
  return { receita, custo, lucroBruto, totalDespesas, qtdVendas };
}

type RankItem = { produto_id: string; nome: string; quantidade: number; receita: number; lucro: number };

function rankearProdutos(itens: any[]): RankItem[] {
  const map = new Map<string, RankItem>();
  for (const i of itens) {
    const id = i.produto_id;
    const nome = (i.produtos as any)?.nome ?? "Produto removido";
    const custoUnit = (i.produtos as any)?.preco_custo ?? 0;
    const qtd = i.quantidade ?? 0;
    const receita = (i.preco_unitario ?? 0) * qtd - (i.desconto ?? 0);
    const lucro = receita - custoUnit * qtd;
    const prev = map.get(id) ?? { produto_id: id, nome, quantidade: 0, receita: 0, lucro: 0 };
    prev.quantidade += qtd;
    prev.receita += receita;
    prev.lucro += lucro;
    map.set(id, prev);
  }
  return Array.from(map.values());
}

function gerarAlertas(fin: ReturnType<typeof calcFinanceiro>): string[] {
  const alertas: string[] = [];
  if (fin.totalDespesas > fin.lucroBruto && fin.lucroBruto > 0) alertas.push("Despesas superam o lucro bruto");
  return alertas;
}

function PainelGenerico({ inicio, fim, queryKey, despesasPorTipoEnabled = false }: {
  inicio: Date; fim: Date; queryKey: string; despesasPorTipoEnabled?: boolean;
}) {
  const [rankingOpen, setRankingOpen] = useState<null | "vendido" | "lucrativo">(null);
  const { data: vendas = [] } = useVendasPeriodo(inicio, fim, queryKey);
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, queryKey);
  const { data: despesas = [] } = useDespesasPeriodo(inicio, fim, queryKey);
  const fin = useMemo(() => calcFinanceiro(vendas, itens, despesas), [vendas, itens, despesas]);
  const alertas = useMemo(() => gerarAlertas(fin), [fin]);

  const rankProdutos = useMemo(() => rankearProdutos(itens), [itens]);
  const topVendido = useMemo(
    () => [...rankProdutos].sort((a, b) => b.quantidade - a.quantidade)[0] ?? null,
    [rankProdutos],
  );
  const topLucrativo = useMemo(
    () => [...rankProdutos].sort((a, b) => b.lucro - a.lucro)[0] ?? null,
    [rankProdutos],
  );

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

  const rankingOrdenado = useMemo(() => {
    if (!rankingOpen) return [];
    return [...rankProdutos].sort((a, b) =>
      rankingOpen === "vendido" ? b.quantidade - a.quantidade : b.lucro - a.lucro,
    );
  }, [rankProdutos, rankingOpen]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Receita" value={fmt(fin.receita)} icon={DollarSign} highlight />
        <KpiCard label="Despesas" value={fmt(fin.totalDespesas)} icon={TrendingDown} warn={fin.totalDespesas > 0} />
        <KpiCard
          label="Mais Vendido"
          value={topVendido?.nome ?? "—"}
          sub={topVendido ? `${topVendido.quantidade} un` : "Sem vendas"}
          icon={Package}
          onClick={topVendido ? () => setRankingOpen("vendido") : undefined}
        />
        <KpiCard
          label="Mais Lucrativo"
          value={topLucrativo?.nome ?? "—"}
          sub={topLucrativo ? fmt(topLucrativo.lucro) : "Sem vendas"}
          icon={Trophy}
          onClick={topLucrativo ? () => setRankingOpen("lucrativo") : undefined}
        />
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


      <Dialog open={!!rankingOpen} onOpenChange={(o) => !o && setRankingOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ranking — {rankingOpen === "vendido" ? "Mais Vendidos" : "Mais Lucrativos"}
            </DialogTitle>
          </DialogHeader>
          {rankingOrdenado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto vendido no período.</p>
          ) : (
            <div className="space-y-1">
              {rankingOrdenado.map((p, idx) => (
                <div key={p.produto_id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.quantidade} un • Receita {fmt(p.receita)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${p.lucro >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmt(p.lucro)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">lucro</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PainelPersonalizado() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const [inicio, setInicio] = useState(format(inicioMes, "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(hoje, "yyyy-MM-dd"));

  const dInicio = parseISO(inicio);
  const dFim = parseISO(fim);
  const key = `custom-${inicio}-${fim}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <PainelGenerico inicio={dInicio} fim={dFim} queryKey={key} despesasPorTipoEnabled />
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="semanal">Semanal</TabsTrigger>
          <TabsTrigger value="mensal">Mensal</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
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
        <TabsContent value="custom" className="mt-4">
          <PainelPersonalizado />
        </TabsContent>
      </Tabs>
    </div>
  );
}
