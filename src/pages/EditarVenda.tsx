import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

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

export default function EditarVenda() {
  const { id } = useParams<{ id: string }>();
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [prazoDias, setPrazoDias] = useState<number | null>(null);
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

  const { data: venda, isLoading } = useQuery({
    queryKey: ["venda", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: itensExistentes = [] } = useQuery({
    queryKey: ["itens-venda", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_venda")
        .select("*, produtos(nome)")
        .eq("venda_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (venda) {
      setClienteId(venda.cliente_id);
      setDescontoGeral(venda.desconto_geral);
      setFormaPagamento(venda.forma_pagamento ?? "dinheiro");
      setPrazoDias(venda.prazo_dias ?? null);
    }
  }, [venda]);

  useEffect(() => {
    if (itensExistentes.length > 0) {
      setItens(
        itensExistentes.map((i: any) => ({
          produto_id: i.produto_id,
          nome: i.produtos?.nome ?? "Produto removido",
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto: i.desconto,
        }))
      );
    }
  }, [itensExistentes]);

  const salvarVenda = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error("Selecione um cliente");
      if (itens.length === 0) throw new Error("Adicione ao menos um produto");

      const total = totalFinal;
      const { error } = await supabase
        .from("vendas")
        .update({
          cliente_id: clienteId,
          desconto_geral: descontoGeral,
          total,
          forma_pagamento: formaPagamento,
          prazo_dias: formaPagamento === "a_prazo" ? prazoDias : null,
        })
        .eq("id", id!);
      if (error) throw error;

      // Delete existing items and re-insert
      const { error: delErr } = await supabase.from("itens_venda").delete().eq("venda_id", id!);
      if (delErr) throw delErr;

      const itensInsert = itens.map((i) => ({
        venda_id: id!,
        produto_id: i.produto_id,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        desconto: i.desconto,
      }));
      const { error: err2 } = await supabase.from("itens_venda").insert(itensInsert);
      if (err2) throw err2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["venda", id] });
      toast.success("Venda atualizada com sucesso!");
      navigate("/vendas");
    },
    onError: (e) => toast.error(e.message || "Erro ao salvar venda"),
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

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Carregando...</p>;
  if (!venda) return <p className="p-4 text-sm text-muted-foreground">Venda não encontrada.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-xl font-bold">Editar Venda</h1>
      </div>

      {/* Cliente */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
        <CardContent>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Forma de Pagamento */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Forma de Pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FORMAS_PAGAMENTO.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formaPagamento === "a_prazo" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Prazo (dias)</Label>
              <Input
                type="number" min={1} className="w-24 h-8 text-xs"
                value={prazoDias ?? ""}
                onChange={(e) => setPrazoDias(parseInt(e.target.value) || null)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Produtos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={addProduto}>
            <SelectTrigger><SelectValue placeholder="Adicionar produto" /></SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome} — {fmt(p.preco)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {itens.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum produto adicionado.</p>
          ) : (
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <span className="flex-1 min-w-0 truncate font-medium">{item.nome}</span>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Qtd</Label>
                    <Input type="number" min={1} className="w-16 h-8 text-xs" value={item.quantidade} onChange={(e) => updateItem(idx, "quantidade", parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Preço</Label>
                    <Input type="number" step="0.01" min={0} className="w-20 h-8 text-xs" value={item.preco_unitario} onChange={(e) => updateItem(idx, "preco_unitario", parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs">Desc</Label>
                    <Input type="number" step="0.01" min={0} className="w-20 h-8 text-xs" value={item.desconto} onChange={(e) => updateItem(idx, "desconto", parseFloat(e.target.value) || 0)} />
                  </div>
                  <span className="text-xs font-semibold">{fmt(item.quantidade * item.preco_unitario - item.desconto)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totais */}
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>Desconto geral (R$)</span>
            <Input type="number" step="0.01" min={0} className="w-28 h-8 text-xs text-right" value={descontoGeral} onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex justify-between text-base font-bold border-t border-border pt-2">
            <span>Total</span><span className="text-primary">{fmt(totalFinal)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => salvarVenda.mutate()} disabled={salvarVenda.isPending}>
        <Save className="mr-2 h-4 w-4" />Salvar Alterações
      </Button>
    </div>
  );
}
