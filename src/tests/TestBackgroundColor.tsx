import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { generateBarData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 1: Alterar cor de fundo do gráfico dinamicamente
 * 
 * Valida se é possível mudar o background do gráfico em runtime
 * via interação do usuário (sem recarregar).
 */
export function TestBackgroundColor() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [chartBgColor, setChartBgColor] = useState('#f5f5f5');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-20), { timestamp: createTimestamp(), message, type }]);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);

    const data = generateBarData(20);
    instanceRef.current.setOption({
      backgroundColor: chartBgColor,
      title: { text: 'Teste: Cor de Fundo Dinâmica', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.categories },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.values, itemStyle: { color: '#1890ff' } }],
    });

    addLog('Gráfico inicializado');

    return () => { instanceRef.current?.dispose(); };
  }, []);

  const handleBgChange = (color: string) => {
    setBgColor(color);
    addLog(`Container background alterado para: ${color}`);
  };

  const handleChartBgChange = (color: string) => {
    setChartBgColor(color);
    if (instanceRef.current) {
      instanceRef.current.setOption({ backgroundColor: color });
      addLog(`Chart backgroundColor alterado para: ${color}`, 'info');
    }
  };

  const presetColors = ['#ffffff', '#1a1a2e', '#0f3460', '#f0f8ff', '#fff8e1', '#e8f5e9'];

  return (
    <section className="test-section">
      <h2>
        1. Alterar Cor de Fundo Dinamicamente
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Testa se o ECharts permite alterar <code>backgroundColor</code> do gráfico em runtime 
        via <code>setOption()</code>, sem recriar a instância.
      </p>

      <div className="controls">
        <div className="color-picker-row">
          <label>Background Container:</label>
          <input type="color" value={bgColor} onChange={e => handleBgChange(e.target.value)} />
        </div>
        <div className="color-picker-row">
          <label>Background Gráfico:</label>
          <input type="color" value={chartBgColor} onChange={e => handleChartBgChange(e.target.value)} />
        </div>
        <span style={{ color: '#999', fontSize: 12 }}>Presets:</span>
        {presetColors.map(c => (
          <button
            key={c}
            onClick={() => handleChartBgChange(c)}
            style={{ width: 28, height: 28, background: c, border: '2px solid #d9d9d9', padding: 0, borderRadius: 4 }}
            title={c}
          />
        ))}
      </div>

      <div style={{ backgroundColor: bgColor, padding: 12, borderRadius: 8 }}>
        <div className="chart-container" ref={chartRef} />
      </div>

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
