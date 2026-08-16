/**
 * Durable job table over the `cronjob` settings namespace. The user document
 * lives in `~/.dsh/settings.yaml` (or whichever settings provider is
 * mounted); all mutations go through one internal queue so read-modify-write
 * cycles stay atomic within this process.
 * @module cronjob-dsh-plugin
 */
import { randomUUID } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace, type SettingsScope } from '@deepseek-ai/dsh-settings'
import Schema from '@deepseek-ai/schemastery'
import type { CronJob, CronJobInput, CronSettings } from './types.ts'
import { assertValidSchedule } from './schedule-util.ts'
import { renderThrown } from './util.ts'

const NS = settingsNamespace('cronjob')

const jobSchema = Schema.object({
  id: Schema.string().required(),
  name: Schema.string().required(),
  schedule: Schema.string().required(),
  timeZone: Schema.string().required(),
  prompt: Schema.string().required(),
  enabled: Schema.boolean().required(),
  createdAt: Schema.string().required(),
  updatedAt: Schema.string().required(),
  lastRunAt: Schema.string(),
  lastError: Schema.string(),
})

const settingsSchema = Schema.object({
  jobs: Schema.array(jobSchema).default([]),
  dedicatedSessionId: Schema.string(),
  dedicatedSessionName: Schema.string(),
}) as unknown as Schema<CronSettings>

/** Owner of the machine-level cron job table. */
export class CronJobStore {
  private scope: SettingsScope<CronSettings> | null = null
  /** Serializes read-modify-write cycles; a failed write never poisons the chain. */
  private mutationChain: Promise<void> = Promise.resolve()

  constructor(private readonly ctx: Context) {}

  /** Register the settings namespace (effect tied to the calling fiber). */
  register(): void {
    this.scope = this.ctx.settings.register(NS, settingsSchema, { applies: 'live' })
  }

  private section(): CronSettings {
    if (this.scope === null) throw new Error('cronjob: store not registered')
    return this.scope.get() as unknown as CronSettings
  }

  /** All jobs in creation order. */
  list(): CronJob[] {
    return this.section().jobs
  }

  /** One job by id, or undefined. */
  get(id: string): CronJob | undefined {
    return this.list().find((job) => job.id === id)
  }

  /** The persisted id of the dedicated firing session, if any. */
  getDedicatedSessionId(): string | undefined {
    return this.section().dedicatedSessionId
  }

  /** Observe committed changes to the whole section. */
  watch(callback: (next: CronSettings) => void): () => void {
    if (this.scope === null) throw new Error('cronjob: store not registered')
    return this.scope.watch((next) => callback(next as unknown as CronSettings))
  }

  /** Run one mutation as a read-modify-write cycle on the serialized chain. */
  private async mutate(transform: (current: CronSettings) => CronSettings): Promise<void> {
    if (this.scope === null) throw new Error('cronjob: store not registered')
    const run = this.mutationChain.then(async () => {
      const next = transform(this.section())
      await this.scope!.replace(next)
    })
    this.mutationChain = run.catch(() => undefined)
    return run
  }

  /** Create and persist one job; validates schedule and timezone first. */
  async create(input: CronJobInput): Promise<CronJob> {
    const now = new Date().toISOString()
    assertValidSchedule(input.schedule, input.timeZone)
    const job: CronJob = {
      id: randomUUID(),
      name: input.name,
      schedule: input.schedule,
      timeZone: input.timeZone,
      prompt: input.prompt,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }
    await this.mutate((current) => ({ ...current, jobs: [...current.jobs, job] }))
    return job
  }

  /** Patch one job's fields; returns the updated job or undefined. */
  async update(id: string, patch: Partial<Pick<CronJob, 'name' | 'schedule' | 'timeZone' | 'prompt' | 'enabled'>>): Promise<CronJob | undefined> {
    if (patch.schedule !== undefined || patch.timeZone !== undefined) {
      const current = this.get(id)
      if (current === undefined) return undefined
      assertValidSchedule(patch.schedule ?? current.schedule, patch.timeZone ?? current.timeZone)
    }
    let updated: CronJob | undefined
    await this.mutate((current) => {
      const jobs = current.jobs.map((job) => {
        if (job.id !== id) return job
        updated = { ...job, ...patch, updatedAt: new Date().toISOString() }
        return updated
      })
      return { ...current, jobs }
    })
    return updated
  }

  /** Remove one job; returns whether it existed. */
  async remove(id: string): Promise<boolean> {
    let removed = false
    await this.mutate((current) => {
      const jobs = current.jobs.filter((job) => {
        if (job.id === id) {
          removed = true
          return false
        }
        return true
      })
      return { ...current, jobs }
    })
    return removed
  }

  /** Set a job's enabled flag; returns the updated job or undefined. */
  async setEnabled(id: string, enabled: boolean): Promise<CronJob | undefined> {
    return this.update(id, { enabled })
  }

  /** Record a fire attempt outcome. */
  async markRun(id: string, at: Date, error?: string): Promise<void> {
    await this.mutate((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === id ? { ...job, lastRunAt: at.toISOString(), lastError: error } : job)),
    }))
  }

  /** Persist the dedicated session id once it has been created. */
  async setDedicatedSessionId(id: string): Promise<void> {
    await this.mutate((current) => ({ ...current, dedicatedSessionId: id }))
  }

  /** Log a write failure with a stable one-line diagnostic. */
  warn(error: unknown): void {
    this.ctx.logger.warn(`cronjob: settings write failed: ${renderThrown(error)}`)
  }
}
