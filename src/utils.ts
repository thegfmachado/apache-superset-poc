import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

/**
 * Hook para inicializar e gerenciar instância ECharts
 */
export function useECharts(options: echarts.EChartsOption | null, opts?: { renderer?: 'canvas' | 'svg' }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current, undefined, {
        renderer: opts?.renderer || 'canvas',
      });
    }

    const handleResize = () => instanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (instanceRef.current && options) {
      instanceRef.current.setOption(options, { notMerge: true });
    }
  }, [options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      instanceRef.current?.dispose();
      instanceRef.current = null;
    };
  }, []);

  return { chartRef, instance: instanceRef };
}

/**
 * Gera dados fake para bar chart com N valores
 */
export function generateBarData(count: number) {
  const categories: string[] = [];
  const values: number[] = [];

  for (let i = 0; i < count; i++) {
    categories.push(`Item_${String(i + 1).padStart(4, '0')}`);
    values.push(Math.round(Math.random() * 10000));
  }

  // Ordenar por valor decrescente
  const indexed = values.map((v, i) => ({ cat: categories[i], val: v }));
  indexed.sort((a, b) => b.val - a.val);

  return {
    categories: indexed.map(x => x.cat),
    values: indexed.map(x => x.val),
  };
}

/**
 * Gera dados para scatter 3D
 */
export function generate3DData(count: number) {
  const data: number[][] = [];
  const clusters = [
    { cx: 30, cy: 50, cz: 20, spread: 8 },
    { cx: 70, cy: 30, cz: 60, spread: 6 },
    { cx: 50, cy: 80, cz: 40, spread: 7 },
    { cx: 20, cy: 20, cz: 80, spread: 5 },
  ];

  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];
    const x = cluster.cx + (Math.random() - 0.5) * cluster.spread * 2;
    const y = cluster.cy + (Math.random() - 0.5) * cluster.spread * 2;
    const z = cluster.cz + (Math.random() - 0.5) * cluster.spread * 2;
    data.push([x, y, z, i % clusters.length]);
  }

  return data;
}

/**
 * Gera dados de série temporal
 */
export function generateTimeSeriesData(days: number) {
  const data: [string, number][] = [];
  const base = new Date(2024, 0, 1);
  let value = 1000;

  for (let i = 0; i < days; i++) {
    const date = new Date(base.getTime() + i * 86400000);
    value += (Math.random() - 0.48) * 100;
    value = Math.max(100, value);
    data.push([date.toISOString().slice(0, 10), Math.round(value)]);
  }

  return data;
}

/**
 * Logger de eventos para rastrear ativações
 */
export type LogEntry = {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error';
};

export function createTimestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false, fractionalSecondDigits: 3 } as any);
}
