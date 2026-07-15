import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { generateBarData, createTimestamp, LogEntry } from '../utils';

/**
 * TESTE 7: Prevenir Ativações Duplicadas
 * 
 * Valida:
 * - Debounce de múltiplos cliques rápidos
 * - AbortController para cancelar requests anteriores
 * - Semáforo para evitar renders concorrentes
 * - Contagem de ativações reais vs bloqueadas
 */
export function TestPreventDuplicates() {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [actualUpdates, setActualUpdates] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [debounceMs, setDebounceMs] = useState(300);

  // Refs para controle de concorrência
  const isUpdatingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRequestIdRef = useRef(0);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-30), { timestamp: createTimestamp(), message, type }]);
  };

  useEffect(() => {
    if (!chartRef.current) return;
    instanceRef.current = echarts.init(chartRef.current);

    const data = generateBarData(50);
    instanceRef.current.setOption({
      title: { text: 'Teste: Prevenção de Duplicatas', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.categories },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.values, itemStyle: { color: '#1890ff' } }],
    });

    addLog('Gráfico inicializado. Clique rápido nos botões para testar prevenção de duplicatas.');

    return () => { instanceRef.current?.dispose(); };
  }, []);

  /**
   * Simula uma atualização assíncrona (como fetch de API)
   * com proteção contra duplicatas
   */
  const updateChartProtected = useCallback((source: string) => {
    setTotalAttempts(prev => prev + 1);

    // 1. DEBOUNCE: cancela timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      addLog(`[DEBOUNCE] Timer anterior cancelado (source: ${source})`, 'warn');
    }

    debounceTimerRef.current = setTimeout(async () => {
      // 2. SEMÁFORO: verifica se já está atualizando
      if (isUpdatingRef.current) {
        setBlocked(prev => prev + 1);
        addLog(`[BLOQUEADO] Update em andamento, descartando (source: ${source})`, 'error');
        return;
      }

      // 3. ABORT: cancela request anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        addLog(`[ABORT] Request anterior cancelado`, 'warn');
      }

      // 4. Novo request
      isUpdatingRef.current = true;
      abortControllerRef.current = new AbortController();
      const requestId = ++lastRequestIdRef.current;

      addLog(`[REQUEST #${requestId}] Iniciando update (source: ${source})...`, 'info');

      try {
        // Simula latência de API (200-500ms)
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 200 + Math.random() * 300);
          abortControllerRef.current!.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          });
        });

        // 5. STALE CHECK: verifica se este request ainda é o mais recente
        if (requestId !== lastRequestIdRef.current) {
          addLog(`[STALE] Request #${requestId} descartado (mais recente: #${lastRequestIdRef.current})`, 'error');
          setBlocked(prev => prev + 1);
          return;
        }

        // 6. Aplica update
        if (instanceRef.current) {
          const data = generateBarData(50);
          instanceRef.current.setOption({
            series: [{ data: data.values }],
            title: { text: `Update #${requestId} (via ${source})` },
          });
          setActualUpdates(prev => prev + 1);
          addLog(`[SUCESSO] Request #${requestId} aplicado ao gráfico`, 'info');
        }
      } catch (err: any) {
        if (err.message === 'Aborted') {
          setBlocked(prev => prev + 1);
          addLog(`[ABORTADO] Request #${requestId} foi cancelado`, 'error');
        }
      } finally {
        isUpdatingRef.current = false;
      }
    }, debounceMs);
  }, [debounceMs]);

  /**
   * Update SEM proteção (para comparação)
   */
  const updateChartUnprotected = () => {
    setTotalAttempts(prev => prev + 1);
    if (instanceRef.current) {
      const data = generateBarData(50);
      instanceRef.current.setOption({
        series: [{ data: data.values }],
        title: { text: `Update direto (sem proteção)` },
      });
      setActualUpdates(prev => prev + 1);
      addLog(`[DIRETO] Update aplicado SEM proteção`, 'warn');
    }
  };

  // Simula burst de cliques rápidos
  const simulateBurst = (count: number) => {
    addLog(`--- Simulando ${count} ativações rápidas ---`, 'warn');
    for (let i = 0; i < count; i++) {
      setTimeout(() => updateChartProtected(`burst-${i + 1}`), i * 50);
    }
  };

  const resetCounters = () => {
    setTotalAttempts(0);
    setActualUpdates(0);
    setBlocked(0);
    setLogs([]);
    addLog('Contadores resetados');
  };

  return (
    <section className="test-section">
      <h2>
        7. Prevenir Ativações Duplicadas
        <span className="status-badge success">FUNCIONA</span>
      </h2>
      <p className="description">
        Implementa 4 camadas de proteção: <strong>Debounce</strong> ({debounceMs}ms) → <strong>Semáforo</strong> → 
        <strong>AbortController</strong> → <strong>Stale Check</strong>. 
        Compare com update sem proteção.
      </p>

      <div className="controls">
        <div className="activation-counter">
          Tentativas: <strong>{totalAttempts}</strong>
        </div>
        <div className="activation-counter">
          Updates reais: <strong>{actualUpdates}</strong>
        </div>
        <div className={`activation-counter ${blocked > 0 ? 'duplicate' : ''}`}>
          Bloqueados: <strong>{blocked}</strong>
        </div>
        <select value={debounceMs} onChange={e => setDebounceMs(Number(e.target.value))}>
          <option value={100}>Debounce: 100ms</option>
          <option value={300}>Debounce: 300ms</option>
          <option value={500}>Debounce: 500ms</option>
          <option value={1000}>Debounce: 1000ms</option>
        </select>
        <button onClick={resetCounters}>Reset</button>
      </div>

      <div className="controls">
        <button onClick={() => updateChartProtected('click-manual')}>
          Update Protegido (1x)
        </button>
        <button onClick={() => simulateBurst(5)}>
          Simular 5 clicks rápidos
        </button>
        <button onClick={() => simulateBurst(10)}>
          Simular 10 clicks rápidos
        </button>
        <button onClick={() => simulateBurst(20)}>
          Simular 20 clicks rápidos
        </button>
        <button onClick={updateChartUnprotected} style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}>
          Update SEM proteção (comparação)
        </button>
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
