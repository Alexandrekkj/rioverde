import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Phone, MapPin, Edit2, Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

type Cliente = Tables<"clientes">;
type Nicho = { id: string; nome: string };
type Cidade = { id: string; nome: string };

const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  nicho: z.string().max(100, "Nicho muito longo").optional().or(z.literal("")),
  responsavel: z.string().max(255, "Nome muito longo").optional().or(z.literal("")),
  telefone: z.string().max(50, "Telefone muito longo").optional().or(z.literal("")),
  endereco: z.string().max(255, "Endereço muito longo").optional().or(z.literal("")),
  bairro: z.string().max(100, "Bairro muito longo").optional().or(z.literal("")),
  cidade: z.string().max(100, "Cidade muito longa").optional().or(z.literal("")),
  complemento: z.string().max(255, "Complemento muito longo").optional().or(z.literal("")),
  cpf_cnpj: z.string().max(20, "CPF/CNPJ muito longo").optional().or(z.literal("")),
  inscricao_estadual: z.string().max(30, "IE muito longa").optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")),
});

const NONE_VALUE = "__none__";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [nichoFilter, setNichoFilter] = useState<string>("todos");
  const [cidadeFilter, setCidadeFilter] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [selectedNicho, setSelectedNicho] = useState<string>(NONE_VALUE);
  const [selectedCidade, setSelectedCidade] = useState<string>(NONE_VALUE);
  const [nichosOpen, setNichosOpen] = useState(false);
  const [cidadesOpen, setCidadesOpen] = useState(false);
  const [novoNicho, setNovoNicho] = useState("");
  const [novoCidade, setNovoCidade] = useState("");
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: nichos = [] } = useQuery({
    queryKey: ["nichos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nichos" as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Nicho[];
    },
  });

  const { data: cidades = [] } = useQuery({
    queryKey: ["cidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cidades" as any).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as Cidade[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (c: z.infer<typeof clienteSchema>) => {
      const payload: any = {
        nome: c.nome,
        nicho: c.nicho || null,
        responsavel: c.responsavel || null,
        telefone: c.telefone || null,
        endereco: c.endereco || null,
        bairro: c.bairro || null,
        cidade: c.cidade || null,
        complemento: c.complemento || null,
        cpf_cnpj: c.cpf_cnpj || null,
        inscricao_estadual: c.inscricao_estadual || null,
        email: c.email || null,
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

  const addNicho = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("nichos" as any).insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nichos"] });
      setNovoNicho("");
      toast.success("Nicho adicionado!");
    },
    onError: (e: any) => toast.error(e?.message?.includes("duplicate") ? "Nicho já existe" : "Erro ao adicionar nicho"),
  });

  const delNicho = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nichos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nichos"] });
      toast.success("Nicho removido!");
    },
    onError: () => toast.error("Erro ao remover nicho"),
  });

  const addCidade = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("cidades" as any).insert({ nome });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidades"] });
      setNovoCidade("");
      toast.success("Cidade adicionada!");
    },
    onError: (e: any) => toast.error(e?.message?.includes("duplicate") ? "Cidade já existe" : "Erro ao adicionar cidade"),
  });

  const delCidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cidades" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cidades"] });
      toast.success("Cidade removida!");
    },
    onError: () => toast.error("Erro ao remover cidade"),
  });

  const filtered = clientes.filter((c) => {
    const matchSearch =
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.nicho && c.nicho.toLowerCase().includes(search.toLowerCase())) ||
      (c.cidade && c.cidade.toLowerCase().includes(search.toLowerCase()));
    const matchNicho = nichoFilter === "todos" || c.nicho === nichoFilter;
    const matchCidade = cidadeFilter === "todos" || c.cidade === cidadeFilter;
    return matchSearch && matchNicho && matchCidade;
  });

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) setEditing(null);
    if (v) {
      setSelectedNicho(editing?.nicho ?? NONE_VALUE);
      setSelectedCidade(editing?.cidade ?? NONE_VALUE);
    }
  }

  function openNew() {
    setEditing(null);
    setSelectedNicho(NONE_VALUE);
    setSelectedCidade(NONE_VALUE);
    setOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditing(c);
    setSelectedNicho(c.nicho ?? NONE_VALUE);
    setSelectedCidade(c.cidade ?? NONE_VALUE);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      nome: (fd.get("nome") as string).trim(),
      nicho: selectedNicho === NONE_VALUE ? "" : selectedNicho,
      responsavel: (fd.get("responsavel") as string).trim(),
      telefone: (fd.get("telefone") as string).trim(),
      endereco: (fd.get("endereco") as string).trim(),
      bairro: (fd.get("bairro") as string).trim(),
      cidade: selectedCidade === NONE_VALUE ? "" : selectedCidade,
      complemento: (fd.get("complemento") as string).trim(),
      cpf_cnpj: (fd.get("cpf_cnpj") as string).trim(),
      inscricao_estadual: (fd.get("inscricao_estadual") as string).trim(),
      email: (fd.get("email") as string).trim()
    };
    const result = clienteSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    upsert.mutate(result.data);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="heading-gradient text-2xl md:text-3xl">Clientes</h1>
        <div className="flex gap-2">
          <Dialog open={cidadesOpen} onOpenChange={setCidadesOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><MapPin className="mr-1.5 h-4 w-4" />Cidades</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerenciar Cidades</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Rio Verde"
                    value={novoCidade}
                    onChange={(e) => setNovoCidade(e.target.value)}
                    maxLength={100}
                  />
                  <Button
                    size="sm"
                    onClick={() => novoCidade.trim() && addCidade.mutate(novoCidade.trim())}
                    disabled={!novoCidade.trim() || addCidade.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {cidades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma cidade cadastrada.</p>
                  ) : (
                    cidades.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                        <span className="text-sm">{c.nome}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delCidade.mutate(c.id)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={nichosOpen} onOpenChange={setNichosOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Tag className="mr-1.5 h-4 w-4" />Nichos</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerenciar Nichos</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Lanchonete"
                    value={novoNicho}
                    onChange={(e) => setNovoNicho(e.target.value)}
                    maxLength={100}
                  />
                  <Button
                    size="sm"
                    onClick={() => novoNicho.trim() && addNicho.mutate(novoNicho.trim())}
                    disabled={!novoNicho.trim() || addNicho.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {nichos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum nicho cadastrado.</p>
                  ) : (
                    nichos.map((n) => (
                      <div key={n.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
                        <span className="text-sm">{n.nome}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delNicho.mutate(n.id)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-4 w-4" />Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="nome">Nome Fantasia *</Label><Input id="nome" name="nome" required maxLength={255} defaultValue={editing?.nome ?? ""} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="nicho">Nicho / Área de Atuação</Label>
                  <Select value={selectedNicho} onValueChange={setSelectedNicho}>
                    <SelectTrigger id="nicho">
                      <SelectValue placeholder="Selecione um nicho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Sem nicho</SelectItem>
                      {nichos.map((n) => (
                        <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label htmlFor="responsavel">Nome do Responsável</Label><Input id="responsavel" name="responsavel" maxLength={255} defaultValue={editing?.responsavel ?? ""} /></div>
                <div className="space-y-1.5"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" name="telefone" maxLength={50} defaultValue={editing?.telefone ?? ""} /></div>
                <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" maxLength={255} defaultValue={(editing as any)?.email ?? ""} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="cpf_cnpj">CPF / CNPJ</Label><Input id="cpf_cnpj" name="cpf_cnpj" maxLength={20} defaultValue={(editing as any)?.cpf_cnpj ?? ""} /></div>
                  <div className="space-y-1.5"><Label htmlFor="inscricao_estadual">Inscrição Estadual</Label><Input id="inscricao_estadual" name="inscricao_estadual" maxLength={30} defaultValue={(editing as any)?.inscricao_estadual ?? ""} /></div>
                </div>
                <div className="space-y-1.5"><Label htmlFor="endereco">Endereço</Label><Input id="endereco" name="endereco" maxLength={255} defaultValue={(editing as any)?.endereco ?? ""} /></div>
                <div className="space-y-1.5"><Label htmlFor="complemento">Complemento / Ponto de Referência</Label><Input id="complemento" name="complemento" maxLength={255} defaultValue={(editing as any)?.complemento ?? ""} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label htmlFor="bairro">Bairro</Label><Input id="bairro" name="bairro" maxLength={100} defaultValue={editing?.bairro ?? ""} /></div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Select value={selectedCidade} onValueChange={setSelectedCidade}>
                      <SelectTrigger id="cidade">
                        <SelectValue placeholder="Selecione uma cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>Sem cidade</SelectItem>
                        {cidades.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={upsert.isPending}>Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={nichoFilter} onValueChange={setNichoFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filtrar por nicho" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os nichos</SelectItem>
            {nichos.map((n) => (
              <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Filtrar por cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as cidades</SelectItem>
            {cidades.map((c) => (
              <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((c, index) => (
            <Card key={c.id} className="card-interactive animate-fade-in" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
              <CardContent className="flex items-center justify-between p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.nome}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                    {c.nicho && <span className="rounded-md bg-accent px-2 py-0.5 text-accent-foreground font-medium">{c.nicho}</span>}
                    {c.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span>}
                    {(c.bairro || c.cidade) && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[c.bairro, c.cidade].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
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
