/**
 * Cliente para a API REST do Apache Superset.
 *
 * Todas as chamadas passam pelo proxy do Vite (/superset-api → Superset),
 * evitando problemas de CORS em desenvolvimento.
 */

const BASE = '/superset-api';

let accessToken: string | null = null;
let csrfToken: string | null = null;

/** Autentica no Superset e armazena tokens em memória */
export async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/v1/security/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        provider: 'db',
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    accessToken = data.access_token;

    // Buscar CSRF token
    const csrfRes = await fetch(`${BASE}/api/v1/security/csrf_token/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (csrfRes.ok) {
      const csrfData = await csrfRes.json();
      csrfToken = csrfData.result;
    }

    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (csrfToken) headers['X-CSRFToken'] = csrfToken;
  return headers;
}

/** Lista as databases configuradas no Superset */
export async function getDatabases(): Promise<any[]> {
  const res = await fetch(`${BASE}/api/v1/database/`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.result ?? [];
}

/** Lista os datasets (tabelas/views) disponíveis */
export async function getDatasets(): Promise<any[]> {
  const res = await fetch(`${BASE}/api/v1/dataset/?q=(page_size:100)`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.result ?? [];
}

/** Lista os charts existentes — com todos os campos */
export async function getCharts(): Promise<any[]> {
  const res = await fetch(
    `${BASE}/api/v1/chart/?q=(page_size:100,columns:!(id,slice_name,viz_type,datasource_id,datasource_type,params,query_context,description))`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  return data.result ?? [];
}

/** Lista os dashboards */
export async function getDashboards(): Promise<any[]> {
  const res = await fetch(`${BASE}/api/v1/dashboard/?q=(page_size:100)`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.result ?? [];
}

/** Busca info completa de um chart pelo ID */
export async function getChartInfo(chartId: number): Promise<any> {
  const res = await fetch(`${BASE}/api/v1/chart/${chartId}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  return json.result ?? json;
}

/**
 * Busca dados de um chart.
 * Recebe a info do chart (da listagem) para não depender do endpoint de detalhe.
 */
export async function getChartData(chartId: number, chartListInfo?: any): Promise<any> {
  // 1. Tentar GET direto (usa a config salva no chart)
  try {
    const directRes = await fetch(`${BASE}/api/v1/chart/${chartId}/data/?force=true`, {
      headers: authHeaders(),
    });
    if (directRes.ok) {
      const data = await directRes.json();
      if (data.result?.[0]?.data?.length > 0) return data;
    }
  } catch { /* fallback */ }

  // 2. Tentar query_context da listagem
  const qcRaw = chartListInfo?.query_context;
  if (qcRaw) {
    try {
      const qc = typeof qcRaw === 'string' ? JSON.parse(qcRaw) : qcRaw;
      const res = await fetch(`${BASE}/api/v1/chart/data`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(qc),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result?.[0]?.data?.length > 0) return data;
      }
    } catch { /* fallback */ }
  }

  // 3. Buscar info detalhada do chart e tentar query_context de lá
  let chartInfo: any = null;
  try {
    chartInfo = await getChartInfo(chartId);
    if (chartInfo?.query_context) {
      const qc = typeof chartInfo.query_context === 'string'
        ? JSON.parse(chartInfo.query_context)
        : chartInfo.query_context;
      const res = await fetch(`${BASE}/api/v1/chart/data`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(qc),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result?.[0]?.data?.length > 0) return data;
      }
    }
  } catch { /* fallback */ }

  // 4. Montar request manual a partir dos dados disponíveis
  const info = chartListInfo ?? chartInfo ?? {};
  const datasourceId = info.datasource_id;
  const datasourceType = info.datasource_type ?? 'table';

  if (!datasourceId) {
    const listKeys = Object.keys(chartListInfo ?? {});
    const detailKeys = Object.keys(chartInfo ?? {});
    throw new Error(
      `Sem datasource. List fields: [${listKeys.join(', ')}] | Detail fields: [${detailKeys.join(', ')}]`
    );
  }

  const paramsRaw = info.params;
  const formData = paramsRaw
    ? (typeof paramsRaw === 'string' ? JSON.parse(paramsRaw) : paramsRaw)
    : {};

  const metrics = formData.metrics ?? formData.metric ?? ['count'];
  const groupby = formData.groupby ?? formData.columns ?? [];

  const res = await fetch(`${BASE}/api/v1/chart/data`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      datasource: { id: datasourceId, type: datasourceType },
      queries: [{
        columns: groupby,
        metrics: Array.isArray(metrics) ? metrics : [metrics],
        row_limit: formData.row_limit ?? 1000,
      }],
      result_format: 'json',
      result_type: 'results',
    }),
  });
  return res.json();
}

/**
 * Executa uma query SQL via SQL Lab API.
 * Retorna as colunas e linhas do resultado.
 */
export async function executeSql(
  databaseId: number,
  sql: string,
  schema?: string
): Promise<{ columns: string[]; data: any[] }> {
  const res = await fetch(`${BASE}/api/v1/sqllab/execute/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      database_id: databaseId,
      sql,
      schema: schema ?? 'public',
      runAsync: false,
      queryLimit: 10000,
    }),
  });

  const result = await res.json();

  return {
    columns: result.columns?.map((c: any) => c.column_name ?? c.name ?? c) ?? [],
    data: result.data ?? [],
  };
}

/**
 * Gera um guest token para o Embedded SDK.
 * Em produção isto DEVE ser feito via backend (nunca expor credenciais admin no frontend).
 */
export async function getGuestToken(dashboardId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/v1/security/guest_token/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        user: {
          username: 'guest',
          first_name: 'Guest',
          last_name: 'User',
        },
        resources: [{ type: 'dashboard', id: dashboardId }],
        rls: [],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.token;
  } catch {
    return null;
  }
}
