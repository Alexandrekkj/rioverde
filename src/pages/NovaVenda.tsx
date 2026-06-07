import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, ShoppingCart, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";


type ItemVenda = {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
};

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "a_vista", label: "À vista" },
  { value: "a_prazo", label: "A prazo" },
];

function hojeISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function NovaVenda() {
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [prazoDias, setPrazoDias] = useState<number | null>(null);
  const [dataVenda, setDataVenda] = useState<string>(hojeISO());
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();


  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const novoCliente = useMutation({
    mutationFn: async (c: TablesInsert<"clientes">) => {
      const { data, error } = await supabase.from("clientes").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setClienteId(data.id);
      setNovoClienteOpen(false);
      toast.success("Cliente cadastrado!");
    },
  });

  const salvarVenda = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente");
      if (itens.length === 0) throw new Error("Adicione ao menos um produto");
      const total = totalFinal;
      const { data: venda, error } = await supabase
        .from("vendas")
        .insert({ cliente_id: clienteId, desconto_geral: descontoGeral, total, forma_pagamento: formaPagamento, prazo_dias: formaPagamento === "a_prazo" ? prazoDias : null, data: new Date(dataVenda + "T12:00:00").toISOString() })
        .select().single();
      if (error) throw error;
      const itensInsert = itens.map((i) => ({ venda_id: venda.id, produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto: i.desconto }));
      const { error: err2 } = await supabase.from("itens_venda").insert(itensInsert);
      if (err2) throw err2;
    },
    onSuccess: () => { toast.success("Venda salva com sucesso!"); navigate("/vendas"); },
    onError: () => toast.error("Erro ao salvar venda. Verifique os dados e tente novamente."),
  });

  function addProduto(produtoId: string) {
    const p = produtos.find((x) => x.id === produtoId);
    if (!p) return;
    if (itens.find((i) => i.produto_id === produtoId)) {
      setItens(itens.map((i) => i.produto_id === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens([...itens, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unitario: p.preco, desconto: 0 }]);
    }
  }

  function updateItem(idx: number, field: keyof ItemVenda, value: number) {
    setItens(itens.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeItem(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }

  const subtotal = useMemo(() => itens.reduce((sum, i) => sum + i.quantidade * i.preco_unitario - i.desconto, 0), [itens]);
  const totalFinal = useMemo(() => Math.max(0, subtotal - descontoGeral), [subtotal, descontoGeral]);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-5">
      <h1 className="heading-gradient text-2xl md:text-3xl">Nova Venda</h1>

      {/* Cliente */}
      <Card className="card-interactive">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                <span className="truncate">{clienteId ? clientes.find((c) => c.id === clienteId)?.nome : "Selecionar cliente"}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)]"
              align="start"
              sideOffset={4}
            >
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList className="max-h-[min(60vh,300px)]">
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {clientes.map((c) => (
                      <CommandItem key={c.id} value={c.nome} onSelect={() => { setClienteId(c.id === clienteId ? "" : c.id); setClienteOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4 shrink-0", clienteId === c.id ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{c.nome}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Dialog open={novoClienteOpen} onOpenChange={setNovoClienteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full"><Plus className="mr-1.5 h-4 w-4" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); novoCliente.mutate({ nome: fd.get("nome") as string, nicho: (fd.get("nicho") as string) || null, telefone: (fd.get("telefone") as string) || null }); }} className="space-y-4">
                <div className="space-y-1.5"><Label>Nome *</Label><Input name="nome" required /></div>
                <div className="space-y-1.5"><Label>Nicho</Label><Input name="nicho" /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input name="telefone" /></div>
                <Button type="submit" className="w-full" disabled={novoCliente.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">Data da venda</Label>
            <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} max={hojeISO()} />
          </div>
        </CardContent>
      </Card>

      {/* Forma de Pagamento */}
      <Card className="card-interactive">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Forma de Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FORMAS_PAGAMENTO.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
          </Select>
          {formaPagamento === "a_prazo" && (
            <div className="flex items-center gap-3">
              <Label className="text-xs whitespace-nowrap font-medium">Prazo (dias)</Label>
              <Input type="number" min={1} className="w-24 h-9" value={prazoDias ?? ""} onChange={(e) => setPrazoDias(parseInt(e.target.value) || null)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card className="card-interactive">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Produtos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={addProduto}>
            <SelectTrigger><SelectValue placeholder="Adicionar produto" /></SelectTrigger>
            <SelectContent>{produtos.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome} — {fmt(p.preco)}</SelectItem>))}</SelectContent>
          </Select>
          {itens.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum produto adicionado.</p>
          ) : (
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/20">
                  <span className="flex-1 min-w-0 truncate font-medium">{item.nome}</span>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input type="number" min={1} className="w-16 h-8 text-xs" value={item.quantidade} onChange={(e) => updateItem(idx, "quantidade", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Preço</Label>
                    <Input type="number" step="0.01" min={0} className="w-20 h-8 text-xs" value={item.preco_unitario} onChange={(e) => updateItem(idx, "preco_unitario", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Desc</Label>
                    <Input type="number" step="0.01" min={0} className="w-20 h-8 text-xs" value={item.desconto} onChange={(e) => updateItem(idx, "desconto", parseFloat(e.target.value) || 0)} />
                  </div>
                  <span className="text-xs font-bold text-primary">{fmt(item.quantidade * item.preco_unitario - item.desconto)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card className="card-interactive">
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Desconto geral (R$)</span>
            <Input type="number" step="0.01" min={0} className="w-28 h-9 text-right" value={descontoGeral} onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-3">
            <span>Total</span><span className="text-primary">{fmt(totalFinal)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => salvarVenda.mutate()} disabled={salvarVenda.isPending}>
        <ShoppingCart className="mr-2 h-5 w-5" />Salvar Venda
      </Button>
    </div>
  );
}
