# POC EIS - Apache Superset / ECharts

## Objetivo

Validar se conseguimos atender aos requisitos de controle de gráficos no frontend usando o **ECharts** (mesma engine de gráficos utilizada pelo Apache Superset).

Esta POC é um app React interativo onde cada requisito tem um teste dedicado com controles e logs de eventos.

## Quick Start

```bash
npm install
npm run dev
# Acessar http://localhost:3000
```

## Deploy (Vercel)

O app roda 100% client-side (sem backend). Para deploy na Vercel, basta conectar o repositório — o `vercel.json` já está configurado.

## Estrutura

```
├── src/
│   ├── App.tsx                           # Navegação entre testes
│   ├── utils.ts                          # Helpers (geração de dados, tipos)
│   └── tests/
│       ├── TestBackgroundColor.tsx        # Req 1: Cor de fundo dinâmica
│       ├── Test3DChart.tsx               # Req 2: Gráficos 3D (echarts-gl)
│       ├── TestLargeDataset.tsx          # Req 3: 1500+ valores
│       ├── TestZoom.tsx                  # Req 4: Zoom
│       ├── TestMultipleActivations.tsx   # Req 5: Múltiplos triggers
│       ├── TestUpdateControl.tsx         # Req 6: Controle de update
│       └── TestPreventDuplicates.tsx     # Req 7: Prevenir duplicatas
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vercel.json
```

---

## Resultado da Validação

### Usando ECharts direto no React (esta POC)

| Requisito | Status | Como funciona |
|-----------|--------|---------------|
| Alterar cor de fundo dinamicamente | ✅ | `chart.setOption({ backgroundColor })` em runtime |
| Gráficos 3D | ✅ | `echarts-gl` — Scatter3D, Bar3D, Surface |
| 1500+ valores ordenados e visíveis | ✅ | `large: true` + `dataZoom` para navegação |
| Zoom | ✅ | Slider, scroll do mouse, seleção de área, zoom programático |
| Múltiplos pontos de ativação | ✅ | `chart.on('click')` + `dispatchAction` + drill-down |
| Controle preciso de quando atualizar | ✅ | Fila de mudanças + botão Apply (atualiza só quando desejado) |
| Prevenir ativações duplicadas | ✅ | Debounce + AbortController + semáforo + stale check |

**Todos os 7 requisitos são atendidos.**

---

### Se usar o Apache Superset como UI interativa (usuário manipula filtros/eixos pela interface)

| Requisito | Status | Detalhe |
|-----------|--------|---------|
| Filtros dinâmicos | ✅ | Native Filters — usuário adiciona/remove pela UI |
| Trocar colunas/eixos na interface | ✅ | "Explore" view permite arrastar métricas e dimensões |
| Adicionar séries ao gráfico via UI | ✅ | Usuário adiciona métricas/breakdowns sem código |
| 1500+ valores | ✅ | Configurar `ROW_LIMIT` no Superset |
| Múltiplos triggers (cross-filter, drill) | ✅ | Click em chart filtra os outros automaticamente |
| Controle de update (Apply button) | ✅ | Desabilitar "instant apply" → botão Apply manual |
| Prevenir duplicatas | ✅ | Botão Apply + debounce nativo |
| Zoom | ⚠️ Parcial | Funciona em Line/Bar, não é universal |
| Cor de fundo dinâmica | ⚠️ Parcial | Via CSS no dashboard, sem color picker livre |
| **Gráficos 3D** | ❌ **Bloqueante** | Superset não traz `echarts-gl`; requer plugin custom |

### Veredicto

> **A única limitação real que bloqueia no Superset é o 3D.** Zoom e cor de fundo têm workarounds. Os demais requisitos funcionam nativamente na versão gratuita.

### Alternativas para 3D no Superset

1. **Plugin customizado** — Desenvolver chart plugin com `echarts-gl`. Esforço: **alto** (requer build custom do frontend do Superset).
2. **Componente separado** — Usar Superset para tudo e um componente React externo para 3D. Esforço: **médio**.
3. **Deck.gl** — Plugin já incluído no Superset com algumas visualizações 3D (hexagons, scatter). Esforço: **baixo**.

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
