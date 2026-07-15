import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 5: Múltiplos Pontos de Ativação
 * 
 * Valida:
 * - Click em item do gráfico → dispara ação
 * - Mudança de filtro (select) → atualiza gráfico
 * - Drill-down (click em categoria → detalhe)
 * - Click em lista externa → destaca no gráfico
 */
export function TestMultipleActivations() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [drillLevel, setDrillLevel] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Refs para evitar stale closures no event handler do ECharts
  const drillLevelRef = useRef(drillLevel);
  const selectedCategoryRef = useRef(selectedCategory);
  drillLevelRef.current = drillLevel;
  selectedCategoryRef.current = selectedCategory;

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-30), { timestamp: createTimestamp(), message, type }]);
  };

  // Dados hierárquicos para drill-down
  const hierarchyData: Record<string, Record<string, number[]>> = {
    'Electronics': { 'Phones': [120, 80, 95], 'Laptops': [200, 150, 180], 'Tablets': [60, 45, 70] },
    'Clothing': { 'Shirts': [90, 110, 85], 'Pants': [70, 65, 80], 'Shoes': [130, 95, 120] },
    'Food': { 'Snacks': [40, 55, 35], 'Beverages': [80, 90, 75], 'Fresh': [60, 70, 50] },
    'Sports': { 'Running': [100, 85, 110], 'Cycling': [75, 90, 80], 'Gym': [55, 60, 65] },
  };

  const renderLevel0 = () => {
    if (!instanceRef.current) return;
    const categories = Object.keys(hierarchyData);
    const filteredCats = filter === 'all' ? categories : categories.filter(c => c === filter);
    const values = filteredCats.map(cat => {
      const subs = Object.values(hierarchyData[cat]);
      return subs.reduce((sum, arr) => sum + arr.reduce((a, b) => a + b, 0), 0);
    });

    instanceRef.current.setOption({
      title: { text: 'Nível 0: Categorias (clique para drill-down)', left: 'center', textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: filteredCats },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: values, itemStyle: { color: '#1890ff' } }],
    }, { notMerge: true });
  };

  const renderLevel1 = (category: string) => {
    if (!instanceRef.current) return;
    const subs = hierarchyData[category];
    const subNames = Object.keys(subs);
    const values = subNames.map(s => subs[s].reduce((a, b) => a + b, 0));

    instanceRef.current.setOption({
      title: { text: `Nível 1: ${category} → Subcategorias (clique para detalhe)`, left: 'center', textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: subNames },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: values, itemStyle: { color: '#52c41a' } }],
    }, { notMerge: true });
  };

  const renderLevel2 = (category: string, sub: string) => {
    if (!instanceRef.current) return;
    const values = hierarchyData[category][sub];
    const months = ['Jan', 'Fev', 'Mar'];

    instanceRef.current.setOption({
      title: { text: `Nível 2: ${category} → ${sub} → Mensal`, left: 'center', textStyle: { fontSize: 13 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: months },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: values, itemStyle: { color: '#faad14' } }],
    }, { notMerge: true });
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    renderLevel0();

    // Evento de click no gráfico
    instanceRef.current.on('click', (params: any) => {
      addLog(`CLICK no gráfico: "${params.name}" (valor: ${params.value})`, 'info');

      const currentLevel = drillLevelRef.current;
      const currentCategory = selectedCategoryRef.current;

      if (currentLevel === 0) {
        setDrillLevel(1);
        setSelectedCategory(params.name);
        renderLevel1(params.name);
        addLog(`DRILL-DOWN: Nível 0 → Nível 1 (${params.name})`, 'warn');
      } else if (currentLevel === 1 && currentCategory) {
        setDrillLevel(2);
        renderLevel2(currentCategory, params.name);
        addLog(`DRILL-DOWN: Nível 1 → Nível 2 (${params.name})`, 'warn');
      }
    });

    addLog('Pontos de ativação: click no gráfico, filtro, lista, drill-down');

    return () => { instanceRef.current?.dispose(); };
  }, []);

  // Reação a mudança de filtro
  useEffect(() => {
    if (drillLevel === 0) {
      renderLevel0();
      addLog(`FILTRO alterado: ${filter}`, 'info');
    }
  }, [filter]);

  const handleDrillUp = () => {
    if (drillLevel === 2) {
      setDrillLevel(1);
      if (selectedCategory) renderLevel1(selectedCategory);
      addLog('DRILL-UP: Nível 2 → Nível 1', 'warn');
    } else if (drillLevel === 1) {
      setDrillLevel(0);
      setSelectedCategory(null);
      renderLevel0();
      addLog('DRILL-UP: Nível 1 → Nível 0', 'warn');
    }
  };

  // Click externo (lista) → highlight no gráfico
  const handleListClick = (item: string) => {
    addLog(`LISTA click: "${item}" → dispatchAction highlight`, 'info');
    instanceRef.current?.dispatchAction({
      type: 'highlight',
      name: item,
    });
    // Auto-remove highlight após 2s
    setTimeout(() => {
      instanceRef.current?.dispatchAction({ type: 'downplay', name: item });
    }, 2000);
  };

  const listItems = drillLevel === 0
    ? Object.keys(hierarchyData)
    : drillLevel === 1 && selectedCategory && hierarchyData[selectedCategory]
      ? Object.keys(hierarchyData[selectedCategory])
      : drillLevel === 2
        ? ['Jan', 'Fev', 'Mar']
        : Object.keys(hierarchyData);

  return (
    <section className="test-section">
      <h2>
        5. Múltiplos Pontos de Ativação
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Testa: click no gráfico (drill-down), mudança de filtros (select), click em lista externa (highlight).
        Nível atual: <strong>{drillLevel}</strong>
      </p>

      <div className="controls">
        <select value={filter} onChange={e => { setFilter(e.target.value); setDrillLevel(0); setSelectedCategory(null); }}>
          <option value="all">Filtro: Todas categorias</option>
          {Object.keys(hierarchyData).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={handleDrillUp} disabled={drillLevel === 0}>
          ← Drill Up (voltar nível)
        </button>
        <span style={{ fontSize: 12, color: '#666' }}>
          Lista (click para highlight):
        </span>
        {listItems.map(item => (
          <button key={item} onClick={() => handleListClick(item)} style={{ fontSize: 12 }}>
            {item}
          </button>
        ))}
      </div>

      <div className="chart-container" ref={chartRef} />

      <div className="log-panel">
        {logs.map((log, i) => (
          <div key={i} className={`log-entry ${log.type}`}>
            <span className="timestamp">{log.timestamp}</span>
            {log.message}
          </div>
        ))}
      </div>
    </section>
  );
}
