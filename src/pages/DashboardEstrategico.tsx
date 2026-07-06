import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  format, startOfDay, endOfDay, startOfMonth, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingDown, DollarSign, AlertTriangle, Package, Trophy, Users, Medal,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | Date) => format(typeof d === "string" ? parseISO(d) : d, "dd/MM/yyyy", { locale: ptBR });

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
        .select("id, total, data, cliente_id, desconto_geral, clientes(nome), venda_vendedores(vendedor_id, vendedores(nome))")
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

function calcFinanceiro(vendas: any[], despesas: any[]) {
  const receita = vendas.reduce((s, v) => s + (v.total ?? 0), 0);
  const totalDespesas = despesas.reduce((s, d) => s + (d.valor ?? 0), 0);
  const qtdVendas = vendas.length;
  return { receita, totalDespesas, qtdVendas };
}

type RankItem = { produto_id: string; nome: string; quantidade: number; receita: number };

function rankearProdutos(itens: any[]): RankItem[] {
  const map = new Map<string, RankItem>();
  for (const i of itens) {
    const id = i.produto_id;
    const nome = (i.produtos as any)?.nome ?? "Produto removido";
    const qtd = i.quantidade ?? 0;
    const receita = (i.preco_unitario ?? 0) * qtd - (i.desconto ?? 0);
    const prev = map.get(id) ?? { produto_id: id, nome, quantidade: 0, receita: 0 };
    prev.quantidade += qtd;
    prev.receita += receita;
    map.set(id, prev);
  }
  return Array.from(map.values());
}

type ClienteRank = { cliente_id: string; nome: string; total: number; qtdCompras: number };

