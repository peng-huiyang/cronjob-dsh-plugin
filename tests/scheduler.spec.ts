import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CronScheduler } from '../src/scheduler.ts'
import type { CronJob } from '../src/types.ts'

function job(overrides: Partial<CronJob>): CronJob {
  return {
    id: 'job-1',
    name: 'Test',
    schedule: '0 9 * * *',
    timeZone: 'UTC',
    prompt: 'do the thing',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('CronScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires a due job exactly once at its occurrence and re-arms', async () => {
    const jobs = [job({})]
    const fire = vi.fn(async () => undefined)
    const scheduler = new CronScheduler(
      () => jobs,
      () => () => undefined,
      fire,
      { warn: vi.fn() },
    )
    scheduler.start()

    // 09:00 UTC is 9 hours away; the timer is armed for it.
    await vi.advanceTimersByTimeAsync(9 * 60 * 60 * 1000 - 1)
    expect(fire).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(fire).toHaveBeenCalledTimes(1)
    expect(fire).toHaveBeenCalledWith(jobs[0])

    // The next occurrence is 24h later; nothing re-fires immediately.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fire).toHaveBeenCalledTimes(1)

    scheduler.dispose()
  })

  it('never fires disabled jobs', async () => {
    const jobs = [job({ enabled: false })]
    const fire = vi.fn(async () => undefined)
    const scheduler = new CronScheduler(
      () => jobs,
      () => () => undefined,
      fire,
      { warn: vi.fn() },
    )
    scheduler.start()
    await vi.advanceTimersByTimeAsync(48 * 60 * 60 * 1000)
    expect(fire).not.toHaveBeenCalled()
    scheduler.dispose()
  })

  it('does not fire jobs with invalid schedules', async () => {
    const jobs = [job({ schedule: 'bogus' })]
    const fire = vi.fn(async () => undefined)
    const scheduler = new CronScheduler(
      () => jobs,
      () => () => undefined,
      fire,
      { warn: vi.fn() },
    )
    scheduler.start()
    await vi.advanceTimersByTimeAsync(48 * 60 * 60 * 1000)
    expect(fire).not.toHaveBeenCalled()
    scheduler.dispose()
  })

  it('recomputes when the store changes (new job becomes due sooner)', async () => {
    const jobs: CronJob[] = []
    let watchCallback: (() => void) | null = null
    const watch = (cb: () => void) => {
      watchCallback = cb
      return () => undefined
    }
    const fire = vi.fn(async () => undefined)
    const scheduler = new CronScheduler(() => jobs, watch, fire, { warn: vi.fn() })
    scheduler.start()

    // A job due in 5 minutes is added after start.
    jobs.push(job({ schedule: '*/5 * * * *' }))
    watchCallback?.()

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(fire).toHaveBeenCalledTimes(1)
    scheduler.dispose()
  })

  it('logs and continues when firing throws', async () => {
    const jobs = [job({ schedule: '*/5 * * * *' })]
    const warn = vi.fn()
    const fire = vi.fn(async () => {
      throw new Error('boom')
    })
    const scheduler = new CronScheduler(() => jobs, () => () => undefined, fire, { warn })
    scheduler.start()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(fire).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom'))
    scheduler.dispose()
  })

  it('dispose stops future fires', async () => {
    const jobs = [job({ schedule: '*/5 * * * *' })]
    const fire = vi.fn(async () => undefined)
    const scheduler = new CronScheduler(() => jobs, () => () => undefined, fire, { warn: vi.fn() })
    scheduler.start()
    scheduler.dispose()
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(fire).not.toHaveBeenCalled()
  })
})
