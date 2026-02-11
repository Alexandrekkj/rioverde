import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TIPOS_DESPESA = ["Gasolina", "Alimentação", "Manutenção", "Material", "Transporte", "Outros"];

type Despesa = {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  observacoes: string | null;
};

export default function Despesas() {
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Despesa | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState("");
  const queryClient = useQueryClient();

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["despesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const salvar = useMutation({
    mutationFn: async (form: FormData) => {
      const payload = {
        tipo: tipoSelecionado || (form.get("tipo") as string),
        valor: parseFloat(form.get("valor") as string) || 0,
        data: new Date(form.get("data") as string).toISOString(),
        observacoes: (form.get("observacoes") as string) || null,
      };
      if (editando) {
        const { error } = await supabase.from("despesas").update(payload).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("despesas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast.success(editando ? "Despesa atualizada!" : "Despesa registrada!");
      setOpen(false);
      setEditando(null);
    },
    onError: () => toast.error("Erro ao salvar despesa"),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast.success("Despesa excluída!");
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function openEditar(d: Despesa) {
    setEditando(d);
    setTipoSelecionado(d.tipo);
    setOpen(true);
  }

  function openNova() {
    setEditando(null);
    setTipoSelecionado("");
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Despesas</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditando(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNova}><Plus className="mr-1 h-4 w-4" />Nova Despesa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editando ? "Editar Despesa" : "Nova Despesa"}</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); salvar.mutate(new FormData(e.currentTarget)); }}
              className="space-y-3"
            >
              <div>
                <Label>Tipo *</Label>
                <Select value={tipoSelecionado} onValueChange={setTipoSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DESPESA.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input name="valor" type="number" step="0.01" min={0} required defaultValue={editando?.valor ?? ""} />
              </div>
              <div>
                <Label>Data *</Label>
                <Input name="data" type="datetime-local" required defaultValue={editando ? format(new Date(editando.data), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea name="observacoes" defaultValue={editando?.observacoes ?? ""} />
              </div>
              <Button type="submit" className="w-full" disabled={salvar.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : despesas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
      ) : (
        <div className="grid gap-2">
          {despesas.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium truncate">{d.tipo}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {d.observacoes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.observacoes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-destructive">{fmt(d.valor)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditar(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir.mutate(d.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
