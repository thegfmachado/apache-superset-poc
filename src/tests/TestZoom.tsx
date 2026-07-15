import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { generateTimeSeriesData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 4: Suporte a Zoom
 * 
 * Valida os diferentes tipos de zoom disponíveis no ECharts:
 * - DataZoom slider (barra inferior)
 * - DataZoom inside (scroll do mouse)
 * - Toolbox zoom (seleção de área)
 */
export function TestZoom() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-20), { timestamp: createTimestamp(), message, type }]);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);

    const data = generateTimeSeriesData(730); // 2 anos de dados diários

    instanceRef.current.setOption({
      title: { text: 'Zoom: Slider + Scroll + Área de Seleção', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom Área', back: 'Reset Zoom' } },
          restore: { title: 'Restaurar' },
          saveAsImage: { title: 'Salvar' },
        },
      },
      grid: { left: 60, right: 30, bottom: 100, top: 60 },
      xAxis: {
        type: 'category',
        data: data.map(d => d[0]),
        axisLabel: { rotate: 45 },
      },
      yAxis: { type: 'value', name: 'Valor' },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          start: 0,
          end: 30,
          bottom: 10,
          height: 30,
        },
        {
          type: 'inside',
          xAxisIndex: 0,
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          right: 10,
          width: 20,
        },
      ],
      series: [
        {
          name: 'Valor',
          type: 'line',
          data: data.map(d => d[1]),
          smooth: true,
          areaStyle: { opacity: 0.3 },
          lineStyle: { width: 2 },
          itemStyle: { color: '#1890ff' },
        },
      ],
    });

    // Escutar eventos de zoom
    instanceRef.current.on('dataZoom', (params: any) => {
      const start = params.start ?? params.batch?.[0]?.start ?? 0;
      const end = params.end ?? params.batch?.[0]?.end ?? 100;
      setZoomRange({ start: Math.round(start), end: Math.round(end) });
      addLog(`Zoom alterado: ${Math.round(start)}% - ${Math.round(end)}%`);
    });

    addLog('Gráfico com 730 pontos (2 anos). Use: scroll, slider, ou toolbox para zoom.');

    return () => { instanceRef.current?.dispose(); };
  }, []);

  const resetZoom = () => {
    instanceRef.current?.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    addLog('Zoom resetado para 100%');
  };

  const zoomToRange = (start: number, end: number) => {
    instanceRef.current?.dispatchAction({ type: 'dataZoom', start, end });
    addLog(`Zoom programático: ${start}% - ${end}%`);
  };

  return (
    <section className="test-section">
      <h2>
        4. Suporte a Zoom
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Três tipos de zoom: <strong>Slider</strong> (barra), <strong>Inside</strong> (scroll mouse), 
        <strong>Toolbox</strong> (seleção de área). Zoom atual: {zoomRange.start}% - {zoomRange.end}%.
        Também demonstra <strong>zoom programático</strong> via API.
      </p>

      <div className="controls">
        <button onClick={resetZoom}>Reset Zoom (100%)</button>
        <button onClick={() => zoomToRange(0, 10)}>Zoom 0-10%</button>
        <button onClick={() => zoomToRange(25, 50)}>Zoom 25-50%</button>
        <button onClick={() => zoomToRange(80, 100)}>Zoom 80-100%</button>
        <span style={{ fontSize: 12, color: '#999' }}>
          Use scroll do mouse no gráfico ou o ícone de zoom no toolbox (canto superior direito)
        </span>
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
