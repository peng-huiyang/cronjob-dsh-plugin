import type { IncomingMessage } from 'node:http'
import { describe, expect, it } from 'vitest'
import { isSameOrigin, toJobView } from '../src/routes.ts'
import type { CronJob } from '../src/types.ts'

function req(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as unknown as IncomingMessage
}

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

describe('isSameOrigin', () => {
  it('accepts a matching origin and host', () => {
    expect(isSameOrigin(req({ host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' }))).toBe(true)
  })

  it('rejects a cross-origin origin', () => {
    expect(isSameOrigin(req({ host: '127.0.0.1:3080', origin: 'http://evil.example' }))).toBe(false)
  })

  it('rejects a scheme mismatch', () => {
    expect(isSameOrigin(req({ host: '127.0.0.1:3080', origin: 'https://127.0.0.1:3080' }))).toBe(false)
  })

  it('accepts loopback requests without an origin header', () => {
    expect(isSameOrigin(req({ host: 'localhost:3080' }))).toBe(true)
    expect(isSameOrigin(req({ host: '127.0.0.1:3080' }))).toBe(true)
  })

  it('rejects non-loopback requests without an origin', () => {
    expect(isSameOrigin(req({ host: '192.168.1.5:3080' }))).toBe(false)
  })

  it('rejects a missing host', () => {
    expect(isSameOrigin(req({}))).toBe(false)
  })
})

describe('toJobView', () => {
  it('computes nextRunAt for an enabled valid job', () => {
    const view = toJobView(job({}), new Date('2026-01-01T00:00:00.000Z'))
    expect(view.nextRunAt).toBe('2026-01-01T09:00:00.000Z')
  })

  it('returns null for a disabled job', () => {
    const view = toJobView(job({ enabled: false }), new Date('2026-01-01T00:00:00.000Z'))
    expect(view.nextRunAt).toBeNull()
  })

  it('returns null for an invalid schedule', () => {
    const view = toJobView(job({ schedule: 'bogus' }), new Date('2026-01-01T00:00:00.000Z'))
    expect(view.nextRunAt).toBeNull()
  })
})
