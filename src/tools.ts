/**
 * Model tools so the agent can manage the machine-level job table itself:
 * cron_create / cron_list / cron_delete. Registered globally (machine-level),
 * unlike the session-scoped schedule tools.
 * @module cronjob-dsh-plugin
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import type { CronJob, CronJobInput } from './types.ts'
import { nextRunAt } from './schedule-util.ts'
import type { CronJobStore } from './store.ts'

export interface ToolDeps {
  store: CronJobStore
  /** The composed fire path (queues + records outcome), for fire-now tools. */
  fireJob?: (job: CronJob) => Promise<void>
}

const CREATE_DESCRIPTION =
  'Create one machine-level scheduled task. The job fires into the dedicated cron session at every matching occurrence; ' +
  'the agent there receives the prompt as a user message and executes it. ' +
  'schedule is a cron expression with 5, 6, or 7 fields (e.g. "0 9 * * 1-5" for 09:00 Monday-Friday, ' +
  '"*/5 * * * *" for every 5 minutes); timeZone is an IANA zone such as "Asia/Shanghai".'

const LIST_DESCRIPTION =
  'List all machine-level scheduled tasks with their next occurrence, enablement, and last run outcome.'

const DELETE_DESCRIPTION =
  'Delete one machine-level scheduled task by the exact id returned by cron_create or cron_list. ' +
  'Unknown ids return deleted false.'

function jobViewOf(job: CronJob): Record<string, unknown> {
  return {
    id: job.id,
    name: job.name,
    schedule: job.schedule,
    timeZone: job.timeZone,
    enabled: job.enabled,
    nextRunAt: nextRunAt(job.schedule, job.timeZone, new Date())?.toISOString() ?? null,
    lastRunAt: job.lastRunAt ?? null,
    lastError: job.lastError ?? null,
  }
}

/** Register the three cron management tools; returns the aggregate disposer. */
export function registerCronTools(ctx: Context, deps: ToolDeps): () => void {
  const disposers = [
    ctx.tools.register(defineTool({
      name: 'cron_create',
      description: CREATE_DESCRIPTION,
      parameters: {
        name: { type: 'string', required: true, description: 'Short human-readable job name.' },
        schedule: { type: 'string', required: true, description: 'Cron expression (5, 6, or 7 fields).' },
        timeZone: { type: 'string', required: true, description: 'IANA time zone, e.g. "Asia/Shanghai".' },
        prompt: { type: 'string', required: true, description: 'Task text delivered to the dedicated cron session when the job fires.' },
        enabled: { type: 'boolean', description: 'Whether the job starts enabled; defaults to true.' },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            nextRunAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
          },
          required: ['id'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args: CronJobInput): Promise<{ id: string; nextRunAt: string | null }> {
        const job = await deps.store.create(args)
        return { id: job.id, nextRunAt: nextRunAt(job.schedule, job.timeZone, new Date())?.toISOString() ?? null }
      },
    })),
    ctx.tools.register(defineTool({
      name: 'cron_list',
      description: LIST_DESCRIPTION,
      parameters: {},
      output: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              schedule: { type: 'string' },
              timeZone: { type: 'string' },
              enabled: { type: 'boolean' },
              nextRunAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
              lastRunAt: { oneOf: [{ type: 'string' }, { type: 'null' }] },
              lastError: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            },
            additionalProperties: false,
          },
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(): Promise<Record<string, unknown>[]> {
        return deps.store.list().map(jobViewOf)
      },
    })),
    ctx.tools.register(defineTool({
      name: 'cron_delete',
      description: DELETE_DESCRIPTION,
      parameters: {
        id: { type: 'string', required: true, description: 'The job id returned by cron_create or cron_list.' },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            deleted: { type: 'boolean' },
          },
          required: ['id', 'deleted'],
          additionalProperties: false,
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
      },
      async execute(args: { id: string }): Promise<{ id: string; deleted: boolean }> {
        const deleted = await deps.store.remove(args.id)
        return { id: args.id, deleted }
      },
    })),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}
