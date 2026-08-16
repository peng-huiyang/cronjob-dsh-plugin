/**
 * Cron schedule parsing, validation, and next-occurrence computation over
 * `croner`. Pure functions, unit-testable without a live harness.
 * @module cronjob-dsh-plugin
 */
import { Cron } from 'croner'

/** Node's largest `setTimeout` delay before it clamps to 1 ms. */
export const MAX_TIMER_DELAY_MS = 2_147_483_647

/** A validation failure with a stable machine code. */
export class ScheduleError extends Error {
  constructor(
    readonly code: 'invalid_schedule' | 'invalid_time_zone',
    message: string,
  ) {
    super(message)
    this.name = 'ScheduleError'
  }
}

/** Whether `timeZone` names a real IANA zone the runtime can resolve. */
export function isKnownTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * Validate a cron expression by constructing a croner job.
 * @param schedule - croner-syntax expression (5, 6, or 7 fields).
 * @returns an error message, or null when valid.
 */
export function validateSchedule(schedule: string): string | null {
  try {
    new Cron(schedule)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/**
 * Validate both schedule and timezone, throwing a {@link ScheduleError} on the
 * first failure.
 * @param schedule - croner-syntax expression.
 * @param timeZone - IANA timezone.
 */
export function assertValidSchedule(schedule: string, timeZone: string): void {
  const scheduleError = validateSchedule(schedule)
  if (scheduleError !== null) throw new ScheduleError('invalid_schedule', scheduleError)
  if (!isKnownTimeZone(timeZone)) throw new ScheduleError('invalid_time_zone', `unknown time zone "${timeZone}"`)
}

/**
 * Next occurrence of `schedule` in `timeZone` strictly after `from`.
 * @returns the occurrence, or null when the expression is invalid.
 */
export function nextRunAt(schedule: string, timeZone: string, from: Date): Date | null {
  try {
    const cron = new Cron(schedule, { timezone: timeZone })
    return cron.nextRun(from)
  } catch {
    return null
  }
}
