import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Radar, Search, Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ClienteRadar = {
  id: string;
  nome: string;
  telefone: string | null;
  nicho: string | null;
  ultima_compra: Date | null;
  dias: number | null;
};

function classify(dias: number | null) {
  if (dias === null) return { color: "muted", label: "Sem compras", bar: "bg-muted" };
  if (dias < 15) return { color: "default", label: "Recente", bar: "bg-muted" };
  if (dias < 25) return { color: "green", label: "15+ dias", bar: "bg-emerald-500" };
  if (dias < 35) return { color: "yellow", label: "25+ dias", bar: "bg-amber-500" };
  return { color: "red", label: "35+ dias", bar: "bg-red-500" };
}

const FILTROS = [
  { value: "todos", label: "Todos" },
  { value: "0-14", label: "0-14 dias" },
  { value: "15-24", label: "15-24 dias (verde)" },
  { value: "25-34", label: "25-34 dias (amarelo)" },
  { value: "35+", label: "35+ dias (vermelho)" },
  { value: "nunca", label: "Sem compras" },
];

export default function RadarRecompra() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome, telefone, nicho");
      if (error) throw error;
      return data;
    },
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-radar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendas").select("cliente_id, data").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const radar: ClienteRadar[] = useMemo(() => {
    const ultimaPorCliente = new Map<string, Date>();
    for (const v of vendas) {
      if (!ultimaPorCliente.has(v.cliente_id)) {
        ultimaPorCliente.set(v.cliente_id, new Date(v.data));
      }
    }
    const hoje = new Date();
    return clientes.map((c) => {
      const ult = ultimaPorCliente.get(c.id) ?? null;
      const dias = ult ? Math.floor((hoje.getTime() - ult.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return { id: c.id, nome: c.nome, telefone: c.telefone, nicho: c.nicho, ultima_compra: ult, dias };
    });
  }, [clientes, vendas]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return radar
      .filter((r) => (q ? r.nome.toLowerCase().includes(q) : true))
      .filter((r) => {
        if (filtro === "todos") return true;
        if (filtro === "nunca") return r.dias === null;
        if (r.dias === null) return false;
        if (filtro === "0-14") return r.dias < 15;
        if (filtro === "15-24") return r.dias >= 15 && r.dias < 25;
        if (filtro === "25-34") return r.dias >= 25 && r.dias < 35;
        if (filtro === "35+") return r.dias >= 35;
        return true;
      })
      .sort((a, b) => {
        if (a.dias === null && b.dias === null) return a.nome.localeCompare(b.nome);
        if (a.dias === null) return -1;
        if (b.dias === null) return 1;
        return b.dias - a.dias;
      });
  }, [radar, busca, filtro]);

  const counts = useMemo(() => {
    const c = { verde: 0, amarelo: 0, vermelho: 0, nunca: 0 };
    for (const r of radar) {
      if (r.dias === null) c.nunca++;
      else if (r.dias >= 35) c.vermelho++;
      else if (r.dias >= 25) c.amarelo++;
      else if (r.dias >= 15) c.verde++;
    }
    return c;
  }, [radar]);

  const fmtData = (d: Date | null) =>
    d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Radar className="h-6 w-6 text-primary" />
        <h1 className="heading-gradient text-2xl md:text-3xl">Radar de Recompra</h1>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" />Verde (15+ dias)</div>
          <div className="text-2xl font-bold mt-1">{counts.verde}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-amber-500" />Amarelo (25+ dias)</div>
          <div className="text-2xl font-bold mt-1">{counts.amarelo}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-red-500" />Vermelho (35+ dias)</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{counts.vermelho}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-muted-foreground" />Sem compras</div>
          <div className="text-2xl font-bold mt-1">{counts.nunca}</div>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado para o filtro selecionado.
          </CardContent></Card>
        ) : (
          filtrados.map((c) => {
            const cls = classify(c.dias);
            const isUrgente = c.dias !== null && c.dias >= 35;
            return (
              <Card
                key={c.id}
                className={cn(
                  "overflow-hidden transition-all",
                  isUrgente && "ring-1 ring-red-200 dark:ring-red-900",
                )}
              >
                <div className={cn("h-1 w-full", cls.bar)} />
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{c.nome}</h3>
                        {c.nicho && <Badge variant="outline" className="text-[10px]">{c.nicho}</Badge>}
                        {isUrgente && (
                          <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" />Prioridade
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        Última compra: {fmtData(c.ultima_compra)}
                        {c.telefone && <span className="ml-2">• {c.telefone}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-2xl font-bold leading-none",
                          c.dias === null && "text-muted-foreground",
                          c.dias !== null && c.dias < 15 && "text-foreground",
                          c.dias !== null && c.dias >= 15 && c.dias < 25 && "text-emerald-600",
                          c.dias !== null && c.dias >= 25 && c.dias < 35 && "text-amber-600",
                          c.dias !== null && c.dias >= 35 && "text-red-600",
                        )}
                      >
                        {c.dias ?? "—"}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {c.dias === null ? "sem compras" : "dias"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
