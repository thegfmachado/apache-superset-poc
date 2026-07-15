# Apache Superset POC - EIS Superset Teste

## Objetivo

Validar se conseguimos usar o Apache Superset (versão gratuita) para controlar gráficos no **frontend** da aplicação, atendendo aos requisitos de interatividade, performance e controle de atualização.

## Abordagens Testadas

| Abordagem | Descrição | Controle |
|-----------|-----------|----------|
| **ECharts Direto** | Usar ECharts (engine do Superset) direto no React | Total |
| **Superset Embedded SDK** | Embedar dashboards do Superset via iframe + SDK | Parcial |
| **Superset API + ECharts** | Buscar dados via API do Superset, renderizar com ECharts | Total |

## Quick Start - Frontend (POC Principal)

```bash
# 1. Instalar dependências
cd frontend
npm install

# 2. Rodar o frontend da POC
npm run dev

# 3. Acessar http://localhost:3000
#    Cada requisito tem um teste interativo dedicado
```

## Quick Start - Superset (para testar Embedded SDK)

```bash
# 1. Subir o ambiente Superset
docker-compose up -d

# 2. Aguardar ~60s para inicialização completa
docker-compose logs -f superset

# 3. Popular dados de teste
docker exec -it superset_app pip install psycopg2-binary
docker cp scripts/seed_data.py superset_app:/app/scripts/seed_data.py
docker exec -it superset_app python /app/scripts/seed_data.py

# 4. Acessar Superset
# URL: http://localhost:8088
# Login: admin / admin
```

## Estrutura do Projeto

```
apache-superset-poc/
├── frontend/                      # POC Principal - App React
│   ├── src/
│   │   ├── App.tsx               # Navegação entre testes
│   │   ├── utils.ts             # Helpers (data generation, hooks)
│   │   └── tests/
│   │       ├── TestBackgroundColor.tsx    # Req 1: Cor de fundo dinâmica
│   │       ├── Test3DChart.tsx           # Req 2: Gráficos 3D (echarts-gl)
│   │       ├── TestLargeDataset.tsx      # Req 3: 1500+ valores
│   │       ├── TestZoom.tsx             # Req 4: Zoom
│   │       ├── TestMultipleActivations.tsx # Req 5: Múltiplos triggers
│   │       ├── TestUpdateControl.tsx    # Req 6: Controle de update
│   │       ├── TestPreventDuplicates.tsx # Req 7: Prevenir duplicatas
│   │       └── SupersetEmbedded.tsx     # Teste: SDK Embedded
│   └── package.json
├── docker-compose.yml            # Superset (para teste embedded)
├── config/
│   └── superset_config.py
└── scripts/
    ├── init-db.sql
    ├── seed_data.py
    └── test-queries.sql
```

---

## Validação dos Requisitos

### 1. Alterar Cor de Fundo do Gráfico Dinamicamente

| Aspecto | Suporte | Como testar |
|---------|---------|-------------|
| CSS customizado por dashboard | ✅ | Dashboard → Edit → CSS tab |
| Cor de fundo via ECharts config | ⚠️ Parcial | Custom chart plugin necessário |
| Temas dinâmicos | ✅ | `superset_config.py` → THEME_OVERRIDES |

**Como testar:**
1. Edite um dashboard → aba **CSS**
2. Adicione:
```css
.chart-container {
  background-color: #f0f8ff !important;
}
/* Ou por gráfico específico */
#chart-id-123 .chart-container {
  background-color: #ffe4e1 !important;
}
```

**Limitação:** Alteração dinâmica por interação do usuário requer plugin customizado ou CSS com variáveis + filtros nativos.

---

### 2. Gráficos em 3D (ECharts)

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| ECharts nativo | ✅ | Superset usa ECharts como engine principal |
| Gráficos 3D nativos | ❌ | Não incluso out-of-the-box |
| Plugin customizado ECharts 3D | ✅ | Possível via `echarts-gl` plugin |
| Scatter 3D via Deck.gl | ✅ | Plugin deck.gl incluído |

**Como testar 3D com deck.gl:**
1. Criar chart tipo **deck.gl 3D Hexagon** ou **deck.gl Scatter**
2. Usar dataset `metrics_3d`
3. Mapear metric_x, metric_y, metric_z

**Para ECharts 3D real:**
- Necessário criar plugin customizado com `echarts-gl`
- Veja seção "Plugin ECharts 3D" abaixo

---

### 3. Gráficos com 500-1500+ Valores

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| ROW_LIMIT configurável | ✅ | Configurado para 50000 |
| Bar chart com 1500+ barras | ✅ | Funciona, pode ter lag |
| Scroll horizontal | ✅ | ECharts dataZoom |
| Performance com 2000 valores | ⚠️ | Funcional mas requer otimização |

