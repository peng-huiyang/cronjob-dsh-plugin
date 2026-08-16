/**
 * cronjob-dsh-plugin host entry: machine-level cron scheduler for DeepSeek
 * Harness. The plugin owns a durable job table (ctx.settings namespace), a
 * wall-clock scheduler, an internally-driven firing path into a dedicated
 * session, HTTP routes for the Web settings UI, and model tools so the agent
 * can manage its own jobs.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { isAbsolute } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { Context } from '@deepseek-ai/cordis'
import type { CronJob } from './types.ts'
import { CronJobStore } from './store.ts'
import { CronScheduler } from './scheduler.ts'
import { CronFirer } from './fire.ts'
import { mountCronRoutes } from './routes.ts'
import { registerCronTools } from './tools.ts'
import { renderThrown } from './util.ts'

export const name = 'cronjob'
export const inject = ['settings', 'agents', 'tools']

/** Optional cordis.yml configuration for the cron scheduler. */
export interface Config {
  /** Display name for the dedicated session all jobs fire into. */
  dedicatedSessionName?: string
  /** Absolute existing directory used as the dedicated session's cwd; defaults to `$DSH_HOME/cron-job`. */
  dedicatedSessionCwd?: string
}

/**
 * The default dedicated-session directory: `$DSH_HOME/cron-job` (usually
 * `~/.dsh/cron-job`). Isolated from whatever workspace the user works in,
 * created automatically on plugin load — the plugin needs no configuration.
 */
export function defaultDedicatedCwd(): string {
  return dshHomePath('cron-job')
}

/**
 * Register the cron scheduler against the host context.
 * @param ctx - Host context with settings, agents, and tools services.
 * @param config - Optional profile override from the loader.
 */
export function apply(ctx: Context, config?: Config): void {
  const configured = config?.dedicatedSessionCwd
  const dedicatedSessionCwd = configured ?? defaultDedicatedCwd()
  if (configured !== undefined) {
    if (!isAbsolute(configured)) {
      throw new Error(`cronjob: dedicatedSessionCwd must be an absolute path, got "${configured}"`)
    }
    if (!existsSync(configured)) {
      throw new Error(`cronjob: dedicatedSessionCwd does not exist: "${configured}"`)
    }
  } else {
    try {
      mkdirSync(dedicatedSessionCwd, { recursive: true })
    } catch (error) {
      throw new Error(
        `cronjob: could not create the default dedicated session directory "${dedicatedSessionCwd}": ${renderThrown(error)}`,
      )
    }
  }
  const store = new CronJobStore(ctx)
  const firer = new CronFirer(
    ctx,
    () => store.getDedicatedSessionId(),
    (id) => store.setDedicatedSessionId(id),
    ctx.logger,
    dedicatedSessionCwd,
    config?.dedicatedSessionName,
  )
  /** The composed fire path: queue the task, then record the outcome. */
  const fireJob = async (job: CronJob): Promise<void> => {
    const at = new Date()
    try {
      await firer.fire(job, at)
      await store.markRun(job.id, at)
    } catch (error) {
      try {
        await store.markRun(job.id, at, renderThrown(error))
      } catch (writeError) {
        store.warn(writeError)
      }
      throw error
    }
  }
  const scheduler = new CronScheduler(
    () => store.list(),
    (callback) => store.watch(callback),
    fireJob,
    ctx.logger,
  )
  ctx.effect(() => {
    store.register()
    scheduler.start()
    mountCronRoutes(ctx, { store, scheduler, firer, fireJob })
    const disposeTools = registerCronTools(ctx, { store, fireJob })
    return () => {
      scheduler.dispose()
      disposeTools()
    }
  }, 'cronjob: host')
}
