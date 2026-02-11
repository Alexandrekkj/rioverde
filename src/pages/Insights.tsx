import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, startOfDay, endOfDay, differenceInDays } from "date-fns";
import { Trophy, TrendingDown, AlertTriangle, BarChart3, Users } from "lucide-react";

export default function Insights() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [diasInativo, setDiasInativo] = useState(30);

  // Fetch vendas with items and client info for the period
  const { data: vendas = [] } = useQuery({
    queryKey: ["insights-vendas", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, total, data, cliente_id, clientes(nome, nicho)")
        .gte("data", startOfDay(new Date(startDate)).toISOString())
        .lte("data", endOfDay(new Date(endDate)).toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: itensVenda = [] } = useQuery({
    queryKey: ["insights-itens", startDate, endDate],
    queryFn: async () => {
      const vendaIds = vendas.map((v) => v.id);
      if (vendaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade, preco_unitario, venda_id, produtos(nome)")
        .in("venda_id", vendaIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: vendas.length > 0,
  });

  // All clients for inactivity check
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

  // Ranking de produtos mais vendidos
  const rankingProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; receita: number }>();
    itensVenda.forEach((item: any) => {
      const nome = item.produtos?.nome ?? "Desconhecido";
      const existing = map.get(item.produto_id) ?? { nome, qtd: 0, receita: 0 };
      existing.qtd += item.quantidade;
      existing.receita += item.quantidade * item.preco_unitario;
      map.set(item.produto_id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd);
  }, [itensVenda]);

  // Top clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; qtd: number }>();
    vendas.forEach((v: any) => {
      const nome = v.clientes?.nome ?? "Desconhecido";
      const existing = map.get(v.cliente_id) ?? { nome, total: 0, qtd: 0 };
      existing.total += v.total;
      existing.qtd += 1;
      map.set(v.cliente_id, existing);
    });
    return Array.from(map.values())
      .map((c) => ({ ...c, ticketMedio: c.qtd > 0 ? c.total / c.qtd : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [vendas]);

  // Clientes inativos
  const clientesInativos = useMemo(() => {
    const now = new Date();
    const lastPurchase = new Map<string, Date>();
    allVendas.forEach((v) => {
      if (!lastPurchase.has(v.cliente_id)) {
        lastPurchase.set(v.cliente_id, new Date(v.data));
      }
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

      {/* Ranking de Produtos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-primary" />
            Ranking de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankingProdutos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <div className="space-y-2">
              {rankingProdutos.slice(0, 10).map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={i < 3 ? "default" : "secondary"} className="w-6 justify-center text-xs">
                      {i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{p.nome}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{p.qtd} un</p>
                    <p className="text-xs text-muted-foreground">{fmt(p.receita)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Clientes + Ticket Médio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            Top Clientes & Ticket Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topClientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
          ) : (
            <div className="space-y-2">
              {topClientes.slice(0, 10).map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={i < 3 ? "default" : "secondary"} className="w-6 justify-center text-xs">
                      {i + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.qtd} vendas · Ticket: {fmt(c.ticketMedio)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
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
