import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { generateBarData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 6: Controle Preciso sobre Quando Atualizar
 * 
 * Valida:
 * - Atualização manual (botão "Apply")
 * - Atualização automática desabilitável
 * - Batching de múltiplas mudanças antes de aplicar
 * - Refresh programático via API
 */
export function TestUpdateControl() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<string[]>([]);
  const [dataCount, setDataCount] = useState(100);
  const [colorScheme, setColorScheme] = useState('#1890ff');
  const [chartTitle, setChartTitle] = useState('Gráfico Controlado');
  const [updateCount, setUpdateCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-20), { timestamp: createTimestamp(), message, type }]);
  };

  const applyChanges = useCallback(() => {
    if (!instanceRef.current) return;

    const startTime = performance.now();
    const data = generateBarData(dataCount);

    instanceRef.current.setOption({
      title: { text: chartTitle, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.categories },
      yAxis: { type: 'value' },
      dataZoom: [{ type: 'slider', start: 0, end: 100 }],
      series: [{
        type: 'bar',
        data: data.values,
        itemStyle: { color: colorScheme },
        large: true,
      }],
    }, { notMerge: true });

    const elapsed = (performance.now() - startTime).toFixed(1);
    setUpdateCount(prev => prev + 1);
    setPendingChanges([]);
    addLog(`UPDATE #${updateCount + 1} aplicado (${pendingChanges.length} changes batched) em ${elapsed}ms`, 'info');
  }, [dataCount, colorScheme, chartTitle, updateCount, pendingChanges]);

  // Registrar mudança pendente (sem aplicar imediatamente)
  const registerChange = (description: string) => {
    setPendingChanges(prev => [...prev, description]);
    addLog(`Mudança registrada: "${description}" (pendente)`, 'warn');

    if (autoUpdate) {
      // Em modo auto, aplica imediatamente (comportamento que queremos CONTROLAR)
      addLog('Auto-update ATIVO: aplicando imediatamente', 'warn');
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    applyChanges();
    addLog('Modo: atualização MANUAL (click "Apply" para atualizar)');

    return () => { instanceRef.current?.dispose(); };
  }, []);

  // Auto-update: se habilitado, aplica mudanças automaticamente
  useEffect(() => {
    if (autoUpdate && pendingChanges.length > 0) {
      const timer = setTimeout(() => {
        applyChanges();
      }, 500); // debounce de 500ms
      return () => clearTimeout(timer);
    }
  }, [autoUpdate, pendingChanges, applyChanges]);

  return (
    <section className="test-section">
      <h2>
        6. Controle Preciso sobre Atualização
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Demonstra controle total: mudanças ficam em fila (pendentes) até clicar "Apply".
        Modo auto-update com debounce de 500ms. Total updates: <strong>{updateCount}</strong>.
        Pendentes: <strong>{pendingChanges.length}</strong>
      </p>

      <div className="controls">
        <button
          className={autoUpdate ? 'active' : ''}
          onClick={() => {
            setAutoUpdate(!autoUpdate);
            addLog(`Auto-update: ${!autoUpdate ? 'ATIVADO' : 'DESATIVADO'}`, 'warn');
          }}
        >
          Auto-update: {autoUpdate ? 'ON' : 'OFF'}
        </button>
        <button
          className="apply-btn"
          onClick={applyChanges}
          disabled={pendingChanges.length === 0 && !autoUpdate}
        >
          Apply ({pendingChanges.length} pendentes)
        </button>
      </div>

      <div className="filter-panel">
        <div className="filter-group">
          <label>Qtd. Dados</label>
          <select
            value={dataCount}
            onChange={e => {
              setDataCount(Number(e.target.value));
              registerChange(`dataCount → ${e.target.value}`);
            }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Cor</label>
          <input
            type="color"
            value={colorScheme}
            onChange={e => {
              setColorScheme(e.target.value);
              registerChange(`color → ${e.target.value}`);
            }}
          />
        </div>
        <div className="filter-group">
          <label>Título</label>
          <input
            type="text"
            value={chartTitle}
            onChange={e => {
              setChartTitle(e.target.value);
              registerChange(`title → ${e.target.value}`);
            }}
            style={{ width: 200 }}
          />
        </div>
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
