/**
 * Shared domain types for the cronjob plugin (machine-level scheduled tasks).
 * @module cronjob-dsh-plugin
 */

/** One machine-level scheduled task. */
export interface CronJob {
  /** Stable, never-reused id (uuid). */
  id: string
  /** Human-readable job name. */
  name: string
  /** Cron expression in croner syntax (5, 6, or 7 fields). */
  schedule: string
  /** IANA timezone the schedule is interpreted in, e.g. "Asia/Shanghai". */
  timeZone: string
  /** Task text injected into the dedicated session when the job fires. */
  prompt: string
  /** Whether the scheduler considers this job. */
  enabled: boolean
  /** RFC 3339 creation time. */
  createdAt: string
  /** RFC 3339 last modification time. */
  updatedAt: string
  /** RFC 3339 time of the last fire attempt (successful or not). */
  lastRunAt?: string
  /** Last fire attempt failure message; absent when the last fire succeeded. */
  lastError?: string
}

/** The cronjob settings namespace section (machine-level, durable). */
export interface CronSettings {
  /** All scheduled jobs, in creation order. */
  jobs: CronJob[]
  /** The dedicated session every job fires into; created lazily. */
  dedicatedSessionId?: string
  /** Display name for the dedicated session. */
  dedicatedSessionName?: string
}

/** Input accepted by cron_create / the create route. */
export interface CronJobInput {
  name: string
  schedule: string
  timeZone: string
  prompt: string
  enabled?: boolean
}

/** A job plus its computed next occurrence, as served to the UI. */
export interface CronJobView extends CronJob {
  /** RFC 3339 next occurrence, or null when the job is disabled or invalid. */
  nextRunAt: string | null
}
