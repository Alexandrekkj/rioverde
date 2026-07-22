import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchableFilter } from "@/components/SearchableFilter";
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
      let q = supabase.from("vendas").select("*, clientes(nome)").order("data", { ascending: false });
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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="heading-gradient text-2xl md:text-3xl">Vendas</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Search className="mr-1.5 h-4 w-4" />{showFilters ? "Ocultar" : "Buscar"}
          </Button>
          <Button size="sm" asChild>
            <Link to="/vendas/nova"><Plus className="mr-1.5 h-4 w-4" />Nova Venda</Link>
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="card-interactive animate-slide-up">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</Label>
                <SearchableFilter
                  value={filtroCliente}
                  onChange={setFiltroCliente}
                  options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                  allLabel="Todos"
                  allValue=""
                  placeholder="Todos"
                  searchPlaceholder="Buscar cliente..."
                  className="w-full h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5 min-w-[120px]">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</Label>
                <Select value={filtroForma} onValueChange={setFiltroForma}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="a_vista">À vista</SelectItem>
                    <SelectItem value="a_prazo">A prazo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">De</Label>
                <Input type="date" className="h-9 w-40" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Até</Label>
                <Input type="date" className="h-9 w-40" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
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
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : vendas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma venda encontrada.</p>
      ) : (
        <div className="grid gap-2">
          {vendas.map((v: any, index: number) => (
            <Card key={v.id} className="card-interactive animate-fade-in" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
              <CardContent className="flex items-center justify-between p-3 sm:p-4">
                <Link to={`/vendas/${v.id}`} className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{v.clientes?.nome ?? "Cliente removido"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(v.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
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
