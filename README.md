# POC EIS - Apache Superset / ECharts

## Objetivo

Validar se conseguimos atender aos seguintes requisitos de controle de gráficos no frontend:

1. Alterar cor de fundo do gráfico dinamicamente
2. Gráficos em 3D (ECharts suporta)
3. Gráficos com 500+ valores em uma série (gráfico de barras), ideal 1500+ valores ordenados e visíveis
4. Suporte a Zoom
5. Múltiplos pontos de ativação (cliques em listas, mudança de filtros, drill-down)
6. Controle preciso sobre quando atualizar
7. Prevenir ativações duplicadas (problema na função atual)

A POC usa **ECharts** — a mesma engine de gráficos que o Apache Superset utiliza internamente. Cada requisito tem um teste interativo dedicado com controles e logs de eventos. Além disso, o **Teste 8** conecta a um Superset real para validar a integração com dados de produção.

## Quick Start

```bash
npm install
npm run dev
# Acessar http://localhost:3000
```

> **Nota:** Os testes 1–7 funcionam 100% standalone (dados gerados localmente, sem backend). O teste 8 requer acesso à rede onde o Superset está rodando.

## Deploy (Vercel)

Os testes 1–7 rodam client-side puro. Para deploy na Vercel, basta conectar o repositório — o `vercel.json` já está configurado. O teste 8 (Superset Real) não funciona na Vercel pois depende de acesso à rede interna.

## Estrutura

```
├── src/
│   ├── App.tsx                              # Navegação entre testes
│   ├── utils.ts                             # Helpers (geração de dados, tipos)
│   ├── supersetApi.ts                       # Cliente API REST do Superset
│   └── tests/
│       ├── TestBackgroundColor.tsx           # Req 1: Cor de fundo dinâmica
│       ├── Test3DChart.tsx                  # Req 2: Gráficos 3D (echarts-gl)
│       ├── TestLargeDataset.tsx             # Req 3: 1500+ valores
│       ├── TestZoom.tsx                     # Req 4: Zoom
│       ├── TestMultipleActivations.tsx      # Req 5: Múltiplos triggers
│       ├── TestUpdateControl.tsx            # Req 6: Controle de update
│       ├── TestPreventDuplicates.tsx        # Req 7: Prevenir duplicatas
│       └── TestSupersetIntegration.tsx      # Teste 8: Integração com Superset real
├── package.json
├── vite.config.ts                           # Inclui proxy para o Superset
├── tsconfig.json
└── vercel.json
```

---

## Resultado da Validação dos Requisitos

### Testes 1–7: ECharts direto no React

| # | Requisito | Status | Como foi validado |
|---|-----------|--------|-------------------|
| 1 | Alterar cor de fundo dinamicamente | ✅ | `chart.setOption({ backgroundColor })` em runtime, sem recriar instância. Color picker + presets. |
| 2 | Gráficos em 3D | ✅ | `echarts-gl` — Scatter3D, Bar3D e Surface com rotação e zoom via mouse. |
| 3 | 1500+ valores ordenados e visíveis | ✅ | `large: true` otimiza renderização. `dataZoom` slider para navegar. Testado com até 5000 barras. |
| 4 | Suporte a Zoom | ✅ | 3 tipos: slider (barra), inside (scroll mouse), toolbox (seleção de área). Zoom programático via API. |
| 5 | Múltiplos pontos de ativação | ✅ | Click no gráfico (drill-down 3 níveis), mudança de filtro (select), click em lista externa (highlight). |
| 6 | Controle preciso sobre quando atualizar | ✅ | Mudanças ficam em fila (pendentes) até clicar "Apply". Toggle auto-update com debounce configurável. |
| 7 | Prevenir ativações duplicadas | ✅ | 4 camadas: debounce → semáforo → AbortController → stale check. Simulação de burst (5/10/20 clicks). |

**Todos os 7 requisitos são atendidos com ECharts direto.**

---

### Teste 8: Integração com Superset Real

O teste 8 conecta ao ambiente Superset da empresa via API REST, lista os charts/dashboards existentes e renderiza os dados com ECharts no nosso frontend.

**O que ele faz:**
1. Autentica via API (`/api/v1/security/login`)
2. Lista databases, datasets, charts e dashboards automaticamente
3. O usuário seleciona um chart no dropdown (mostra o tipo: `[bar]`, `[pie]`, `[line]`, etc.)
4. Busca os dados do chart via API (`/api/v1/chart/{id}/data/`)
5. Renderiza com ECharts no frontend, mapeando o `viz_type` do Superset para o tipo ECharts correspondente