**Como testar:**
1. Criar chart **ECharts Bar** com dataset `sales_large_dataset`
2. Dimension: `product_code` (2000 valores únicos)
3. Metric: `SUM(sales_amount)`
4. Em **Customize** → habilitar **Data Zoom** (se disponível)
5. Verificar ordenação: Sort → Metric descending

**Configuração para suportar volume:**
- `VIZ_ROW_LIMIT = 50000` (já configurado)
- Em cada chart: ajustar "Row Limit" para 2000+

---

### 4. Suporte a Zoom

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| Data Zoom (scroll) | ✅ | ECharts nativo - slider zoom |
| Box Zoom (seleção de área) | ✅ | ECharts toolbox |
| Pinch Zoom (mobile) | ✅ | ECharts touch events |
| Zoom em mapas | ✅ | deck.gl / ECharts Map |

**Como testar:**
1. Em qualquer gráfico ECharts (Bar, Line, Scatter)
2. **Customize** → procurar opções de Zoom/DataZoom
3. Para zoom via toolbox: pode ser necessário plugin customizado

---

### 5. Múltiplos Pontos de Ativação

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| Click em gráfico → filtro | ✅ | Cross-filter nativo |
| Mudança de filtros → refresh | ✅ | Native Filters |
| Drill-down | ✅ | DRILL_TO_DETAIL habilitado |
| Click em lista → ação | ⚠️ | Parcial, via cross-filter |

**Como testar:**
1. Criar dashboard com múltiplos charts usando `filter_test_data`
2. Adicionar **Native Filters** (department, team, status)
3. Habilitar **Cross-filter** entre gráficos
4. Testar: click em uma barra → outros gráficos filtram

---

### 6. Controle Preciso sobre Atualização

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| Auto-refresh configurável | ✅ | Dashboard → timer |
| Refresh manual | ✅ | Botão refresh |
| Refresh por filtro | ✅ | Nativo |
| Debounce de filtros | ⚠️ | Comportamento padrão do Superset |
| API para refresh programático | ✅ | REST API disponível |

**Como testar:**
1. Dashboard → **⋯** menu → **Set auto-refresh interval**
2. Native Filters → configurar para "Apply" manual vs automático
3. Testar API: `GET /api/v1/chart/data` com parâmetros

---

### 7. Prevenir Ativações Duplicadas

| Aspecto | Suporte | Detalhes |
|---------|---------|----------|
| Debounce em filtros | ✅ | Nativo no dashboard |
| Botão "Apply Filters" | ✅ | Configurável nos Native Filters |
| Cancelar request anterior | ✅ | AbortController no frontend |
| Queue de requests | ✅ | Celery worker |

**Como testar:**
1. Native Filters → desabilitar "Apply filters instantly"
2. Isso adiciona botão "Apply" que previne múltiplas ativações
3. Testar: mudar 3 filtros → click "Apply" → apenas 1 refresh

---

## Plugin ECharts 3D (Customização)

Para suporte completo a gráficos 3D, é necessário criar um plugin:

```bash
# Estrutura do plugin
superset-plugin-chart-echarts-3d/
├── package.json
├── src/
│   ├── index.ts
│   ├── ECharts3D.tsx
│   ├── controlPanel.ts
│   └── transformProps.ts
└── tsconfig.json
```

O plugin usaria `echarts-gl` para renderizar:
- Bar3D
- Scatter3D
- Surface3D
- Line3D

**Nota:** Isso requer build customizado do Superset frontend.

---

## Arquitetura da POC

