import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import 'echarts-gl';
import { generate3DData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 2: Gráficos em 3D usando ECharts GL
 * 
 * Valida se conseguimos renderizar gráficos 3D (scatter3D, bar3D, surface)
 * usando echarts-gl no frontend.
 */
export function Test3DChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [chartType, setChartType] = useState<'scatter3D' | 'bar3D' | 'surface'>('scatter3D');
  const [pointCount, setPointCount] = useState(500);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-20), { timestamp: createTimestamp(), message, type }]);
  };

  const renderChart = () => {
    if (!instanceRef.current) return;

    const startTime = performance.now();

    if (chartType === 'scatter3D') {
      const data = generate3DData(pointCount);
      instanceRef.current.setOption({
        tooltip: {},
        xAxis3D: { type: 'value', name: 'X' },
        yAxis3D: { type: 'value', name: 'Y' },
        zAxis3D: { type: 'value', name: 'Z' },
        grid3D: {
          viewControl: {
            autoRotate: false,
            projection: 'perspective',
          },
          light: {
            main: { intensity: 1.2 },
            ambient: { intensity: 0.3 },
          },
        },
        series: [{
          type: 'scatter3D',
          data: data.map(d => ({
            value: [d[0], d[1], d[2]],
            itemStyle: {
              color: ['#1890ff', '#52c41a', '#faad14', '#f5222d'][d[3]],
            },
          })),
          symbolSize: 8,
          itemStyle: { opacity: 0.8 },
        }],
      }, { notMerge: true });
    } else if (chartType === 'bar3D') {
      const data: number[][] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          data.push([i, j, Math.random() * 100]);
        }
      }
      instanceRef.current.setOption({
        tooltip: {},
        xAxis3D: { type: 'category', data: Array.from({ length: 10 }, (_, i) => `Cat ${i}`) },
        yAxis3D: { type: 'category', data: Array.from({ length: 10 }, (_, i) => `Grp ${i}`) },
        zAxis3D: { type: 'value', name: 'Valor' },
        grid3D: {
          viewControl: { autoRotate: false },
          light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } },
        },
        series: [{
          type: 'bar3D',
          data: data.map(d => ({ value: d })),
          shading: 'lambert',
          itemStyle: { opacity: 0.85 },
        }],
      }, { notMerge: true });
    } else if (chartType === 'surface') {
      const data: number[][] = [];
      for (let i = -3; i <= 3; i += 0.2) {
        for (let j = -3; j <= 3; j += 0.2) {
          const z = Math.sin(i * i + j * j) / (i * i + j * j + 0.1) * 10;
          data.push([i, j, z]);
        }
      }
      instanceRef.current.setOption({
        tooltip: {},
        xAxis3D: { type: 'value' },
        yAxis3D: { type: 'value' },
        zAxis3D: { type: 'value' },
        grid3D: {
          viewControl: { autoRotate: true, autoRotateSpeed: 5 },
        },
        series: [{
          type: 'surface',
          data,
          wireframe: { show: true },
          shading: 'color',
          itemStyle: { color: '#1890ff', opacity: 0.7 },
        }],
      }, { notMerge: true });
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    addLog(`Renderizado ${chartType} com ${pointCount} pontos em ${elapsed}ms`);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    addLog('ECharts GL inicializado');
    renderChart();

    return () => { instanceRef.current?.dispose(); };
  }, []);

  useEffect(() => {
    renderChart();
  }, [chartType, pointCount]);

  return (
    <section className="test-section">
      <h2>
        2. Gráficos em 3D (ECharts GL)
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Testa renderização 3D via <code>echarts-gl</code>: Scatter3D, Bar3D e Surface.
        Suporta rotação, zoom e pan com mouse. Se integrado com Superset, requer plugin customizado.
      </p>

      <div className="controls">
        <button className={chartType === 'scatter3D' ? 'active' : ''} onClick={() => setChartType('scatter3D')}>
          Scatter 3D
        </button>
        <button className={chartType === 'bar3D' ? 'active' : ''} onClick={() => setChartType('bar3D')}>
          Bar 3D
        </button>
        <button className={chartType === 'surface' ? 'active' : ''} onClick={() => setChartType('surface')}>
          Surface
        </button>
        <select value={pointCount} onChange={e => setPointCount(Number(e.target.value))}>
          <option value={100}>100 pontos</option>
          <option value={500}>500 pontos</option>
          <option value={1000}>1000 pontos</option>
          <option value={2000}>2000 pontos</option>
          <option value={5000}>5000 pontos</option>
        </select>
      </div>

      <div className="chart-container chart-3d" ref={chartRef} />

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
