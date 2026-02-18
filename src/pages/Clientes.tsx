import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Phone, MapPin, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;

const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  nicho: z.string().max(100, "Nicho muito longo").optional().or(z.literal("")),
  responsavel: z.string().max(255, "Nome muito longo").optional().or(z.literal("")),
  telefone: z.string().max(20, "Telefone muito longo").optional().or(z.literal("")),
  bairro: z.string().max(100, "Bairro muito longo").optional().or(z.literal("")),
  cidade: z.string().max(100, "Cidade muito longa").optional().or(z.literal("")),
});

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (c: z.infer<typeof clienteSchema>) => {
      const payload = {
        nome: c.nome,
        nicho: c.nicho || null,
        responsavel: c.responsavel || null,
        telefone: c.telefone || null,
        bairro: c.bairro || null,
        cidade: c.cidade || null,
      };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Cliente atualizado!" : "Cliente cadastrado!");
    },
    onError: () => toast.error("Erro ao salvar cliente"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente removido!");
    },
    onError: () => toast.error("Erro ao remover cliente"),
  });

  const filtered = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.nicho && c.nicho.toLowerCase().includes(search.toLowerCase()))
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      nome: (fd.get("nome") as string).trim(),
      nicho: (fd.get("nicho") as string).trim(),
      responsavel: (fd.get("responsavel") as string).trim(),
      telefone: (fd.get("telefone") as string).trim(),
      bairro: (fd.get("bairro") as string).trim(),
      cidade: (fd.get("cidade") as string).trim(),
    };
    const result = clienteSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    upsert.mutate(result.data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Clientes</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div><Label htmlFor="nome">Nome *</Label><Input id="nome" name="nome" required maxLength={255} defaultValue={editing?.nome ?? ""} /></div>
              <div><Label htmlFor="nicho">Nicho</Label><Input id="nicho" name="nicho" maxLength={100} placeholder="Ex: mercado, padaria" defaultValue={editing?.nicho ?? ""} /></div>
              <div><Label htmlFor="responsavel">Responsável</Label><Input id="responsavel" name="responsavel" maxLength={255} defaultValue={editing?.responsavel ?? ""} /></div>
              <div><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" maxLength={20} defaultValue={editing?.telefone ?? ""} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="bairro">Bairro</Label><Input id="bairro" name="bairro" maxLength={100} defaultValue={editing?.bairro ?? ""} /></div>
                <div><Label htmlFor="cidade">Cidade</Label><Input id="cidade" name="cidade" maxLength={100} defaultValue={editing?.cidade ?? ""} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={upsert.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou nicho..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.nome}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.nicho && <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">{c.nicho}</span>}
                    {c.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                    {(c.bairro || c.cidade) && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[c.bairro, c.cidade].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
