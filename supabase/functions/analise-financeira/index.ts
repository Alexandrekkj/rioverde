import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { periodo, dados } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const systemPrompt = `Você é um analista financeiro especialista em pequenos negócios brasileiros de distribuição/revenda.
Analise os dados financeiros fornecidos e gere um resumo executivo em português, objetivo e interpretativo.
Seja direto, use linguagem simples e destaque os pontos mais importantes.
Máximo 4 parágrafos curtos. Use emojis para destacar pontos críticos (✅ bom, ⚠️ atenção, 🔴 crítico, 📈 crescendo, 📉 caindo).
Não repita os números exatos que já aparecem nos cards — apenas interprete e dê contexto.`;

    const userPrompt = `Período: ${periodo}
Dados financeiros:
- Receita Total: R$ ${dados.receita?.toFixed(2) ?? 0}
- Custo de Reposição: R$ ${dados.custo?.toFixed(2) ?? 0}
- Lucro Bruto: R$ ${dados.lucroBruto?.toFixed(2) ?? 0}
- Total de Despesas: R$ ${dados.despesas?.toFixed(2) ?? 0}
- Lucro Líquido: R$ ${dados.lucroLiquido?.toFixed(2) ?? 0}
- Margem Bruta: ${dados.margemBruta?.toFixed(1) ?? 0}%
- Margem Líquida: ${dados.margemLiquida?.toFixed(1) ?? 0}%
- Qtd. Vendas: ${dados.qtdVendas ?? 0}
- Ticket Médio: R$ ${dados.ticketMedio?.toFixed(2) ?? 0}
${dados.crescimento !== undefined ? `- Crescimento vs período anterior: ${dados.crescimento?.toFixed(1) ?? 0}%` : ""}
${dados.projecaoMes !== undefined ? `- Projeção do mês (se manter ritmo): R$ ${dados.projecaoMes?.toFixed(2) ?? 0}` : ""}
${dados.mediaLucro7dias !== undefined ? `- Média lucro últimos 7 dias: R$ ${dados.mediaLucro7dias?.toFixed(2) ?? 0}` : ""}
${dados.alertas?.length > 0 ? `- Alertas identificados: ${dados.alertas.join(", ")}` : ""}

Gere o resumo executivo interpretativo:`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const analise = result.choices?.[0]?.message?.content ?? "Análise não disponível.";

    return new Response(JSON.stringify({ analise }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analise-financeira error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