function rankearClientes(vendas: any[]): ClienteRank[] {
  const map = new Map<string, ClienteRank>();
  for (const v of vendas) {
    const id = v.cliente_id;
    const nome = (v.clientes as any)?.nome ?? "Cliente removido";
    const prev = map.get(id) ?? { cliente_id: id, nome, total: 0, qtdCompras: 0 };
    prev.total += v.total ?? 0;
    prev.qtdCompras += 1;
    map.set(id, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

type VendedorRank = { vendedor_id: string; nome: string; total: number; qtdVendas: number; posicao: number };

function rankearVendedores(vendas: any[]): VendedorRank[] {
  const map = new Map<string, { nome: string; total: number; qtd: number }>();
  for (const v of vendas) {
    const vvs = (v.venda_vendedores as any[]) ?? [];
    if (vvs.length === 0) continue;
    // Split the sale value equally among the associated sellers
    const share = (v.total ?? 0) / vvs.length;
    for (const vv of vvs) {
      const id = vv.vendedor_id;
      const nome = vv.vendedores?.nome ?? "—";
      const prev = map.get(id) ?? { nome, total: 0, qtd: 0 };
      prev.total += share;
      prev.qtd += 1;
      map.set(id, prev);
    }
  }
  const arr = Array.from(map.entries())
    .map(([vendedor_id, v]) => ({ vendedor_id, nome: v.nome, total: v.total, qtdVendas: v.qtd, posicao: 0 }))
    .sort((a, b) => b.total - a.total);
  // Dense ranking (ties share the same position)
  let lastTotal = -1;
  let lastPos = 0;
  arr.forEach((r, i) => {
    if (i === 0 || r.total !== lastTotal) {
      lastPos = i + 1;
      lastTotal = r.total;
    }
    r.posicao = lastPos;
  });
  return arr;
}

function PainelGenerico({ inicio, fim, queryKey, despesasPorTipoEnabled = false }: {
  inicio: Date; fim: Date; queryKey: string; despesasPorTipoEnabled?: boolean;
}) {
  const [rankingOpen, setRankingOpen] = useState<null | "vendido" | "lucrativo">(null);
  const [produtoDetalhe, setProdutoDetalhe] = useState<RankItem | null>(null);
  const [clientesOpen, setClientesOpen] = useState(false);
  const [clienteDetalhe, setClienteDetalhe] = useState<ClienteRank | null>(null);

  const { data: vendas = [] } = useVendasPeriodo(inicio, fim, queryKey);
  const { data: itens = [] } = useItensVenda(vendas.map((v: any) => v.id), vendas.length > 0, queryKey);
  const { data: despesas = [] } = useDespesasPeriodo(inicio, fim, queryKey);
  const fin = useMemo(() => calcFinanceiro(vendas, despesas), [vendas, despesas]);

  const alertas = useMemo(() => {
    const a: string[] = [];
    if (fin.totalDespesas > fin.receita && fin.receita > 0) a.push("Despesas superam a receita");
    return a;
  }, [fin]);

  // venda lookup -> { cliente_nome, data }
  const vendaInfo = useMemo(() => {
    const m = new Map<string, { cliente: string; data: string }>();
    vendas.forEach((v: any) => m.set(v.id, { cliente: (v.clientes as any)?.nome ?? "—", data: v.data }));
    return m;
  }, [vendas]);

  const rankProdutos = useMemo(() => rankearProdutos(itens), [itens]);
  const topVendido = useMemo(
    () => [...rankProdutos].sort((a, b) => b.quantidade - a.quantidade)[0] ?? null,
    [rankProdutos],
  );
  const topLucrativo = useMemo(
    () => [...rankProdutos].sort((a, b) => b.receita - a.receita)[0] ?? null,
    [rankProdutos],
  );

  const rankClientes = useMemo(() => rankearClientes(vendas), [vendas]);
  const topCliente = rankClientes[0] ?? null;

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
      rankingOpen === "vendido" ? b.quantidade - a.quantidade : b.receita - a.receita,
    );
  }, [rankProdutos, rankingOpen]);

  // Compras do produto selecionado: lista de { cliente, data, quantidade }
  const comprasProduto = useMemo(() => {
    if (!produtoDetalhe) return [];
    return itens
      .filter((i: any) => i.produto_id === produtoDetalhe.produto_id)
      .map((i: any) => {
        const info = vendaInfo.get(i.venda_id);
        return {
          cliente: info?.cliente ?? "—",
          data: info?.data ?? "",
          quantidade: i.quantidade ?? 0,
          receita: (i.preco_unitario ?? 0) * (i.quantidade ?? 0) - (i.desconto ?? 0),
        };
      })
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [produtoDetalhe, itens, vendaInfo]);

  // Compras do cliente selecionado
  const comprasCliente = useMemo(() => {
    if (!clienteDetalhe) return [];
    return vendas
      .filter((v: any) => v.cliente_id === clienteDetalhe.cliente_id)
      .map((v: any) => ({ id: v.id, data: v.data, total: v.total ?? 0 }))
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [clienteDetalhe, vendas]);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Receita" value={fmt(fin.receita)} sub={`${fin.qtdVendas} venda(s)`} icon={DollarSign} highlight />
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
          sub={topLucrativo ? fmt(topLucrativo.receita) : "Sem vendas"}
          icon={Trophy}
          onClick={topLucrativo ? () => setRankingOpen("lucrativo") : undefined}
        />
        <KpiCard
          label="Cliente Top"
          value={topCliente?.nome ?? "—"}
          sub={topCliente ? fmt(topCliente.total) : "Sem vendas"}
          icon={Users}
          onClick={topCliente ? () => setClientesOpen(true) : undefined}
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

      {/* Ranking de produtos */}
      <Dialog open={!!rankingOpen} onOpenChange={(o) => !o && setRankingOpen(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ranking — {rankingOpen === "vendido" ? "Mais Vendidos" : "Maior Receita"}
            </DialogTitle>
          </DialogHeader>
          {rankingOrdenado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto vendido no período.</p>
          ) : (
            <div className="space-y-1">
              {rankingOrdenado.map((p, idx) => (
                <button
                  key={p.produto_id}
                  onClick={() => setProdutoDetalhe(p)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.quantidade} un vendidas</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">{fmt(p.receita)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">receita</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhe de compras por produto */}
      <Dialog open={!!produtoDetalhe} onOpenChange={(o) => !o && setProdutoDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{produtoDetalhe?.nome} — Compras no período</DialogTitle>
          </DialogHeader>
          {comprasProduto.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra encontrada.</p>
          ) : (
            <div className="space-y-1">
              {comprasProduto.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.cliente}</p>
                    <p className="text-xs text-muted-foreground">{c.data ? fmtDate(c.data) : "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{c.quantidade} un</p>
                    <p className="text-[10px] text-muted-foreground">{fmt(c.receita)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ranking de clientes */}
      <Dialog open={clientesOpen} onOpenChange={setClientesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clientes que mais compraram</DialogTitle>
          </DialogHeader>
          {rankClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem vendas no período.</p>
          ) : (
            <div className="space-y-1">
              {rankClientes.map((c, idx) => (
                <button
                  key={c.cliente_id}
                  onClick={() => setClienteDetalhe(c)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.qtdCompras} compra(s)</p>
                  </div>
                  <p className="text-sm font-bold text-primary shrink-0">{fmt(c.total)}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhe de compras por cliente */}
      <Dialog open={!!clienteDetalhe} onOpenChange={(o) => !o && setClienteDetalhe(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clienteDetalhe?.nome} — Compras no período</DialogTitle>
          </DialogHeader>
          {comprasCliente.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma compra.</p>
          ) : (
            <div className="space-y-1">
              {comprasCliente.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                  <p className="text-sm">{fmtDate(c.data)}</p>
                  <p className="text-sm font-bold text-primary">{fmt(c.total)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 p-2 border-t mt-2 pt-3">
                <p className="text-sm font-semibold">Total</p>
                <p className="text-sm font-bold">{fmt(clienteDetalhe?.total ?? 0)}</p>
              </div>
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
