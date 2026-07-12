import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Radar, Search, Calendar, AlertTriangle, Star, ShoppingBag, Receipt, Phone, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type CobrancaItem = {
  vendaId: string;
  clienteId: string;
  clienteNome: string;
  telefone: string | null;
  data: Date;
  vencimento: Date;
  diasRestantes: number;
  prazoDias: number;
  total: number;
};

function classifyCobranca(dias: number) {
  if (dias <= 0) return { label: "Vencido", bar: "bg-red-600", text: "text-red-700", ring: "ring-red-300 dark:ring-red-900" };
  if (dias <= 5) return { label: "Urgente", bar: "bg-red-500", text: "text-red-600", ring: "ring-red-200 dark:ring-red-900" };
  if (dias <= 10) return { label: "Atenção", bar: "bg-amber-500", text: "text-amber-600", ring: "" };
  return { label: "Em dia", bar: "bg-emerald-500", text: "text-emerald-600", ring: "" };
}

function Cobrancas() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [excluir, setExcluir] = useState<CobrancaItem | null>(null);
  const queryClient = useQueryClient();

  const { data: vendas = [] } = useQuery({
    queryKey: ["cobrancas-a-prazo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, data, total, prazo_dias, cliente_id, paga, clientes(id, nome, telefone)")
        .eq("forma_pagamento", "a_prazo")
        .eq("paga", false)
        .not("prazo_dias", "is", null)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const pagarMut = useMutation({
    mutationFn: async (vendaId: string) => {
      const { error } = await supabase
        .from("vendas")
        .update({ paga: true, paga_em: new Date().toISOString() })
        .eq("id", vendaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas-a-prazo"] });
      toast.success("Cobrança marcada como paga!");
    },
    onError: () => toast.error("Erro ao registrar pagamento"),
  });

  const excluirMut = useMutation({
    mutationFn: async (vendaId: string) => {
      await supabase.from("itens_venda").delete().eq("venda_id", vendaId);
      const { error } = await supabase.from("vendas").delete().eq("id", vendaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cobrancas-a-prazo"] });
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Cobrança excluída!");
      setExcluir(null);
    },
    onError: () => toast.error("Erro ao excluir cobrança"),
  });

  const cobrancas: CobrancaItem[] = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return vendas
      .filter((v) => v.clientes)
      .map((v) => {
        const data = new Date(v.data);
        const venc = new Date(data);
        venc.setDate(venc.getDate() + (v.prazo_dias ?? 0));
        venc.setHours(0, 0, 0, 0);
        const dias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return {
          vendaId: v.id,
          clienteId: v.cliente_id,
          clienteNome: v.clientes.nome,
          telefone: v.clientes.telefone ?? null,
          data,
          vencimento: venc,
          diasRestantes: dias,
          prazoDias: v.prazo_dias ?? 0,
          total: Number(v.total ?? 0),
        };
      });
  }, [vendas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cobrancas
      .filter((c) => (q ? c.clienteNome.toLowerCase().includes(q) : true))
      .filter((c) => {
        if (filtro === "todos") return true;
        if (filtro === "vencido") return c.diasRestantes <= 0;
        if (filtro === "urgente") return c.diasRestantes > 0 && c.diasRestantes <= 5;
        if (filtro === "atencao") return c.diasRestantes > 5 && c.diasRestantes <= 10;
        if (filtro === "emdia") return c.diasRestantes > 10;
        return true;
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [cobrancas, busca, filtro]);

  const counts = useMemo(() => {
    const c = { vencido: 0, urgente: 0, atencao: 0, emdia: 0, total: 0 };
    for (const x of cobrancas) {
      c.total += x.total;
      if (x.diasRestantes <= 0) c.vencido++;
      else if (x.diasRestantes <= 5) c.urgente++;
      else if (x.diasRestantes <= 10) c.atencao++;
      else c.emdia++;
    }
    return c;
  }, [cobrancas]);

  const fmtData = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-600" />Vencidas</div>
          <div className="text-2xl font-bold mt-1 text-red-700">{counts.vencido}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-500" />Urgente (1-5d)</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{counts.urgente}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />Atenção (6-10d)</div>
          <div className="text-2xl font-bold mt-1 text-amber-600">{counts.atencao}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Em dia (10+ d)</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{counts.emdia}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Receipt className="h-3 w-3" />Total a receber</div>
          <div className="text-lg font-bold mt-1 text-primary">{fmtMoney(counts.total)}</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="vencido">Vencidas</SelectItem>
            <SelectItem value="urgente">Urgente (1-5 dias)</SelectItem>
            <SelectItem value="atencao">Atenção (6-10 dias)</SelectItem>
            <SelectItem value="emdia">Em dia (10+ dias)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma cobrança a prazo encontrada.
          </CardContent></Card>
        ) : (
          filtradas.map((c) => {
            const cls = classifyCobranca(c.diasRestantes);
            return (
              <Card key={c.vendaId} className={cn("overflow-hidden", cls.ring && `ring-1 ${cls.ring}`)}>
                <div className={cn("h-1 w-full", cls.bar)} />
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{c.clienteNome}</h3>
                        <Badge className={cn("text-white text-[10px]", cls.bar, `hover:${cls.bar}`)}>
                          {c.diasRestantes <= 5 && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {cls.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">Prazo: {c.prazoDias} dias</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Venda: {fmtData(c.data)}</span>
                        <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />Vence: {fmtData(c.vencimento)}</span>
                        {c.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                      </div>
                      <div className="text-sm font-semibold text-primary mt-1.5">{fmtMoney(c.total)}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <div className={cn("text-2xl font-bold leading-none", cls.text)}>
                          {c.diasRestantes <= 0 ? Math.abs(c.diasRestantes) : c.diasRestantes}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                          {c.diasRestantes <= 0 ? (c.diasRestantes === 0 ? "vence hoje" : "dias atraso") : "dias restantes"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        onClick={() => pagarMut.mutate(c.vendaId)}
                        disabled={pagarMut.isPending}
                        aria-label="Marcar como paga"
                        title="Marcar como paga"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setExcluir(c)}
                        aria-label="Excluir cobrança"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              A venda a prazo de <strong>{excluir?.clienteNome}</strong> no valor de{" "}
              <strong>{excluir ? fmtMoney(excluir.total) : ""}</strong> será removida permanentemente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluir && excluirMut.mutate(excluir.vendaId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HistoricoCliente({ clienteId, clienteNome, onClose }: { clienteId: string; clienteNome: string; onClose: () => void }) {
  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["historico-cliente", clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("id, data, total, forma_pagamento, itens_venda(quantidade, preco_unitario, desconto, produtos(nome))")
        .eq("cliente_id", clienteId)
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ultima = vendas[0];
  const fmtData = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            {clienteNome}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : vendas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Cliente ainda não realizou compras.</p>
        ) : (
          <div className="space-y-4">
            {ultima && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">Última compra</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{fmtData(ultima.data)}</span>
                    <span className="text-lg font-bold text-primary">{fmtMoney(ultima.total ?? 0)}</span>
                  </div>
                  <div className="pt-2 border-t border-primary/20 space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase">Produtos</p>
                    {(ultima.itens_venda ?? []).map((it: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{it.quantidade}× {(it.produtos as any)?.nome ?? "—"}</span>
                        <span className="text-muted-foreground">{fmtMoney((it.preco_unitario ?? 0) * (it.quantidade ?? 0) - (it.desconto ?? 0))}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-2">Histórico completo ({vendas.length})</h3>
              <div className="space-y-2">
                {vendas.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{fmtData(v.data)}</span>
                        <span className="text-sm font-bold">{fmtMoney(v.total ?? 0)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {(v.itens_venda ?? []).map((it: any, i: number) => (
                          <div key={i}>• {it.quantidade}× {(it.produtos as any)?.nome ?? "—"}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


type ClienteRadar = {
  id: string;
  nome: string;
  telefone: string | null;
  nicho: string | null;
  ultima_compra: Date | null;
  ultimo_pedido_id: string | null;
  dias: number | null;
  ativo: boolean;
};

function classify(dias: number | null) {
  if (dias === null) return { color: "muted", label: "Sem compras", bar: "bg-muted" };
  if (dias < 15) return { color: "default", label: "Recente", bar: "bg-muted" };
  if (dias < 25) return { color: "green", label: "15+ dias", bar: "bg-emerald-500" };
  if (dias < 35) return { color: "yellow", label: "25+ dias", bar: "bg-amber-500" };
  return { color: "red", label: "35+ dias", bar: "bg-red-500" };
}

const FILTROS = [
  { value: "", label: "Selecione um tipo…" },
  { value: "15-24", label: "🟢 Verde (15-24 dias)" },
  { value: "25-34", label: "🟡 Amarelo (25-34 dias)" },
  { value: "35+", label: "🔴 Vermelho (35+ dias)" },
  { value: "todos", label: "Todos" },
  { value: "ativos", label: "Ativos" },
  { value: "inativos", label: "Inativos" },
  { value: "0-14", label: "0-14 dias" },
];

export default function RadarRecompra() {
  const [aba, setAba] = useState<"radar" | "cobrancas">("radar");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("");
  const [selecionado, setSelecionado] = useState<{ id: string; nome: string } | null>(null);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-radar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone, nicho, ultima_compra, ultimo_pedido_id" as any);
      if (error) throw error;
      return data as any[];
    },
  });

  const radar: ClienteRadar[] = useMemo(() => {
    const hoje = new Date();
    return clientes
      .filter((c: any) => !!c.ultima_compra) // apenas clientes que já compraram
      .map((c: any) => {
        const ult = new Date(c.ultima_compra);
        const dias = Math.floor((hoje.getTime() - ult.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          nicho: c.nicho,
          ultima_compra: ult,
          ultimo_pedido_id: c.ultimo_pedido_id ?? null,
          dias,
          ativo: true,
        };
      });
  }, [clientes]);

  const filtrados = useMemo(() => {
    if (!filtro) return [];
    const q = busca.trim().toLowerCase();
    return radar
      .filter((r) => (q ? r.nome.toLowerCase().includes(q) : true))
      .filter((r) => {
        if (filtro === "todos") return true;
        if (filtro === "ativos") return r.ativo;
        if (filtro === "inativos") return !r.ativo;
        if (r.dias === null) return false;
        if (filtro === "0-14") return r.dias < 15;
        if (filtro === "15-24") return r.dias >= 15 && r.dias < 25;
        if (filtro === "25-34") return r.dias >= 25 && r.dias < 35;
        if (filtro === "35+") return r.dias >= 35;
        return true;
      })
      .sort((a, b) => {
        if (a.dias === null && b.dias === null) return a.nome.localeCompare(b.nome);
        if (a.dias === null) return 1;
        if (b.dias === null) return -1;
        return b.dias - a.dias;
      });
  }, [radar, busca, filtro]);

  const counts = useMemo(() => {
    const c = { ativos: 0, inativos: 0, verde: 0, amarelo: 0, vermelho: 0 };
    for (const r of radar) {
      if (r.ativo) c.ativos++; else c.inativos++;
      if (r.dias === null) continue;
      if (r.dias >= 35) c.vermelho++;
      else if (r.dias >= 25) c.amarelo++;
      else if (r.dias >= 15) c.verde++;
    }
    return c;
  }, [radar]);

  const fmtData = (d: Date | null) =>
    d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-primary" />
          <h1 className="heading-gradient text-2xl md:text-3xl">Radar de Recompra</h1>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <Button
            variant={aba === "radar" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setAba("radar")}
          >
            <Radar className="h-4 w-4 mr-1.5" />Radar
          </Button>
          <Button
            variant={aba === "cobrancas" ? "default" : "ghost"}
            size="sm"
            className="h-8"
            onClick={() => setAba("cobrancas")}
          >
            <Receipt className="h-4 w-4 mr-1.5" />Cobranças
          </Button>
        </div>
      </div>

      {aba === "cobrancas" ? <Cobrancas /> : (
      <>


      {/* Resumo — clique para filtrar */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          onClick={() => setFiltro("15-24")}
          className={cn("cursor-pointer transition-all hover:shadow-md", filtro === "15-24" && "ring-2 ring-emerald-500")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Verde (15-24 dias)</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{counts.verde}</div>
          </CardContent>
        </Card>
        <Card
          onClick={() => setFiltro("25-34")}
          className={cn("cursor-pointer transition-all hover:shadow-md", filtro === "25-34" && "ring-2 ring-amber-500")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />Amarelo (25-34 dias)</div>
            <div className="text-2xl font-bold mt-1 text-amber-600">{counts.amarelo}</div>
          </CardContent>
        </Card>
        <Card
          onClick={() => setFiltro("35+")}
          className={cn("cursor-pointer transition-all hover:shadow-md", filtro === "35+" && "ring-2 ring-red-500")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-500" />Vermelho (35+ dias)</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{counts.vermelho}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {filtro && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente pelo nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTROS.filter((f) => f.value).map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setFiltro("")}>Limpar</Button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {!filtro ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione uma categoria acima (🟢 Verde, 🟡 Amarelo ou 🔴 Vermelho) para visualizar os clientes.
          </CardContent></Card>
        ) : filtrados.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado para o filtro selecionado.
          </CardContent></Card>
        ) : (
          filtrados.map((c) => {
            const cls = classify(c.dias);
            const isUrgente = c.dias !== null && c.dias >= 35;
            return (
              <Card
                key={c.id}
                onClick={() => setSelecionado({ id: c.id, nome: c.nome })}
                className={cn(
                  "overflow-hidden transition-all cursor-pointer hover:shadow-md",
                  isUrgente && "ring-1 ring-red-200 dark:ring-red-900",
                )}

              >
                <div className={cn("h-1 w-full", cls.bar)} />
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{c.nome}</h3>
                        {c.ativo ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px]">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                        )}
                        {c.nicho && <Badge variant="outline" className="text-[10px]">{c.nicho}</Badge>}
                        {isUrgente && (
                          <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" />Prioridade
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        Última compra: {fmtData(c.ultima_compra)}
                        {c.telefone && <span className="ml-2">• {c.telefone}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-2xl font-bold leading-none",
                          c.dias === null && "text-muted-foreground",
                          c.dias !== null && c.dias < 15 && "text-foreground",
                          c.dias !== null && c.dias >= 15 && c.dias < 25 && "text-emerald-600",
                          c.dias !== null && c.dias >= 25 && c.dias < 35 && "text-amber-600",
                          c.dias !== null && c.dias >= 35 && "text-red-600",
                        )}
                      >
                        {c.dias ?? "—"}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {c.dias === null ? "inativo" : "dias"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {selecionado && (
        <HistoricoCliente
          clienteId={selecionado.id}
          clienteNome={selecionado.nome}
          onClose={() => setSelecionado(null)}
        />
      )}
      </>
      )}
    </div>
  );
}