**Tipos de gráfico suportados no mapeamento:**

| viz_type do Superset | Renderiza como ECharts |
|---------------------|------------------------|
| `bar`, `dist_bar`, `histogram` | Bar chart com zoom |
| `line`, `area`, `timeseries` | Line chart (com area se aplicável) |
| `pie`, `donut` | Pizza / Donut |
| `scatter`, `bubble` | Scatter plot |
| `funnel` | Funil |
| `gauge` | Gauge (velocímetro) |
| `radar` | Radar |
| `treemap` | Treemap |
| `big_number` | Número grande centralizado |
| `table` | Bar chart (se tiver colunas numéricas) |
| Qualquer outro | Fallback para bar chart |

**Configuração do proxy (para desenvolvimento local):**

O `vite.config.ts` redireciona `/superset-api/*` para o Superset, evitando problemas de CORS. Para apontar para outro Superset, altere o `target` no arquivo.

**Validação com dados reais:**

Os mesmos controles testados nos exemplos 1–7 (zoom, tooltip, múltiplas séries, dataZoom) funcionam com dados vindos do Superset. Isso prova que a abordagem de usar ECharts diretamente é compatível com dados do Superset via API.

---

## Análise: Superset como UI Interativa

Se a opção for usar o **Superset diretamente como interface** (onde o usuário manipula filtros, colunas, eixos pela UI — como nos vídeos de demonstração), o resultado é:

| Requisito | Status | Detalhe |
|-----------|--------|---------|
| Filtros dinâmicos (Native Filters) | ✅ | Usuário adiciona/remove filtros pela UI |
| Trocar colunas/eixos na interface | ✅ | "Explore" view — arrastar métricas e dimensões |
| Adicionar séries ao gráfico via UI | ✅ | Métricas/breakdowns sem código |
| 1500+ valores | ✅ | Configurar `ROW_LIMIT` no Superset |
| Múltiplos triggers (cross-filter, drill) | ✅ | Click em chart filtra os outros automaticamente |
| Controle de update (Apply button) | ✅ | Desabilitar "instant apply" → botão Apply manual |
| Prevenir duplicatas | ✅ | Botão Apply + debounce nativo |
| Zoom | ⚠️ Parcial | Funciona em Line/Bar, não universal em todos os tipos |
| Cor de fundo dinâmica | ⚠️ Parcial | Via CSS no dashboard, sem color picker livre |
| **Gráficos 3D** | ❌ **Bloqueante** | Superset não traz `echarts-gl`; requer plugin custom |

### Veredicto

> **A única limitação real que bloqueia no Superset é o 3D.** Zoom e cor de fundo têm workarounds. Os demais requisitos funcionam nativamente na versão gratuita.

### Alternativas para 3D no Superset

> **Por que o 3D funciona na POC (teste 2) mas não no Superset?**
> Porque na POC nós controlamos o código — instalamos o pacote `echarts-gl` e usamos livremente. O Superset também usa ECharts internamente, mas **não inclui `echarts-gl` no build**. Quando o usuário cria um chart pela interface do Superset, 3D simplesmente não aparece como opção. Para aparecer, seria necessário criar um plugin de visualização, registrar no código fonte do Superset e fazer um build customizado do frontend — por isso o esforço é alto.

1. **Plugin customizado** — Desenvolver chart plugin com `echarts-gl`. Requer build custom do frontend. Esforço: **alto**.
2. **Componente separado** — Superset para tudo + componente React externo para 3D, mesma base de dados. Esforço: **médio**.
3. **Deck.gl** — Plugin já incluído no Superset com visualizações 3D (hexagons, scatter). Esforço: **baixo**.

---

## Contexto: ECharts vs Apache Superset

| | ECharts | Apache Superset |
|--|---------|-----------------|
| O que é | Biblioteca JS de gráficos | Plataforma completa de BI |
| Quem usa | Desenvolvedor (via código) | Usuário final (via interface web) |
| Controle | Total (programático) | Parcial (limitado ao que a UI expõe) |
| 3D | ✅ via `echarts-gl` | ❌ não incluso |
| Relação | — | Usa ECharts internamente como engine de renderização |

---

## Tecnologias

- React 18
- ECharts 5
- ECharts GL (3D)
- Vite
- TypeScript
