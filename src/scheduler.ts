/**
 * Wall-clock scheduler: arms a single timer for the earliest next occurrence
 * across all enabled jobs, rereads the wall clock on every wake (so a
 * rollback cannot fire early), and fires every job whose occurrence has
 * passed. Missed occurrences while the host is down are skipped — the next
 * run is recomputed from the current time after every wake.
 * @module cronjob-dsh-plugin
 */
import type { CronJob } from './types.ts'
import { MAX_TIMER_DELAY_MS, nextRunAt } from './schedule-util.ts'
import { renderThrown } from './util.ts'

export interface SchedulerLogger {
  warn(message: string): void
}

/** Delivers one due job; throws on failure so the caller records it. */
export type FireJob = (job: CronJob) => Promise<void>

/** The firing target the scheduler armed, used to decide due-ness on wake. */
export class CronScheduler {
  private timer: NodeJS.Timeout | null = null
  private disposed = false
  /** Earliest target the current timer is armed for (0 when unarmed). */
  private armedTarget = 0

  constructor(
    private readonly listJobs: () => CronJob[],
    private readonly watch: (callback: () => void) => () => void,
    private readonly fire: FireJob,
    private readonly logger: SchedulerLogger,
  ) {}

  /** Start recomputing after every store change and arm the first timer. */
  start(): void {
    this.watch(() => this.scheduleNext())
    this.scheduleNext()
  }

  /** Recompute the earliest next occurrence and (re)arm the timer. */
  scheduleNext(): void {
    if (this.disposed) return
    this.clearTimer()
    const now = Date.now()
    let earliest: { job: CronJob; at: Date } | null = null
    for (const job of this.listJobs()) {
      if (!job.enabled) continue
      const at = nextRunAt(job.schedule, job.timeZone, new Date(now))
      if (at === null) continue
      if (earliest === null || at.getTime() < earliest.at.getTime()) earliest = { job, at }
    }
    if (earliest === null) {
      this.armedTarget = 0
      return
    }
    const delay = earliest.at.getTime() - now
    this.armedTarget = earliest.at.getTime()
    if (delay <= 0) {
      void this.wake()
      return
    }
    this.timer = setTimeout(() => void this.wake(), Math.min(delay, MAX_TIMER_DELAY_MS))
    this.timer.unref?.()
  }

  /** Wake at (or after) the armed target: fire due jobs, then re-arm. */
  private async wake(): Promise<void> {
    if (this.disposed) return
    const now = Date.now()
    for (const job of this.listJobs()) {
      if (!job.enabled) continue
      // The occurrence "just before now" — fires when it has passed, exactly once.
      const at = nextRunAt(job.schedule, job.timeZone, new Date(now - 1))
      if (at === null || at.getTime() > now) continue
      try {
        await this.fire(job)
      } catch (error) {
        this.logger.warn(`cronjob: fire failed for job "${job.id}": ${renderThrown(error)}`)
      }
    }
    this.scheduleNext()
  }

  /** Stop the timer; the scheduler becomes inert. */
  dispose(): void {
    this.disposed = true
    this.clearTimer()
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
