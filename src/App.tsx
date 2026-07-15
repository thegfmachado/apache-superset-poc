import { useState } from 'react';
import { TestBackgroundColor } from './tests/TestBackgroundColor';
import { Test3DChart } from './tests/Test3DChart';
import { TestLargeDataset } from './tests/TestLargeDataset';
import { TestZoom } from './tests/TestZoom';
import { TestMultipleActivations } from './tests/TestMultipleActivations';
import { TestUpdateControl } from './tests/TestUpdateControl';
import { TestPreventDuplicates } from './tests/TestPreventDuplicates';

type TestId = 'all' | 'bg-color' | '3d' | 'large-data' | 'zoom' | 'activations' | 'update-control' | 'duplicates';

export default function App() {
  const [activeTest, setActiveTest] = useState<TestId>('all');

  const tests: { id: TestId; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'bg-color', label: '1. Cor de Fundo' },
    { id: '3d', label: '2. Gráfico 3D' },
    { id: 'large-data', label: '3. 1500+ Valores' },
    { id: 'zoom', label: '4. Zoom' },
    { id: 'activations', label: '5. Múltiplos Triggers' },
    { id: 'update-control', label: '6. Controle Update' },
    { id: 'duplicates', label: '7. Prevenir Duplicatas' },
  ];

  const shouldShow = (id: TestId) => activeTest === 'all' || activeTest === id;

  return (
    <div className="app">
      <header className="app-header">
        <h1>POC Apache Superset - EIS Superset Teste</h1>
        <p>Validação de requisitos de controle de gráficos no frontend</p>
      </header>

      <div className="controls" style={{ marginBottom: 24 }}>
        {tests.map(t => (
          <button
            key={t.id}
            className={activeTest === t.id ? 'active' : ''}
            onClick={() => setActiveTest(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="test-grid">
        {shouldShow('bg-color') && <TestBackgroundColor />}
        {shouldShow('3d') && <Test3DChart />}
        {shouldShow('large-data') && <TestLargeDataset />}
        {shouldShow('zoom') && <TestZoom />}
        {shouldShow('activations') && <TestMultipleActivations />}
        {shouldShow('update-control') && <TestUpdateControl />}
        {shouldShow('duplicates') && <TestPreventDuplicates />}
      </div>
    </div>
  );
}
