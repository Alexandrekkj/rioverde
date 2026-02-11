

# Sistema de Controle de Vendas - Distribuidora

## Visão Geral
Web app responsiva com tema escuro, minimalista e rápida, para uso pessoal em celular e notebook durante visitas a clientes. Backend com Lovable Cloud (Supabase).

---

## Etapa 1 — Base: Cadastros + Registro de Vendas

### Banco de Dados
- Tabelas: **clientes**, **produtos**, **vendas**, **itens_venda**
- Clientes: nome, nicho, responsável, telefone, bairro/cidade
- Produtos: nome, categoria, preço padrão
- Vendas: data, cliente, desconto geral, total
- Itens de venda: produto, quantidade, preço unitário, desconto do item

### Tela de Clientes
- Lista com busca rápida por nome/nicho
- Formulário de cadastro/edição simples
- Cards compactos mostrando nome, nicho e telefone

### Tela de Produtos
- Lista de produtos com busca por nome/categoria
- Cadastro rápido com nome, categoria e preço

### Tela de Nova Venda (fluxo principal)
- Selecionar cliente existente ou cadastrar novo inline (poucos cliques)
- Adicionar produtos da lista com quantidade e desconto opcional por item
- Campo de desconto geral sobre o total
- Cálculo automático: subtotal, descontos e total final
- Botão para salvar a venda

### Navegação
- Menu inferior (mobile) / sidebar (desktop) com: Dashboard, Vendas, Clientes, Produtos
- Tema escuro por padrão

---

## Etapa 2 — Histórico de Vendas

### Histórico Geral
- Lista de todas as vendas com data, cliente e valor total
- Filtro por período (data inicial/final)
- Filtro por cliente, produto e nicho

### Histórico por Cliente
- Na tela de detalhes do cliente, listar todas as vendas dele
- Total acumulado e última compra

---

## Etapa 3 — Dashboard e Insights Comerciais

### Dashboard com KPIs (tela inicial)
- Cards: total vendido no mês, quantidade de vendas, ticket médio, clientes ativos
- Gráfico de vendas por dia/semana (usando Recharts)

### Insights Automáticos
- Produto mais comprado por cada cliente
- Cliente que mais comprou no mês
- Ranking de produtos mais e menos vendidos
- Total vendido por período (dia, semana, mês)
- Ticket médio por cliente
- Clientes inativos (sem compra há X dias configurável)

### Filtros de Análise
- Período, cliente, produto e nicho — aplicáveis ao dashboard e aos insights

