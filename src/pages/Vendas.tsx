import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, X, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const FORMAS_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  a_vista: "À vista",
  a_prazo: "A prazo",
};

export default function Vendas() {
  const [showFilters, setShowFilters] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroForma, setFiltroForma] = useState("todas");
  const [filtroInicio, setFiltroInicio] = useState("");
  const [filtroFim, setFiltroFim] = useState("");
  const [vendaParaDeletar, setVendaParaDeletar] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deletarVenda = useMutation({
    mutationFn: async (vendaId: string) => {
      const { error: itensError } = await supabase.from("itens_venda").delete().eq("venda_id", vendaId);
      if (itensError) throw itensError;
      const { error } = await supabase.from("vendas").delete().eq("id", vendaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Venda excluída com sucesso");
    },
    onError: () => toast.error("Erro ao excluir venda"),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: vendas = [], isLoading } = useQuery({
    queryKey: ["vendas", filtroCliente, filtroForma, filtroInicio, filtroFim],
    queryFn: async () => {
      let q = supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .order("data", { ascending: false });

      if (filtroCliente) q = q.eq("cliente_id", filtroCliente);
      if (filtroForma && filtroForma !== "todas") q = q.eq("forma_pagamento", filtroForma);
      if (filtroInicio) q = q.gte("data", startOfDay(new Date(filtroInicio)).toISOString());
      if (filtroFim) q = q.lte("data", endOfDay(new Date(filtroFim)).toISOString());

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const hasFilters = filtroCliente || filtroForma !== "todas" || filtroInicio || filtroFim;

  function limparFiltros() {
    setFiltroCliente("");
    setFiltroForma("todas");
    setFiltroInicio("");
    setFiltroFim("");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Vendas</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Search className="mr-1 h-4 w-4" />{showFilters ? "Ocultar" : "Buscar"}
          </Button>
          <Button size="sm" asChild>
            <Link to="/vendas/nova"><Plus className="mr-1 h-4 w-4" />Nova Venda</Link>
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Cliente</Label>
                <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[120px]">
                <Label className="text-xs">Pagamento</Label>
                <Select value={filtroForma} onValueChange={setFiltroForma}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="a_vista">À vista</SelectItem>
                    <SelectItem value="a_prazo">A prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" className="h-8 w-36 text-xs" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" className="h-8 w-36 text-xs" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
              </div>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={limparFiltros}>
                <X className="mr-1 h-3 w-3" />Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma venda encontrada.</p>
      ) : (
        <div className="grid gap-2">
          {vendas.map((v: any) => (
            <Card key={v.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-3">
                <Link to={`/vendas/${v.id}`} className="min-w-0 flex-1">
                  <p className="font-medium truncate">{v.clientes?.nome ?? "Cliente removido"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {FORMAS_LABELS[v.forma_pagamento] ?? v.forma_pagamento}
                      {v.forma_pagamento === "a_prazo" && v.prazo_dias ? ` ${v.prazo_dias}d` : ""}
                    </Badge>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-primary">{fmt(v.total)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); setVendaParaDeletar(v.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!vendaParaDeletar} onOpenChange={(open) => !open && setVendaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A venda e todos os seus itens serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (vendaParaDeletar) { deletarVenda.mutate(vendaParaDeletar); setVendaParaDeletar(null); } }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
