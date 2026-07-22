import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function BackupButton() {
  const [loading, setLoading] = useState(false);

  async function handleBackup() {
    setLoading(true);
    try {
      const [clientesRes, vendasRes, itensRes, produtosRes] = await Promise.all([
        supabase.from("clientes").select("*").order("nome"),
        supabase.from("vendas").select("*").order("data", { ascending: false }),
        supabase.from("itens_venda").select("*"),
        supabase.from("produtos").select("*"),
      ]);
      if (clientesRes.error) throw clientesRes.error;
      if (vendasRes.error) throw vendasRes.error;
      if (itensRes.error) throw itensRes.error;
      if (produtosRes.error) throw produtosRes.error;

      const clientes = clientesRes.data ?? [];
      const vendas = vendasRes.data ?? [];
      const itens = itensRes.data ?? [];
      const produtos = produtosRes.data ?? [];

      const clienteMap = new Map(clientes.map((c) => [c.id, c]));
      const produtoMap = new Map(produtos.map((p) => [p.id, p]));
      const itensPorVenda = new Map<string, typeof itens>();
      for (const it of itens) {
        const arr = itensPorVenda.get(it.venda_id) ?? [];
        arr.push(it);
        itensPorVenda.set(it.venda_id, arr);
      }

      // Planilha 1: Clientes cadastrados
      const clientesRows = clientes.map((c) => ({
        Nome: c.nome,
        Responsável: c.responsavel ?? "",
        Telefone: c.telefone ?? "",
        "CPF/CNPJ": c.cpf_cnpj ?? "",
        "Inscrição Estadual": c.inscricao_estadual ?? "",
        Email: c.email ?? "",
        Nicho: c.nicho ?? "",
        Endereço: c.endereco ?? "",
        Bairro: c.bairro ?? "",
        Cidade: c.cidade ?? "",
        Complemento: c.complemento ?? "",
        Ativo: c.ativo ? "Sim" : "Não",
        "Última Compra": c.ultima_compra ?? "",
        "Cadastrado em": c.created_at ?? "",
      }));
      const wb1 = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(clientesRows);
      XLSX.utils.book_append_sheet(wb1, ws1, "Clientes");

      // Planilha 2: Vendas por cliente (uma linha por item)
      const vendasRows: Record<string, any>[] = [];
      for (const v of vendas) {
        const cli = clienteMap.get(v.cliente_id);
        const its = itensPorVenda.get(v.id) ?? [];
        if (its.length === 0) {
          vendasRows.push({
            Cliente: cli?.nome ?? "",
            Cidade: cli?.cidade ?? "",
            "Data da Venda": v.data,
            "Pedido ID": v.id,
            Produto: "",
            Quantidade: "",
            "Preço Unitário": "",
            Desconto: "",
            "Subtotal Item": "",
            "Desconto Geral": Number(v.desconto_geral ?? 0),
            "Total da Venda": Number(v.total ?? 0),
            "Forma Pagamento": v.forma_pagamento,
            "Prazo (dias)": v.prazo_dias ?? "",
            Paga: v.paga ? "Sim" : "Não",
            "Paga em": v.paga_em ?? "",
          });
          continue;
        }
        for (const it of its) {
          const p = produtoMap.get(it.produto_id);
          const sub = Number(it.preco_unitario) * Number(it.quantidade) - Number(it.desconto ?? 0);
          vendasRows.push({
            Cliente: cli?.nome ?? "",
            Cidade: cli?.cidade ?? "",
            "Data da Venda": v.data,
            "Pedido ID": v.id,
            Produto: p?.nome ?? "",
            Quantidade: Number(it.quantidade),
            "Preço Unitário": Number(it.preco_unitario),
            Desconto: Number(it.desconto ?? 0),
            "Subtotal Item": sub,
            "Desconto Geral": Number(v.desconto_geral ?? 0),
            "Total da Venda": Number(v.total ?? 0),
            "Forma Pagamento": v.forma_pagamento,
            "Prazo (dias)": v.prazo_dias ?? "",
            Paga: v.paga ? "Sim" : "Não",
            "Paga em": v.paga_em ?? "",
          });
        }
      }
      const wb2 = XLSX.utils.book_new();
      const ws2 = XLSX.utils.json_to_sheet(vendasRows);
      XLSX.utils.book_append_sheet(wb2, ws2, "Vendas por Cliente");

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb1, `backup-clientes-${stamp}.xlsx`);
      XLSX.writeFile(wb2, `backup-vendas-por-cliente-${stamp}.xlsx`);

      toast.success("Backup gerado! Duas planilhas foram baixadas.");
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar backup: " + (e?.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleBackup} disabled={loading}>
      <Download className="mr-1.5 h-4 w-4" />
      {loading ? "Gerando..." : "Backup"}
    </Button>
  );
}
