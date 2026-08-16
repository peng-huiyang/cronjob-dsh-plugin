/** Browser-side client for the /cronjob/* host routes. */

/** One job as served by the host list endpoint. */
export interface ApiJob {
  id: string
  name: string
  schedule: string
  timeZone: string
  prompt: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  lastError?: string
  /** RFC 3339 next occurrence computed by the host, or null. */
  nextRunAt: string | null
}

/** Input accepted by the create/update endpoints. */
export interface ApiJobInput {
  name: string
  schedule: string
  timeZone: string
  prompt: string
  enabled?: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', ...init })
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error ?? `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

function jsonPost(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function listJobs(): Promise<{ jobs: ApiJob[] }> {
  return request('/cronjob/list')
}

export function createJob(input: ApiJobInput): Promise<{ job: ApiJob }> {
  return jsonPost('/cronjob/create', input) as Promise<{ job: ApiJob }>
}

export function updateJob(id: string, patch: Partial<ApiJobInput>): Promise<{ job: ApiJob }> {
  return jsonPost('/cronjob/update', { id, ...patch }) as Promise<{ job: ApiJob }>
}

export function toggleJob(id: string, enabled: boolean): Promise<{ job: ApiJob }> {
  return jsonPost('/cronjob/toggle', { id, enabled }) as Promise<{ job: ApiJob }>
}

export function deleteJob(id: string): Promise<{ id: string; deleted: boolean }> {
  return jsonPost('/cronjob/delete', { id }) as Promise<{ id: string; deleted: boolean }>
}

export function fireJob(id: string): Promise<{ ok: boolean }> {
  return jsonPost('/cronjob/fire', { id }) as Promise<{ ok: boolean }>
}
