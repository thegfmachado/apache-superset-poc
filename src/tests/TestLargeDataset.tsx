import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { generateBarData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 3: Gráficos com 500-1500+ valores em uma série
 * 
 * Valida performance e visibilidade de bar charts com grande volume de dados,
 * incluindo ordenação e scroll.
 */
export function TestLargeDataset() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [dataCount, setDataCount] = useState(500);
  const [renderTime, setRenderTime] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-20), { timestamp: createTimestamp(), message, type }]);
  };

  const renderChart = (count: number) => {
    if (!instanceRef.current) return;

    const startTime = performance.now();
    const data = generateBarData(count);
    const elapsed = performance.now() - startTime;

    const renderStart = performance.now();
    instanceRef.current.setOption({
      title: {
        text: `Bar Chart: ${count} valores (ordenados desc)`,
        left: 'center',
        textStyle: { fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: 60, right: 30, bottom: 80, top: 50 },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLabel: {
          rotate: 90,
          fontSize: count > 500 ? 8 : 10,
          interval: count > 1000 ? Math.floor(count / 50) : 0,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: (v: number) => `${(v / 1000).toFixed(0)}k` },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          start: 0,
          end: count > 500 ? 20 : 100,
          bottom: 10,
        },
        {
          type: 'inside',
          xAxisIndex: 0,
        },
      ],
      series: [{
        type: 'bar',
        data: data.values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#096dd9' },
          ]),
        },
        large: true,
        largeThreshold: 500,
      }],
    }, { notMerge: true });

    const totalElapsed = performance.now() - renderStart;
    setRenderTime(totalElapsed);
    addLog(`Geração: ${elapsed.toFixed(1)}ms | Render: ${totalElapsed.toFixed(1)}ms | ${count} barras`, 
      totalElapsed > 1000 ? 'warn' : 'info');
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    renderChart(dataCount);

    return () => { instanceRef.current?.dispose(); };
  }, []);

  const handleCountChange = (count: number) => {
    setDataCount(count);
    renderChart(count);
  };

  return (
    <section className="test-section">
      <h2>
        3. Gráficos com 1500+ Valores
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Testa bar chart com alto volume de dados. ECharts suporta modo <code>large: true</code> para 
        otimizar renderização. DataZoom permite navegar por todos os valores.
        Render time: <strong>{renderTime.toFixed(0)}ms</strong>
      </p>

      <div className="controls">
        {[500, 1000, 1500, 2000, 3000, 5000].map(n => (
          <button
            key={n}
            className={dataCount === n ? 'active' : ''}
            onClick={() => handleCountChange(n)}
          >
            {n} valores
          </button>
        ))}
      </div>

      <div className="chart-container large" ref={chartRef} />

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
