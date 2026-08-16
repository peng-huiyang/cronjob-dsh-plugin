/**
 * HTTP routes bridging the Web settings UI to the cron host: list, create,
 * update, toggle, delete, and fire-now. Mutating routes accept only
 * same-origin requests; the body is parsed with a hard byte cap.
 * @module cronjob-dsh-plugin
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { CronJob, CronJobInput, CronJobView } from './types.ts'
import { nextRunAt } from './schedule-util.ts'
import type { CronJobStore } from './store.ts'
import type { CronScheduler } from './scheduler.ts'
import type { CronFirer } from './fire.ts'

/** The webserver route-registration surface this plugin touches. */
export interface WebServerService {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

export interface RouteDeps {
  store: CronJobStore
  scheduler: CronScheduler
  firer: CronFirer
  /** The composed fire path (queues + records outcome) used by the scheduler. */
  fireJob: (job: CronJob) => Promise<void>
}

const MAX_BODY_BYTES = 64 * 1024

function sendJson(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

/** Read and parse a JSON request body with a hard size cap. */
async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return undefined
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** Whether a mutating request comes from the same origin (or loopback). */
export function isSameOrigin(request: IncomingMessage): boolean {
  const host = request.headers.host
  const origin = request.headers.origin
  if (typeof host !== 'string' || host.length === 0) return false
  if (origin === undefined) {
    const hostname = host.split(':')[0]?.toLowerCase() ?? ''
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
  }
  try {
    const parsed = new URL(origin)
    const isSecure = request.socket !== undefined && 'encrypted' in request.socket && request.socket.encrypted === true
    const expectedProtocol = isSecure ? 'https:' : 'http:'
    return parsed.protocol === expectedProtocol && parsed.host === host
  } catch {
    return false
  }
}

/** One job plus its computed next occurrence. */
export function toJobView(job: CronJob, now: Date = new Date()): CronJobView {
  const at = job.enabled ? nextRunAt(job.schedule, job.timeZone, now) : null
  return { ...job, nextRunAt: at === null ? null : at.toISOString() }
}

/** Require a string field in a parsed body; returns an error text or null. */
function requireString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key]
  if (typeof value !== 'string' || value.trim().length === 0) return `missing or invalid "${key}"`
  return value
}

/** Mount the /cronjob/* routes once the webserver service is available. */
export function mountCronRoutes(ctx: Context, deps: RouteDeps): void {
  ctx.inject(['webServer'], (hostCtx) => {
    const webServer = (hostCtx as unknown as { webServer: WebServerService }).webServer
    hostCtx.effect(() => {
      const disposers = [
        webServer.register({
          kind: 'exact',
          path: '/cronjob/list',
          handler: (_req, res) => {
            const jobs = deps.store.list().map((job) => toJobView(job))
            sendJson(res, 200, { jobs })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: '/cronjob/create',
          handler: async (req, res) => {
            if (!isSameOrigin(req)) {
              sendJson(res, 403, { error: 'forbidden' })
              return
            }
            let body: unknown
            try {
              body = await readJsonBody(req)
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
              return
            }
            const record = (body ?? {}) as Record<string, unknown>
            const name = requireString(record, 'name')
            const schedule = requireString(record, 'schedule')
            const timeZone = requireString(record, 'timeZone')
            const prompt = requireString(record, 'prompt')
            if (name === null || schedule === null || timeZone === null || prompt === null) {
              sendJson(res, 400, { error: [name, schedule, timeZone, prompt].filter((v) => v !== null).join('; ') })
              return
            }
            const input: CronJobInput = {
              name,
              schedule,
              timeZone,
              prompt,
              enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
            }
            try {
              const job = await deps.store.create(input)
              sendJson(res, 201, { job: toJobView(job) })
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        webServer.register({
          kind: 'exact',
          path: '/cronjob/update',
          handler: async (req, res) => {
            if (!isSameOrigin(req)) {
              sendJson(res, 403, { error: 'forbidden' })
              return
            }
            const record = (await safeBody(req, res)) as Record<string, unknown> | null
            if (record === null) return
            const id = requireString(record, 'id')
            if (id === null) {
              sendJson(res, 400, { error: 'missing "id"' })
              return
            }
            const patch: Partial<Pick<CronJob, 'name' | 'schedule' | 'timeZone' | 'prompt' | 'enabled'>> = {}
            for (const key of ['name', 'schedule', 'timeZone', 'prompt'] as const) {
              const value = record[key]
              if (typeof value === 'string') patch[key] = value
            }
            if (typeof record.enabled === 'boolean') patch.enabled = record.enabled
            try {
              const job = await deps.store.update(id, patch)
              if (job === undefined) {
                sendJson(res, 404, { error: 'job not found' })
                return
              }
              sendJson(res, 200, { job: toJobView(job) })
            } catch (error) {
              sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
        webServer.register({
          kind: 'exact',
          path: '/cronjob/toggle',
          handler: async (req, res) => {
            if (!isSameOrigin(req)) {
              sendJson(res, 403, { error: 'forbidden' })
              return
            }
            const record = (await safeBody(req, res)) as Record<string, unknown> | null
            if (record === null) return
            const id = requireString(record, 'id')
            if (id === null || typeof record.enabled !== 'boolean') {
              sendJson(res, 400, { error: 'missing "id" or "enabled"' })
              return
            }
            const job = await deps.store.setEnabled(id, record.enabled)
            if (job === undefined) {
              sendJson(res, 404, { error: 'job not found' })
              return
            }
            sendJson(res, 200, { job: toJobView(job) })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: '/cronjob/delete',
          handler: async (req, res) => {
            if (!isSameOrigin(req)) {
              sendJson(res, 403, { error: 'forbidden' })
              return
            }
            const record = (await safeBody(req, res)) as Record<string, unknown> | null
            if (record === null) return
            const id = requireString(record, 'id')
            if (id === null) {
              sendJson(res, 400, { error: 'missing "id"' })
              return
            }
            const deleted = await deps.store.remove(id)
            sendJson(res, 200, { id, deleted })
          },
        }),
        webServer.register({
          kind: 'exact',
          path: '/cronjob/fire',
          handler: async (req, res) => {
            if (!isSameOrigin(req)) {
              sendJson(res, 403, { error: 'forbidden' })
              return
            }
            const record = (await safeBody(req, res)) as Record<string, unknown> | null
            if (record === null) return
            const id = requireString(record, 'id')
            if (id === null) {
              sendJson(res, 400, { error: 'missing "id"' })
              return
            }
            const job = deps.store.get(id)
            if (job === undefined) {
              sendJson(res, 404, { error: 'job not found' })
              return
            }
            try {
              await deps.fireJob(job)
              sendJson(res, 200, { ok: true })
            } catch (error) {
              sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
            }
          },
        }),
      ]
      return () => {
        for (const dispose of disposers) dispose()
      }
    }, 'cronjob: http routes')
  })
}

/** Parse a body and send a 400 on failure; returns null after responding. */
async function safeBody(req: IncomingMessage, res: ServerResponse): Promise<unknown | null> {
  try {
    return await readJsonBody(req)
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
