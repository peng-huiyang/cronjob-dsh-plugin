import { describe, expect, it } from 'vitest'
import { MAX_TIMER_DELAY_MS, assertValidSchedule, isKnownTimeZone, nextRunAt, validateSchedule } from '../src/schedule-util.ts'
import { ScheduleError } from '../src/schedule-util.ts'

describe('validateSchedule', () => {
  it('accepts standard 5-field expressions', () => {
    expect(validateSchedule('0 9 * * 1-5')).toBeNull()
    expect(validateSchedule('*/5 * * * *')).toBeNull()
  })

  it('accepts 6/7-field (seconds) expressions', () => {
    expect(validateSchedule('0 0 9 * * 1-5')).toBeNull()
    expect(validateSchedule('0 0 9 * * 1-5 2026')).toBeNull()
  })

  it('rejects malformed expressions with a message', () => {
    expect(validateSchedule('bogus')).not.toBeNull()
    expect(validateSchedule('61 * * * *')).not.toBeNull()
    expect(validateSchedule('')).not.toBeNull()
  })
})

describe('isKnownTimeZone / assertValidSchedule', () => {
  it('recognizes IANA zones and rejects nonsense', () => {
    expect(isKnownTimeZone('Asia/Shanghai')).toBe(true)
    expect(isKnownTimeZone('UTC')).toBe(true)
    expect(isKnownTimeZone('Not/AZone')).toBe(false)
  })

  it('throws ScheduleError with stable codes', () => {
    expect(() => assertValidSchedule('bogus', 'UTC')).toThrowError(ScheduleError)
    try {
      assertValidSchedule('0 9 * * *', 'Not/AZone')
      expect.unreachable('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ScheduleError)
      expect((error as ScheduleError).code).toBe('invalid_time_zone')
    }
  })
})

describe('nextRunAt', () => {
  const from = new Date('2026-01-01T00:00:00.000Z')

  it('computes the next occurrence in the given timezone', () => {
    // 09:00 daily in Asia/Shanghai = 01:00Z.
    expect(nextRunAt('0 9 * * *', 'Asia/Shanghai', from)?.toISOString()).toBe('2026-01-01T01:00:00.000Z')
    // 09:00 daily in UTC = 09:00Z.
    expect(nextRunAt('0 9 * * *', 'UTC', from)?.toISOString()).toBe('2026-01-01T09:00:00.000Z')
  })

  it('is strictly after the from instant', () => {
    const exactly = new Date('2026-01-01T09:00:00.000Z')
    expect(nextRunAt('0 9 * * *', 'UTC', exactly)?.toISOString()).toBe('2026-01-02T09:00:00.000Z')
  })

  it('returns null for invalid expressions', () => {
    expect(nextRunAt('bogus', 'UTC', from)).toBeNull()
  })
})

describe('MAX_TIMER_DELAY_MS', () => {
  it('is the Node setTimeout ceiling', () => {
    expect(MAX_TIMER_DELAY_MS).toBe(2_147_483_647)
  })
})
