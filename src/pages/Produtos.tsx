import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Trash2, TrendingUp, Package, Boxes, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Produto = Tables<"produtos"> & { estoque?: number };

const produtoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  categoria: z.string().max(100, "Categoria muito longa").optional().or(z.literal("")),
  preco_custo: z.number().min(0).max(999999.99),
  preco: z.number().min(0).max(999999.99),
  estoque: z.number().int().min(0).max(9999999),
});

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ============ ESTOQUE DIALOG ============
function EstoqueDialog({ produtos }: { produtos: Produto[] }) {
  const [tab, setTab] = useState<"estoque" | "ranking" | "nichos">("estoque");
  const [cell, setCell] = useState<{ produtoId: string; produtoNome: string; nicho: string } | null>(null);

  const { data: itens = [] } = useQuery({
    queryKey: ["itens-venda-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_venda")
        .select("produto_id, quantidade, vendas(cliente_id, clientes(id, nome, nicho))");
      if (error) throw error;
      return data as any[];
    },
  });

  const vendidos = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of itens) {
      map.set(it.produto_id, (map.get(it.produto_id) ?? 0) + (it.quantidade ?? 0));
    }
    return map;
  }, [itens]);

  const ranking = useMemo(() => {
    return produtos
      .map((p) => ({ ...p, vendidos: vendidos.get(p.id) ?? 0 }))
      .sort((a, b) => b.vendidos - a.vendidos);
  }, [produtos, vendidos]);

  // matriz nicho x produto: nº de clientes distintos daquele nicho que compraram o produto
  const matriz = useMemo(() => {
    const map = new Map<string, Map<string, Set<string>>>(); // nicho -> produto_id -> Set(clienteId)
    for (const it of itens) {
      const cliente = it.vendas?.clientes;
      if (!cliente) continue;
      const nicho = (cliente.nicho ?? "Sem nicho").trim() || "Sem nicho";
      if (!map.has(nicho)) map.set(nicho, new Map());
      const perProd = map.get(nicho)!;
      if (!perProd.has(it.produto_id)) perProd.set(it.produto_id, new Set());
      perProd.get(it.produto_id)!.add(cliente.id);
    }
    return map;
  }, [itens]);

  const nichosOrdenados = useMemo(() => Array.from(matriz.keys()).sort(), [matriz]);
  const produtosComVenda = useMemo(() => ranking.filter((p) => p.vendidos > 0), [ranking]);

  // detalhamento de célula
  const detalheCelula = useMemo(() => {
    if (!cell) return [];
    const clientes = new Map<string, { nome: string; qtd: number }>();
    for (const it of itens) {
      const c = it.vendas?.clientes;
      if (!c) continue;
      const nicho = (c.nicho ?? "Sem nicho").trim() || "Sem nicho";
      if (nicho !== cell.nicho || it.produto_id !== cell.produtoId) continue;
      const cur = clientes.get(c.id) ?? { nome: c.nome, qtd: 0 };
      cur.qtd += it.quantidade ?? 0;
      clientes.set(c.id, cur);
    }
    return Array.from(clientes.values()).sort((a, b) => b.qtd - a.qtd);
  }, [cell, itens]);

  return (
    <>
      <div className="flex gap-1 rounded-lg border border-border p-1 bg-muted/30 w-fit">
        <Button size="sm" variant={tab === "estoque" ? "default" : "ghost"} onClick={() => setTab("estoque")} className="h-8">
          <Boxes className="h-4 w-4 mr-1.5" />Estoque
        </Button>
        <Button size="sm" variant={tab === "ranking" ? "default" : "ghost"} onClick={() => setTab("ranking")} className="h-8">
          <TrendingUp className="h-4 w-4 mr-1.5" />Ranking
        </Button>
        <Button size="sm" variant={tab === "nichos" ? "default" : "ghost"} onClick={() => setTab("nichos")} className="h-8">
          <Package className="h-4 w-4 mr-1.5" />Nichos × Produtos
        </Button>
      </div>

      {tab === "estoque" && (
        <div className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Produto</th>
                <th className="text-right px-3 py-2 font-semibold w-28">Estoque</th>
                <th className="text-right px-3 py-2 font-semibold w-28">Vendidos</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const est = p.estoque ?? 0;
                const vendido = vendidos.get(p.id) ?? 0;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.nome}</td>
                    <td className={cn(
                      "px-3 py-2 text-right font-semibold",
                      est <= 0 && "text-destructive",
                      est > 0 && est < 10 && "text-amber-600",
                    )}>
                      {est}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{vendido}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ranking" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-emerald-600">
              <TrendingUp className="h-4 w-4" />Mais vendidos
            </h3>
            <div className="space-y-1.5">
              {ranking.filter((p) => p.vendidos > 0).slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="truncate">{p.nome}</span>
                  </div>
                  <span className="font-semibold text-emerald-600 whitespace-nowrap ml-2">{p.vendidos} un</span>
                </div>
              ))}
              {ranking.filter((p) => p.vendidos > 0).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma venda registrada.</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-red-600">
              <TrendingDown className="h-4 w-4" />Menos vendidos / parados
            </h3>
            <div className="space-y-1.5">
              {[...ranking].sort((a, b) => a.vendidos - b.vendidos).slice(0, 10).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="truncate">{p.nome}</span>
                  </div>
                  <span className={cn("font-semibold whitespace-nowrap ml-2", p.vendidos === 0 ? "text-red-600" : "text-amber-600")}>
                    {p.vendidos} un
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "nichos" && (
        <div className="border rounded-lg overflow-auto max-h-[60vh]">
          {nichosOrdenados.length === 0 || produtosComVenda.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-6">Ainda não há vendas suficientes para gerar a tabela.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="text-left px-2 py-2 font-semibold border-b sticky left-0 bg-muted">Nicho \ Produto</th>
                  {produtosComVenda.map((p) => (
                    <th key={p.id} className="px-2 py-2 font-semibold border-b border-l text-center whitespace-nowrap min-w-[80px]">
                      {p.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nichosOrdenados.map((nicho) => (
                  <tr key={nicho}>
                    <td className="px-2 py-2 font-medium border-b sticky left-0 bg-background whitespace-nowrap">{nicho}</td>
                    {produtosComVenda.map((p) => {
                      const set = matriz.get(nicho)?.get(p.id);
                      const count = set?.size ?? 0;
                      return (
                        <td
                          key={p.id}
                          onClick={() => count > 0 && setCell({ produtoId: p.id, produtoNome: p.nome, nicho })}
                          className={cn(
                            "px-2 py-2 border-l border-b text-center",
                            count > 0 && "cursor-pointer hover:bg-primary/10 font-semibold",
                            count === 0 && "text-muted-foreground/40",
                          )}
                        >
                          {count > 0 ? count : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {cell?.nicho} × {cell?.produtoNome}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1.5">
            {detalheCelula.map((c, i) => (
              <div key={i} className="flex justify-between border rounded-md px-3 py-2 text-sm">
                <span className="truncate">{c.nome}</span>
                <span className="font-semibold text-primary">{c.qtd} un</span>
              </div>
            ))}
            {detalheCelula.length === 0 && <p className="text-xs text-muted-foreground">Sem detalhes.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ MAIN PAGE ============
export default function Produtos() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [estoqueOpen, setEstoqueOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data as Produto[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: z.infer<typeof produtoSchema>) => {
      const payload = {
        nome: p.nome,
        categoria: p.categoria || null,
        preco_custo: p.preco_custo,
        preco: p.preco,
        estoque: p.estoque,
      };
      if (editing) {
        const { error } = await supabase.from("produtos").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Produto atualizado!" : "Produto cadastrado!");
    },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const filtered = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      nome: (fd.get("nome") as string).trim(),
      categoria: (fd.get("categoria") as string).trim(),
      preco_custo: parseFloat(fd.get("preco_custo") as string) || 0,
      preco: parseFloat(fd.get("preco") as string) || 0,
      estoque: parseInt(fd.get("estoque") as string) || 0,
    };
    const result = produtoSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    upsert.mutate(result.data);
  }

  const calcMargem = (custo: number, venda: number) => (venda <= 0 ? 0 : ((venda - custo) / venda) * 100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="heading-gradient text-2xl md:text-3xl">Produtos</h1>
        <div className="flex gap-2">
          <Dialog open={estoqueOpen} onOpenChange={setEstoqueOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Boxes className="mr-1.5 h-4 w-4" />Estoque</Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Estoque e Inteligência de Produtos</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <EstoqueDialog produtos={produtos} />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="nome">Nome *</Label><Input id="nome" name="nome" required maxLength={255} defaultValue={editing?.nome ?? ""} /></div>
                <div className="space-y-1.5"><Label htmlFor="categoria">Categoria</Label><Input id="categoria" name="categoria" maxLength={100} placeholder="Ex: bebidas, laticínios" defaultValue={editing?.categoria ?? ""} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
                    <Input id="preco_custo" name="preco_custo" type="number" step="0.01" min="0" max="999999.99" placeholder="0,00" defaultValue={editing?.preco_custo ?? ""} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="preco">Preço de Revenda (R$)</Label>
                    <Input id="preco" name="preco" type="number" step="0.01" min="0" max="999999.99" placeholder="0,00" defaultValue={editing?.preco ?? ""} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estoque">Estoque (unidades)</Label>
                  <Input id="estoque" name="estoque" type="number" step="1" min="0" placeholder="0" defaultValue={editing?.estoque ?? 0} />
                  <p className="text-xs text-muted-foreground">Diminui automaticamente a cada venda.</p>
                </div>
                <Button type="submit" className="w-full" disabled={upsert.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((p, index) => {
            const margem = calcMargem(p.preco_custo, p.preco);
            const lucroUnit = p.preco - p.preco_custo;
            const est = p.estoque ?? 0;
            return (
              <Card key={p.id} className="card-interactive animate-fade-in" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
                <CardContent className="flex items-center justify-between p-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                      {p.categoria && <span className="rounded-md bg-accent px-2 py-0.5 text-accent-foreground font-medium">{p.categoria}</span>}
                      <span>Custo: <span className="font-medium">{fmtBRL(p.preco_custo)}</span></span>
                      <span className="text-foreground font-semibold">Revenda: {fmtBRL(p.preco)}</span>
                      <span className={cn(
                        "rounded-md px-2 py-0.5 font-medium flex items-center gap-1",
                        est <= 0 && "bg-destructive/10 text-destructive",
                        est > 0 && est < 10 && "bg-amber-500/10 text-amber-600",
                        est >= 10 && "bg-emerald-500/10 text-emerald-600",
                      )}>
                        <Boxes className="h-3 w-3" />Estoque: {est} un
                      </span>
                    </div>
                    {p.preco > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-semibold">
                          Margem {margem.toFixed(1)}% · Lucro unit. {fmtBRL(lucroUnit)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
