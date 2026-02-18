import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Produto = Tables<"produtos">;

export default function Produtos() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: TablesInsert<"produtos">) => {
      if (editing) {
        const { error } = await supabase.from("produtos").update(p).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(p);
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
  });

  const filtered = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const precoCusto = parseFloat(fd.get("preco_custo") as string) || 0;
    const precoRevenda = parseFloat(fd.get("preco") as string) || 0;
    upsert.mutate({
      nome: fd.get("nome") as string,
      categoria: (fd.get("categoria") as string) || null,
      preco_custo: precoCusto,
      preco: precoRevenda,
    });
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const calcMargem = (custo: number, venda: number) => {
    if (venda <= 0) return 0;
    return ((venda - custo) / venda) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Produtos</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" name="nome" required defaultValue={editing?.nome ?? ""} />
              </div>
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input id="categoria" name="categoria" placeholder="Ex: bebidas, laticínios" defaultValue={editing?.categoria ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
                  <Input
                    id="preco_custo"
                    name="preco_custo"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    defaultValue={editing?.preco_custo ?? ""}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Quanto você paga</p>
                </div>
                <div>
                  <Label htmlFor="preco">Preço de Revenda (R$)</Label>
                  <Input
                    id="preco"
                    name="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    defaultValue={editing?.preco ?? ""}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Quanto você vende</p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((p) => {
            const margem = calcMargem(p.preco_custo, p.preco);
            const lucroUnit = p.preco - p.preco_custo;
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.nome}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                      {p.categoria && (
                        <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">{p.categoria}</span>
                      )}
                      <span className="text-muted-foreground">Custo: <span className="font-medium">{fmt(p.preco_custo)}</span></span>
                      <span className="text-foreground font-semibold">Revenda: {fmt(p.preco)}</span>
                    </div>
                    {p.preco > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary font-medium">
                          Margem {margem.toFixed(1)}% · Lucro unit. {fmt(lucroUnit)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
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