```
┌─────────────────────────────────────────────┐
│              Browser (localhost:8088)         │
├─────────────────────────────────────────────┤
│           Apache Superset (Gunicorn)         │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │Dashboard │  │ Charts   │  │  Filters  │  │
│  │ Engine   │  │ (ECharts)│  │  (Native) │  │
│  └─────────┘  └──────────┘  └───────────┘  │
├─────────────────────────────────────────────┤
│  Celery Worker  │  Redis Cache  │           │
├─────────────────┴───────────────┴───────────┤
│              PostgreSQL                       │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │superset (meta)│  │poc_data (test data) │  │
│  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Conclusão Principal — Cenário Real

O cenário avaliado é: usar o **Superset como UI interativa** onde o usuário manipula filtros, colunas, eixos e tipos de gráfico diretamente pela interface (como mostrado nos vídeos de demonstração do Superset).

### Resultado: Superset como UI Interativa para o Usuário

| Requisito | Status | Detalhe |
|-----------|--------|---------|
| Filtros dinâmicos (Native Filters) | ✅ Funciona | Usuário adiciona/remove filtros pela UI |
| Trocar colunas/eixos na interface | ✅ Funciona | "Explore" view permite arrastar métricas, dimensões, mudar eixos |
| Adicionar séries ao gráfico via UI | ✅ Funciona | Usuário adiciona métricas/breakdowns sem código |
| Gráficos com 1500+ valores | ✅ Funciona | Configurar `ROW_LIMIT` (já configurado para 50000) |
| Múltiplos triggers (cross-filter, drill) | ✅ Funciona | Click em um chart filtra os outros automaticamente |
| Controle de update (Apply button) | ✅ Funciona | Desabilitar "instant apply" → botão Apply manual |
| Prevenir ativações duplicadas | ✅ Funciona | Botão Apply + debounce nativo resolve |
| Zoom | ⚠️ Parcial | Funciona em alguns chart types (ECharts Line/Bar), não é universal |
| Cor de fundo dinâmica | ⚠️ Parcial | Via CSS no dashboard + aba Customize, mas sem color picker livre |
| **Gráficos 3D** | ❌ **Não suportado** | Superset não traz `echarts-gl` nativamente; requer plugin custom |

### Veredicto

> **A única limitação real que bloqueia é o 3D.** Os pontos de zoom e cor de fundo são limitações menores com workarounds dentro do Superset. Todos os demais requisitos funcionam nativamente com a versão gratuita.

### Sobre o 3D — Alternativas

Se o gráfico 3D for obrigatório:

1. **Plugin customizado para o Superset** — Desenvolver um chart plugin usando `echarts-gl`. A arquitetura do Superset permite isso, mas exige build customizado do frontend. Esforço: **alto**.
2. **Componente separado** — Manter Superset para tudo (filtros, interação) e ter um componente React separado (fora do Superset) para o gráfico 3D, alimentado pela mesma base de dados. Esforço: **médio**.
3. **Deck.gl** — O Superset já inclui o plugin deck.gl que oferece visualizações 3D (hexagons, scatter). Não é ECharts 3D, mas pode atender dependendo do caso de uso. Esforço: **baixo**.

---

## Viabilidade por Abordagem (Referência Técnica)

### Abordagem 1: ECharts Direto no React (controle total)

| Requisito | Status | Como |
|-----------|--------|------|
| Cor de fundo dinâmica | ✅ | `chart.setOption({ backgroundColor })` |
| Gráficos 3D | ✅ | `echarts-gl` (scatter3D, bar3D, surface) |
| 1500+ valores | ✅ | `large: true` + `dataZoom` |
| Zoom | ✅ | dataZoom (slider, inside, toolbox) |
| Múltiplos triggers | ✅ | Eventos `chart.on('click')` + `dispatchAction` |
| Controle de update | ✅ | `setOption()` chamado apenas quando desejado |
| Prevenir duplicatas | ✅ | Debounce + AbortController + Semáforo |

**Prós:** Controle total, sem dependência de iframe, performance máxima.
**Contras:** Precisa implementar filtros/dashboards manualmente (o usuário não tem UI de exploração).

### Abordagem 2: Superset Embedded SDK (iframe)

| Requisito | Status | Limitação |
|-----------|--------|-----------|
| Cor de fundo dinâmica | ⚠️ | Só via CSS do dashboard, sem controle programático do host |
| Gráficos 3D | ❌ | Superset não traz echarts-gl nativamente |
| 1500+ valores | ✅ | Configurável via ROW_LIMIT |
| Zoom | ⚠️ | Depende do tipo de chart do Superset |
| Múltiplos triggers | ✅ | Cross-filter + Native Filters nativos |
| Controle de update | ⚠️ | Limitado ao que o SDK expõe |
| Prevenir duplicatas | ⚠️ | Superset tem debounce nativo, mas sem controle fino |

**Prós:** Dashboard pronto, filtros nativos, menor código, usuário interage livremente.
**Contras:** Controle limitado via iframe, sem 3D nativo, customização visual restrita.

### Abordagem 3: Superset API + ECharts (Híbrida)

Usar Superset como backend de dados (SQL Lab API / Chart Data API) e renderizar com ECharts no frontend.
Combina dados gerenciados pelo Superset com controle total de renderização.

---

## Parar o Ambiente

```bash
docker-compose down

# Para remover volumes (dados):
docker-compose down -v
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Superset não inicia | `docker-compose logs superset` - verificar erros |
| Erro de conexão ao DB | Aguardar PostgreSQL inicializar (~30s) |
| Gráfico não mostra dados | Verificar Row Limit no chart config |
| Filtros não funcionam | Habilitar DASHBOARD_CROSS_FILTERS |
| Performance lenta | Aumentar workers no docker-compose |
