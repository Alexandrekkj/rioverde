
-- 1. Enable unaccent for future use
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Bairros table
CREATE TABLE IF NOT EXISTS public.bairros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bairros TO anon, authenticated, service_role;
ALTER TABLE public.bairros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on bairros" ON public.bairros FOR ALL USING (true) WITH CHECK (true);

-- 3. Cliente midias table (fotos/videos da localização do estabelecimento)
CREATE TABLE IF NOT EXISTS public.cliente_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  url text NOT NULL,
  tipo text NOT NULL, -- 'imagem' | 'video'
  nome text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cliente_midias_cliente_idx ON public.cliente_midias(cliente_id);
GRANT ALL ON public.cliente_midias TO anon, authenticated, service_role;
ALTER TABLE public.cliente_midias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access on cliente_midias" ON public.cliente_midias FOR ALL USING (true) WITH CHECK (true);

-- 4. Normalize existing bairros in clientes
UPDATE public.clientes SET bairro = CASE
  WHEN upper(unaccent(trim(bairro))) IN ('AEROPORTO') THEN 'Aeroporto'
  WHEN upper(unaccent(trim(bairro))) IN ('ALEMANHA') THEN 'Alemanha'
  WHEN upper(unaccent(trim(bairro))) IN ('ALTO DO TURU 2') THEN 'Alto do Turu II'
  WHEN upper(unaccent(trim(bairro))) IN ('ALTO TURU') THEN 'Alto do Turu'
  WHEN upper(unaccent(trim(bairro))) IN ('AMERICAMOS','AMERICANOS') THEN 'Americanos'
  WHEN upper(unaccent(trim(bairro))) IN ('ANGELIM') THEN 'Angelim'
  WHEN upper(unaccent(trim(bairro))) IN ('ANIL') THEN 'Anil'
  WHEN upper(unaccent(trim(bairro))) IN ('ANJO DA GUARDA') THEN 'Anjo da Guarda'
  WHEN upper(unaccent(trim(bairro))) IN ('ARACAGI','ARACAGY') THEN 'Araçagy'
  WHEN upper(unaccent(trim(bairro))) IN ('AREAL') THEN 'Areal'
  WHEN upper(unaccent(trim(bairro))) IN ('AREINHA') THEN 'Areinha'
  WHEN upper(unaccent(trim(bairro))) IN ('AVENIDA PIQUI') THEN 'Avenida Piqui'
  WHEN upper(unaccent(trim(bairro))) IN ('BARRA DO JARDIM') THEN 'Barra do Jardim'
  WHEN upper(unaccent(trim(bairro))) IN ('BARRO DURO') THEN 'Barro Duro'
  WHEN upper(unaccent(trim(bairro))) IN ('BEQUIMAO') THEN 'Bequimão'
  WHEN upper(unaccent(trim(bairro))) IN ('BOA VISTA') THEN 'Boa Vista'
  WHEN upper(unaccent(trim(bairro))) IN ('BR') THEN 'BR'
  WHEN upper(unaccent(trim(bairro))) IN ('CALHAU') THEN 'Calhau'
  WHEN upper(unaccent(trim(bairro))) IN ('CANECAO') THEN 'Canecão'
  WHEN upper(unaccent(trim(bairro))) IN ('CARATATIUA') THEN 'Caratatiua'
  WHEN upper(unaccent(trim(bairro))) IN ('CARNAUBAL') THEN 'Carnaubal'
  WHEN upper(unaccent(trim(bairro))) IN ('CAURA') THEN 'Caura'
  WHEN upper(unaccent(trim(bairro))) IN ('CEBOLA') THEN 'Cebola'
  WHEN upper(unaccent(trim(bairro))) IN ('CENTRO') THEN 'Centro'
  WHEN upper(unaccent(trim(bairro))) IN ('CHACARA BRASIL') THEN 'Chácara Brasil'
  WHEN upper(unaccent(trim(bairro))) IN ('CIDADE NOVA') THEN 'Cidade Nova'
  WHEN upper(unaccent(trim(bairro))) IN ('CIDADE OLIMPICA') THEN 'Cidade Olímpica'
  WHEN upper(unaccent(trim(bairro))) IN ('CIDADE OPERARARIA','CIDADE OPERARIA') THEN 'Cidade Operária'
  WHEN upper(unaccent(trim(bairro))) IN ('CODO') THEN 'Codó'
  WHEN upper(unaccent(trim(bairro))) IN ('COHAB') THEN 'Cohab'
  WHEN upper(unaccent(trim(bairro))) IN ('COHAB ANIL IV') THEN 'Cohab Anil IV'
  WHEN upper(unaccent(trim(bairro))) IN ('COHABIANO') THEN 'Cohabiano'
  WHEN upper(unaccent(trim(bairro))) IN ('COHAJAP') THEN 'Cohajap'
  WHEN upper(unaccent(trim(bairro))) IN ('COHAMA') THEN 'Cohama'
  WHEN upper(unaccent(trim(bairro))) IN ('COHASERMA') THEN 'Cohaserma'
  WHEN upper(unaccent(trim(bairro))) IN ('COHATRAC') THEN 'Cohatrac'
  WHEN upper(unaccent(trim(bairro))) IN ('COHATRAC II') THEN 'Cohatrac II'
  WHEN upper(unaccent(trim(bairro))) IN ('COHATRAC IV') THEN 'Cohatrac IV'
  WHEN upper(unaccent(trim(bairro))) IN ('COHATRAC V') THEN 'Cohatrac V'
  WHEN upper(unaccent(trim(bairro))) IN ('COHEB DO SACAVEM') THEN 'Coheb do Sacavém'
  WHEN upper(unaccent(trim(bairro))) IN ('CONJUNTO HABITACIONAL VINHAIS') THEN 'Conjunto Habitacional Vinhais'
  WHEN upper(unaccent(trim(bairro))) IN ('COROADINHO') THEN 'Coroadinho'
  WHEN upper(unaccent(trim(bairro))) IN ('CORRENTE') THEN 'Corrente'
  WHEN upper(unaccent(trim(bairro))) IN ('CRUZEIRO DE SANTA BARBARA') THEN 'Cruzeiro de Santa Bárbara'
  WHEN upper(unaccent(trim(bairro))) IN ('ENTROCAMENTO','ENTRONCAMENTO') THEN 'Entroncamento'
  WHEN upper(unaccent(trim(bairro))) IN ('ESTRADA DA MAIOBA') THEN 'Estrada da Maioba'
  WHEN upper(unaccent(trim(bairro))) IN ('FATIMA') THEN 'Fátima'
  WHEN upper(unaccent(trim(bairro))) IN ('FORMOSA') THEN 'Formosa'
  WHEN upper(unaccent(trim(bairro))) IN ('FORQUILHA') THEN 'Forquilha'
  WHEN upper(unaccent(trim(bairro))) IN ('FUMACE') THEN 'Fumacê'
  WHEN upper(unaccent(trim(bairro))) IN ('GUAJAJARAS') THEN 'Guajajaras'
  WHEN upper(unaccent(trim(bairro))) IN ('HABITACIONAL TURU') THEN 'Habitacional Turu'
  WHEN upper(unaccent(trim(bairro))) IN ('INHAUMA') THEN 'Inhaúma'
  WHEN upper(unaccent(trim(bairro))) IN ('IPASE DE CIMA') THEN 'IPASE de Cima'
  WHEN upper(unaccent(trim(bairro))) IN ('ITAPIRACO') THEN 'Itapiracó'
  WHEN upper(unaccent(trim(bairro))) IN ('IVAR SALDANHA') THEN 'Ivar Saldanha'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM AMERICA') THEN 'Jardim América'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM DAS MARGARIDAS') THEN 'Jardim das Margaridas'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM MERCES') THEN 'Jardim Mercês'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM SAO CRISTOVAO II') THEN 'Jardim São Cristóvão II'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM TURU') THEN 'Jardim Turu'
  WHEN upper(unaccent(trim(bairro))) IN ('JARDIM TURU II') THEN 'Jardim Turu II'
  WHEN upper(unaccent(trim(bairro))) IN ('JOAO DE DEUS') THEN 'João de Deus'
  WHEN upper(unaccent(trim(bairro))) IN ('LADEIRA') THEN 'Ladeira'
  WHEN upper(unaccent(trim(bairro))) IN ('LIBERDADE') THEN 'Liberdade'
  WHEN upper(unaccent(trim(bairro))) IN ('LIMA VERDE') THEN 'Lima Verde'
  WHEN upper(unaccent(trim(bairro))) IN ('LITORANEA') THEN 'Litorânea'
  WHEN upper(unaccent(trim(bairro))) IN ('MAIOBA') THEN 'Maioba'
  WHEN upper(unaccent(trim(bairro))) IN ('MAIOBAO') THEN 'Maiobão'
  WHEN upper(unaccent(trim(bairro))) IN ('MAIOBINHA') THEN 'Maiobinha'
  WHEN upper(unaccent(trim(bairro))) IN ('MARACANA') THEN 'Maracanã'
  WHEN upper(unaccent(trim(bairro))) IN ('MARANHAO NOVO') THEN 'Maranhão Novo'
  WHEN upper(unaccent(trim(bairro))) IN ('MARANHAOZINHO') THEN 'Maranhãozinho'
  WHEN upper(unaccent(trim(bairro))) IN ('MIRITIUA') THEN 'Miritiua'
  WHEN upper(unaccent(trim(bairro))) IN ('MONTE CASTELO') THEN 'Monte Castelo'
  WHEN upper(unaccent(trim(bairro))) IN ('MONTE DOURADO') THEN 'Monte Dourado'
  WHEN upper(unaccent(trim(bairro))) IN ('MURICI') THEN 'Murici'
  WHEN upper(unaccent(trim(bairro))) IN ('NOVO') THEN 'Novo'
  WHEN upper(unaccent(trim(bairro))) IN ('NOVO HORIZONTE') THEN 'Novo Horizonte'
  WHEN upper(unaccent(trim(bairro))) IN ('NOVO MARANHAO') THEN 'Novo Maranhão'
  WHEN upper(unaccent(trim(bairro))) IN ('OLHO D''AGUA','OLHO D AGUA','OLHO DAGUA') THEN 'Olho D''Água'
  WHEN upper(unaccent(trim(bairro))) IN ('PALMEIRA') THEN 'Palmeira'
  WHEN upper(unaccent(trim(bairro))) IN ('PARANA') THEN 'Paranã'
  WHEN upper(unaccent(trim(bairro))) IN ('PARANA I') THEN 'Paranã I'
  WHEN upper(unaccent(trim(bairro))) IN ('PARQUE ATENAS') THEN 'Parque Atenas'
  WHEN upper(unaccent(trim(bairro))) IN ('PARQUE JAGUAREMA') THEN 'Parque Jaguarema'
  WHEN upper(unaccent(trim(bairro))) IN ('PARQUE SHALOM','PARQUE SHALON') THEN 'Parque Shalom'
  WHEN upper(unaccent(trim(bairro))) IN ('PARQUE VITORIA') THEN 'Parque Vitória'
  WHEN upper(unaccent(trim(bairro))) IN ('PEDREIRAS') THEN 'Pedreiras'
  WHEN upper(unaccent(trim(bairro))) IN ('PEDRINHAS') THEN 'Pedrinhas'
  WHEN upper(unaccent(trim(bairro))) IN ('PERI DE BAIXO') THEN 'Peri de Baixo'
  WHEN upper(unaccent(trim(bairro))) IN ('PINDAI') THEN 'Pindaí'
  WHEN upper(unaccent(trim(bairro))) IN ('PINHEIROS') THEN 'Pinheiros'
  WHEN upper(unaccent(trim(bairro))) IN ('PLANALTO TURU II') THEN 'Planalto Turu II'
  WHEN upper(unaccent(trim(bairro))) IN ('PONTA D''AREIA','PONTA D AREIA','PONTA DAREIA') THEN 'Ponta D''Areia'
  WHEN upper(unaccent(trim(bairro))) IN ('POVOADO PEDRAS') THEN 'Povoado Pedras'
  WHEN upper(unaccent(trim(bairro))) IN ('RADIONAL') THEN 'Radional'
  WHEN upper(unaccent(trim(bairro))) IN ('RENASCENCA') THEN 'Renascença'
  WHEN upper(unaccent(trim(bairro))) IN ('RESID. CARLOS AUGUSTO','RESIDENCIAL CARLOS AUGUSTO') THEN 'Residencial Carlos Augusto'
  WHEN upper(unaccent(trim(bairro))) IN ('RESIDENCIAL ATLANTIC') THEN 'Residencial Atlantic'
  WHEN upper(unaccent(trim(bairro))) IN ('RESIDENCIAL PINHEIROS') THEN 'Residencial Pinheiros'
  WHEN upper(unaccent(trim(bairro))) IN ('RIO ANIL') THEN 'Rio Anil'
  WHEN upper(unaccent(trim(bairro))) IN ('S. CRISTOVAO','SAO CRISTOVAO') THEN 'São Cristóvão'
  WHEN upper(unaccent(trim(bairro))) IN ('SABBAK') THEN 'Sabbak'
  WHEN upper(unaccent(trim(bairro))) IN ('SACAVEM') THEN 'Sacavém'
  WHEN upper(unaccent(trim(bairro))) IN ('SANTA CLARA') THEN 'Santa Clara'
  WHEN upper(unaccent(trim(bairro))) IN ('SANTA CRUZ') THEN 'Santa Cruz'
  WHEN upper(unaccent(trim(bairro))) IN ('SANTA EFIGENIA') THEN 'Santa Efigênia'
  WHEN upper(unaccent(trim(bairro))) IN ('SANTA ROSA') THEN 'Santa Rosa'
  WHEN upper(unaccent(trim(bairro))) IN ('SANTA TEREZA') THEN 'Santa Tereza'
  WHEN upper(unaccent(trim(bairro))) IN ('SAO BERNARDO') THEN 'São Bernardo'
  WHEN upper(unaccent(trim(bairro))) IN ('SAO DOMINGOS') THEN 'São Domingos'
  WHEN upper(unaccent(trim(bairro))) IN ('SAO FRANCISCO') THEN 'São Francisco'
  WHEN upper(unaccent(trim(bairro))) IN ('SAO RAIMUNDO') THEN 'São Raimundo'
  WHEN upper(unaccent(trim(bairro))) IN ('SAO SEBASTIAO') THEN 'São Sebastião'
  WHEN upper(unaccent(trim(bairro))) IN ('SHOPPING PATIO NORTE') THEN 'Shopping Pátio Norte'
  WHEN upper(unaccent(trim(bairro))) IN ('SITIO NATUREZA') THEN 'Sítio Natureza'
  WHEN upper(unaccent(trim(bairro))) IN ('SOBRADINHO') THEN 'Sobradinho'
  WHEN upper(unaccent(trim(bairro))) IN ('SOL E MAR') THEN 'Sol e Mar'
  WHEN upper(unaccent(trim(bairro))) IN ('TIBIRI') THEN 'Tibiri'
  WHEN upper(unaccent(trim(bairro))) IN ('TIRIRICAL') THEN 'Tiririca'
  WHEN upper(unaccent(trim(bairro))) IN ('TRIZIDELA') THEN 'Trizidela'
  WHEN upper(unaccent(trim(bairro))) IN ('TURU') THEN 'Turu'
  WHEN upper(unaccent(trim(bairro))) IN ('VICENTE FIALHO') THEN 'Vicente Fialho'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA AIRTON SENNA') THEN 'Vila Airton Senna'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA AMERICA') THEN 'Vila América'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA ARIRI') THEN 'Vila Ariri'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA BOM VIVER') THEN 'Vila Bom Viver'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA CAFETEIRA') THEN 'Vila Cafeteira'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA CASCAVEL') THEN 'Vila Cascavel'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA EMBRATEL') THEN 'Vila Embratel'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA ESPERANCA') THEN 'Vila Esperança'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA FLAMENGO') THEN 'Vila Flamengo'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA FLAMENGO CIDADE OPERARARIA') THEN 'Vila Flamengo (Cidade Operária)'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA ISABEL (ANJO DA GUARDA)') THEN 'Vila Isabel (Anjo da Guarda)'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA LUIZAO') THEN 'Vila Luizão'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA MARANHAO') THEN 'Vila Maranhão'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA MARESIA') THEN 'Vila Maresia'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA PALMEIRA') THEN 'Vila Palmeira'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA RIOD') THEN 'Vila Riod'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA SAMARA') THEN 'Vila Samara'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA SAO JOSE','VILA SAO JOSE.') THEN 'Vila São José'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA SARNEY') THEN 'Vila Sarney'
  WHEN upper(unaccent(trim(bairro))) IN ('VILA VICENTE FIALHO') THEN 'Vila Vicente Fialho'
  WHEN upper(unaccent(trim(bairro))) IN ('VINHAIS') THEN 'Vinhais'
  WHEN upper(unaccent(trim(bairro))) IN ('ZONA RURAL') THEN 'Zona Rural'
  ELSE initcap(lower(trim(bairro)))
END
WHERE bairro IS NOT NULL AND bairro <> '';

-- 5. Popular tabela bairros com todos os distintos normalizados
INSERT INTO public.bairros (nome)
SELECT DISTINCT bairro FROM public.clientes
WHERE bairro IS NOT NULL AND bairro <> ''
ON CONFLICT (nome) DO NOTHING;
