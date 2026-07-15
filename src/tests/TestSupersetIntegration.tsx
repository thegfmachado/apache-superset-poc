import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import {
  login,
  getDashboards,
  getDatasets,
  getCharts,
  getDatabases,
  getChartData,
} from '../supersetApi';
import { createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 8: Integração com Superset Real
 *
 * Conecta ao Superset da empresa, busca dados via API REST
 * e renderiza usando ECharts com todos os controles da POC.
 */
export function TestSupersetIntegration() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');

  const [databases, setDatabases] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<number | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-30), { timestamp: createTimestamp(), message, type }]);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);
    instanceRef.current.setOption({
      title: { text: 'Conecte ao Superset para visualizar dados', left: 'center', top: 'center', textStyle: { fontSize: 14, color: '#999' } },
    });
    return () => { instanceRef.current?.dispose(); };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    addLog(`Conectando ao Superset como "${username}"...`);

    const ok = await login(username, password);
    if (ok) {
      setConnected(true);
      addLog('Conectado com sucesso!', 'info');

      const [dbs, ds, ch, dash] = await Promise.all([
        getDatabases(),
        getDatasets(),
        getCharts(),
        getDashboards(),
      ]);
      setDatabases(dbs);
      setDatasets(ds);
      setCharts(ch);
      setDashboards(dash);
      addLog(`Encontrado: ${dbs.length} databases, ${ds.length} datasets, ${ch.length} charts, ${dash.length} dashboards`);
      if (ch.length > 0) {
        const withDatasource = ch.filter((c: any) => c.datasource_id);
        addLog(`Charts com datasource: ${withDatasource.length} de ${ch.length}`);
      }

    } else {
      addLog('Falha na conexão. Verifique credenciais e se o Superset está acessível.', 'error');
    }
    setConnecting(false);
  };

  /** Mapeia viz_type do Superset → tipo ECharts */
  const vizTypeToECharts = (vizType: string): string => {
    const map: Record<string, string> = {
      // Barras
      'echarts_bar': 'bar', 'dist_bar': 'bar', 'bar': 'bar',
      'echarts_timeseries_bar': 'bar', 'histogram': 'bar',
      // Linhas
      'echarts_timeseries_line': 'line', 'echarts_timeseries': 'line',
      'line': 'line', 'echarts_area': 'line', 'area': 'line',
      'echarts_timeseries_smooth': 'line', 'smooth': 'line',
      // Pizza/Donut
      'echarts_pie': 'pie', 'pie': 'pie', 'donut': 'pie',
      // Scatter
      'echarts_scatter': 'scatter', 'scatter': 'scatter', 'bubble': 'scatter',
      // Funil
      'echarts_funnel': 'funnel', 'funnel': 'funnel',
      // Gauge
      'echarts_gauge': 'gauge', 'gauge': 'gauge',
      // Radar
      'echarts_radar': 'radar', 'radar': 'radar',
      // Treemap
      'echarts_treemap': 'treemap', 'treemap': 'treemap',
      // Sunburst
      'echarts_sunburst': 'sunburst', 'sunburst': 'sunburst',
      // Tabela
      'table': 'table', 'pivot_table': 'table', 'pivot_table_v2': 'table',
      // Big Number
      'big_number': 'big_number', 'big_number_total': 'big_number',
    };
    return map[vizType] ?? 'bar';
  };

  const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

  const handleLoadChart = async () => {
    if (!selectedChart) return;
    setLoadingChart(true);
    const chartListInfo = charts.find(c => c.id === selectedChart);
    const vizType = chartListInfo?.viz_type ?? 'bar';
    const echartsType = vizTypeToECharts(vizType);
    const chartName = chartListInfo?.slice_name ?? `Chart #${selectedChart}`;

    addLog(`Carregando [${vizType} → ${echartsType}] "${chartName}"...`);

    try {
      const response = await getChartData(selectedChart, chartListInfo);

      const resultArray = response.result ?? [];
      const queryResult = resultArray[0] ?? response;
      const rows = queryResult.data ?? [];
      const colNames: string[] = queryResult.colnames
        ?? queryResult.columns?.map?.((c: any) => typeof c === 'string' ? c : c.name)
        ?? (rows.length > 0 ? Object.keys(rows[0]) : []);

      if (rows.length === 0) {
        addLog(`Chart retornou sem dados. Viz: ${vizType}`, 'warn');
        setLoadingChart(false);
        return;
      }

      const firstRow = rows[0];
      const numericCols = colNames.filter((c: string) => typeof firstRow[c] === 'number');
      const stringCols = colNames.filter((c: string) => typeof firstRow[c] === 'string');
      const catCol = stringCols[0];

      addLog(`${rows.length} linhas | categorias: [${stringCols.join(', ')}] | métricas: [${numericCols.join(', ')}]`);

      const baseOption: any = {
        title: { text: chartName, subtext: `Tipo: ${vizType}`, left: 'center', textStyle: { fontSize: 14 }, subtextStyle: { fontSize: 11, color: '#999' }, itemGap: 8, top: 8 },
        tooltip: {},
        toolbox: { feature: { saveAsImage: {}, dataZoom: {} }, top: 4, right: 12 },
      };

      // ─── PIE / DONUT ───
      if (echartsType === 'pie') {
        const valCol = numericCols[0];
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: { top: 65, type: 'scroll' },
          series: [{
            type: 'pie',
            radius: vizType === 'donut' ? ['40%', '70%'] : '60%',
            top: 80,
            data: rows.map((r: any, i: number) => ({
              name: catCol ? String(r[catCol]) : `Item ${i + 1}`,
              value: valCol ? Number(r[valCol]) || 0 : 1,
              itemStyle: { color: COLORS[i % COLORS.length] },
            })),
            label: { formatter: '{b}: {d}%' },
          }],
        }, { notMerge: true });

      // ─── GAUGE ───
      } else if (echartsType === 'gauge') {
        const val = numericCols.length > 0 ? Number(rows[0][numericCols[0]]) : 0;
        instanceRef.current?.setOption({
          ...baseOption,
          series: [{
            type: 'gauge',
            data: [{ value: val, name: numericCols[0] ?? 'Value' }],
            detail: { formatter: '{value}' },
          }],
        }, { notMerge: true });

      // ─── FUNNEL ───
      } else if (echartsType === 'funnel') {
        const valCol = numericCols[0];
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { trigger: 'item', formatter: '{b}: {c}' },
          legend: { top: 65, type: 'scroll' },
          series: [{
            type: 'funnel',
            top: 90,
            data: rows.map((r: any, i: number) => ({
              name: catCol ? String(r[catCol]) : `Step ${i + 1}`,
              value: valCol ? Number(r[valCol]) || 0 : rows.length - i,
            })).sort((a: any, b: any) => b.value - a.value),
          }],
        }, { notMerge: true });

      // ─── RADAR ───
      } else if (echartsType === 'radar') {
        const indicators = numericCols.map(col => ({
          name: col,
          max: Math.max(...rows.map((r: any) => Number(r[col]) || 0)) * 1.2,
        }));
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: {},
          legend: { top: 65, type: 'scroll' },
          radar: { indicator: indicators, top: 90 },
          series: [{
            type: 'radar',
            data: rows.slice(0, 10).map((r: any, i: number) => ({
              name: catCol ? String(r[catCol]) : `Item ${i + 1}`,
              value: numericCols.map(col => Number(r[col]) || 0),
              lineStyle: { color: COLORS[i % COLORS.length] },
              itemStyle: { color: COLORS[i % COLORS.length] },
            })),
          }],
        }, { notMerge: true });

      // ─── TREEMAP ───
      } else if (echartsType === 'treemap') {
        const valCol = numericCols[0];
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { formatter: '{b}: {c}' },
          series: [{
            type: 'treemap',
            data: rows.map((r: any, i: number) => ({
              name: catCol ? String(r[catCol]) : `Item ${i + 1}`,
              value: valCol ? Number(r[valCol]) || 0 : 1,
              itemStyle: { color: COLORS[i % COLORS.length] },
            })),
          }],
        }, { notMerge: true });

      // ─── SCATTER ───
      } else if (echartsType === 'scatter') {
        const xCol = numericCols[0];
        const yCol = numericCols[1] ?? numericCols[0];
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { trigger: 'item' },
          xAxis: { type: 'value', name: xCol },
          yAxis: { type: 'value', name: yCol },
          dataZoom: [{ type: 'slider' }, { type: 'inside' }],
          series: [{
            type: 'scatter',
            data: rows.map((r: any) => [Number(r[xCol]) || 0, Number(r[yCol]) || 0]),
            symbolSize: 8,
            itemStyle: { color: '#1890ff', opacity: 0.7 },
          }],
        }, { notMerge: true });

      // ─── BIG NUMBER ───
      } else if (echartsType === 'big_number') {
        const val = numericCols.length > 0 ? Number(rows[0][numericCols[0]]) : rows.length;
        const label = numericCols[0] ?? 'Total';
        instanceRef.current?.setOption({
          ...baseOption,
          title: { text: String(val), subtext: label, left: 'center', top: 'center', textStyle: { fontSize: 48, color: '#1890ff' }, subtextStyle: { fontSize: 16 } },
        }, { notMerge: true });

      // ─── TABLE (mostrar como bar) ───
      } else if (echartsType === 'table' && numericCols.length > 0 && catCol) {
        const categories = rows.map((r: any) => String(r[catCol]));
        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          grid: { left: 60, right: 30, bottom: 80, top: numericCols.length > 1 ? 80 : 60 },
          xAxis: { type: 'category', data: categories, axisLabel: { rotate: 45, fontSize: 10, interval: Math.max(0, Math.floor(categories.length / 30) - 1) } },
          yAxis: { type: 'value' },
          dataZoom: [{ type: 'slider', start: 0, end: categories.length > 100 ? 20 : 100 }, { type: 'inside' }],
          legend: numericCols.length > 1 ? { top: 50, type: 'scroll' } : undefined,
          series: numericCols.map((col: string, i: number) => ({
            name: col, type: 'bar', data: rows.map((r: any) => Number(r[col]) || 0),
            itemStyle: { color: COLORS[i % COLORS.length] }, large: true,
          })),
        }, { notMerge: true });

      // ─── BAR / LINE / FALLBACK ───
      } else {
        const isLine = echartsType === 'line';
        const categories = catCol
          ? rows.map((r: any) => String(r[catCol]))
          : rows.map((_: any, i: number) => String(i + 1));

        instanceRef.current?.setOption({
          ...baseOption,
          tooltip: { trigger: 'axis', axisPointer: { type: isLine ? 'cross' : 'shadow' } },
          grid: { left: 60, right: 30, bottom: 80, top: numericCols.length > 1 ? 80 : 60 },
          xAxis: { type: 'category', data: categories, axisLabel: { rotate: 45, fontSize: 10, interval: Math.max(0, Math.floor(categories.length / 30) - 1) } },
          yAxis: { type: 'value' },
          dataZoom: [{ type: 'slider', start: 0, end: categories.length > 100 ? 20 : 100 }, { type: 'inside' }],
          legend: numericCols.length > 1 ? { top: 50, type: 'scroll' } : undefined,
          series: numericCols.map((col: string, i: number) => ({
            name: col,
            type: isLine ? 'line' : 'bar',
            data: rows.map((r: any) => Number(r[col]) || 0),
            smooth: isLine,
            areaStyle: isLine && vizType.includes('area') ? { opacity: 0.3 } : undefined,
            itemStyle: { color: COLORS[i % COLORS.length] },
            large: true,
          })),
        }, { notMerge: true });
      }

      addLog(`Renderizado como ${echartsType}: ${rows.length} linhas`, 'info');
    } catch (err: any) {
      addLog(`Erro: ${err.message}`, 'error');
    }
    setLoadingChart(false);
  };

  return (
    <section className="test-section">
      <h2>
        8. Integração com Superset Real
        <span className={`status-badge ${connected ? 'success' : 'partial'}`}>
          {connected ? 'CONECTADO' : 'DESCONECTADO'}
        </span>
      </h2>
      <p className="description">
        Conecta ao Superset da empresa, busca dados reais via API REST
        e renderiza com ECharts — validando que os mesmos controles funcionam com dados de produção.
      </p>

      {!isLocal && !connected && (
        <div style={{ padding: 20, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          <strong>⚠ Disponível apenas em desenvolvimento local</strong>
          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Este teste conecta ao Superset via proxy do Vite (<code>npm run dev</code>) na rede interna.
            Na Vercel ou outros deploys externos, o Superset não é acessível.
            Execute <code>npm run dev</code> localmente para testar.
          </p>
        </div>
      )}

      {!connected && isLocal ? (
        <div className="superset-login-card">
          <div className="superset-login-icon">📊</div>
          <h3 className="superset-login-title">Conectar ao Apache Superset</h3>
          <p className="superset-login-subtitle">Insira as credenciais para acessar os charts e dashboards</p>
          <div className="superset-login-fields">
            <div className="superset-field">
              <label>Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
            </div>
            <div className="superset-field">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
            </div>
          </div>
          <button className="superset-connect-btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <><span className="superset-spinner" /> Conectando...</>
            ) : (
              'Conectar'
            )}
          </button>
        </div>
      ) : connected ? (
        <>
          {/* Stats */}
          <div className="superset-stats">
            <div className="superset-stat">
              <span className="superset-stat-value">{charts.filter((c: any) => c.datasource_id).length}</span>
              <span className="superset-stat-label">Charts</span>
            </div>
            <div className="superset-stat">
              <span className="superset-stat-value">{dashboards.length}</span>
              <span className="superset-stat-label">Dashboards</span>
            </div>
            <div className="superset-stat">
              <span className="superset-stat-value">{datasets.length}</span>
              <span className="superset-stat-label">Datasets</span>
            </div>
          </div>

          {/* Chart selector */}
          {charts.length > 0 && (
            <div className="superset-chart-selector">
              <div className="superset-select-wrapper">
                <label>Selecionar Chart</label>
                <select
                  value={selectedChart ?? ''}
                  onChange={e => setSelectedChart(Number(e.target.value))}
                >
                  <option value="">Escolher um chart...</option>
                  {charts
                    .filter((c: any) => c.datasource_id)
                    .map(ch => (
                      <option key={ch.id} value={ch.id}>
                        [{ch.viz_type}] {ch.slice_name}
                      </option>
                    ))}
                </select>
              </div>
              <button
                className="superset-load-btn"
                onClick={handleLoadChart}
                disabled={!selectedChart || loadingChart}
              >
                {loadingChart ? (
                  <><span className="superset-spinner" /> Carregando...</>
                ) : (
                  '▶ Carregar'
                )}
              </button>
            </div>
          )}

          {/* Dashboards */}
          {dashboards.length > 0 && (
            <div className="superset-dashboards">
              <label>Dashboards</label>
              <div className="superset-dashboard-chips">
                {dashboards.map(d => (
                  <a
                    key={d.id}
                    href={`http://172.16.252.111:8088/superset/dashboard/${d.id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="superset-chip"
                  >
                    {d.dashboard_title} ↗
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Chart area with loading overlay */}
      <div className="superset-chart-area">
        {loadingChart && (
          <div className="superset-loading-overlay">
            <div className="superset-loading-spinner" />
            <span>Carregando dados do Superset...</span>
          </div>
        )}
        <div className="chart-container large" ref={chartRef} />
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
