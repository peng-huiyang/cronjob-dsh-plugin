import { describe, expect, it, vi } from 'vitest'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { CronJobStore } from '../src/store.ts'
import type { CronSettings } from '../src/types.ts'

/** In-memory settings scope stand-in for the store's read/write surface. */
class FakeScope {
  value: CronSettings
  private watchers: Array<(next: CronSettings) => void> = []

  constructor(initial: CronSettings) {
    this.value = initial
  }

  get(): CronSettings {
    return this.value
  }

  async replace(section: CronSettings): Promise<void> {
    this.value = section
    for (const watcher of this.watchers) watcher(section)
  }

  async update(patch: Partial<CronSettings>): Promise<void> {
    await this.replace({ ...this.value, ...patch })
  }

  watch(callback: (next: CronSettings) => void): () => void {
    this.watchers.push(callback)
    return () => undefined
  }
}

function makeStore(initial: CronSettings = { jobs: [] }) {
  const scope = new FakeScope(initial)
  const ctx = {
    settings: { register: vi.fn(() => scope) },
    logger: { warn: vi.fn() },
  }
  const store = new CronJobStore(ctx as never)
  store.register()
  return { store, scope, ctx }
}

describe('CronJobStore', () => {
  it('creates jobs with stable ids and defaults', async () => {
    const { store } = makeStore()
    const job = await store.create({ name: 'A', schedule: '0 9 * * *', timeZone: 'UTC', prompt: 'task' })
    expect(job.id).toBeTruthy()
    expect(job.enabled).toBe(true)
    expect(store.list()).toHaveLength(1)
    expect(store.get(job.id)?.name).toBe('A')
  })

  it('rejects invalid schedules and timezones', async () => {
    const { store } = makeStore()
    await expect(store.create({ name: 'A', schedule: 'bogus', timeZone: 'UTC', prompt: 'x' })).rejects.toThrow()
    await expect(store.create({ name: 'A', schedule: '0 9 * * *', timeZone: 'Not/AZone', prompt: 'x' })).rejects.toThrow()
    expect(store.list()).toHaveLength(0)
  })

  it('updates fields and validates schedule changes', async () => {
    const { store } = makeStore()
    const job = await store.create({ name: 'A', schedule: '0 9 * * *', timeZone: 'UTC', prompt: 'x' })
    const updated = await store.update(job.id, { name: 'B', schedule: '0 10 * * *' })
    expect(updated?.name).toBe('B')
    expect(updated?.schedule).toBe('0 10 * * *')
    expect(store.get(job.id)?.updatedAt).not.toBe(job.updatedAt)

    await expect(store.update(job.id, { schedule: 'bogus' })).rejects.toThrow()
    expect(store.get(job.id)?.schedule).toBe('0 10 * * *')
  })

  it('returns undefined when updating or toggling an unknown id', async () => {
    const { store } = makeStore()
    expect(await store.update('nope', { name: 'X' })).toBeUndefined()
    expect(await store.setEnabled('nope', false)).toBeUndefined()
  })

  it('removes jobs and reports existence', async () => {
    const { store } = makeStore()
    const job = await store.create({ name: 'A', schedule: '0 9 * * *', timeZone: 'UTC', prompt: 'x' })
    expect(await store.remove(job.id)).toBe(true)
    expect(await store.remove(job.id)).toBe(false)
    expect(store.list()).toHaveLength(0)
  })

  it('marks runs with timestamps and errors', async () => {
    const { store } = makeStore()
    const job = await store.create({ name: 'A', schedule: '0 9 * * *', timeZone: 'UTC', prompt: 'x' })
    await store.markRun(job.id, new Date('2026-01-01T09:00:00.000Z'))
    expect(store.get(job.id)?.lastRunAt).toBe('2026-01-01T09:00:00.000Z')
    expect(store.get(job.id)?.lastError).toBeUndefined()

    await store.markRun(job.id, new Date('2026-01-02T09:00:00.000Z'), 'boom')
    expect(store.get(job.id)?.lastError).toBe('boom')
  })

  it('persists the dedicated session id and notifies watchers', async () => {
    const { store, scope } = makeStore()
    const watched: CronSettings[] = []
    store.watch((next) => watched.push(next))
    await store.setDedicatedSessionId('session-cron-1')
    expect(store.getDedicatedSessionId()).toBe('session-cron-1')
    expect(watched).toHaveLength(1)
    expect(watched[0]?.dedicatedSessionId).toBe('session-cron-1')
  })
})
