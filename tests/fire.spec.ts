import { describe, expect, it, vi } from 'vitest'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import { CronFirer, renderCronFraming } from '../src/fire.ts'
import type { CronJob } from '../src/types.ts'

function job(overrides: Partial<CronJob>): CronJob {
  return {
    id: 'job-1',
    name: 'Backup',
    schedule: '0 9 * * *',
    timeZone: 'UTC',
    prompt: 'back up the workspace',
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAgent(id: string): Agent {
  return {
    id: SessionId(id),
    status: 'idle',
    whenIdle: vi.fn(async () => undefined),
    runMaintenance: vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) => task(new AbortController().signal)),
    followup: vi.fn(),
  } as unknown as Agent
}

function makeHandle(id: string): AgentHandle {
  const agent = makeAgent(id)
  return { agent, dispose: vi.fn(async () => undefined) }
}

/** A minimal ctx whose agents registry is fully mocked. */
function makeCtx() {
  const agents = {
    get: vi.fn(),
    create: vi.fn(),
    resume: vi.fn(),
  }
  return { agents }
}

describe('renderCronFraming', () => {
  it('carries name, occurrence, and task text', () => {
    const text = renderCronFraming(job({}), new Date('2026-01-01T09:00:00.000Z'))
    expect(text).toContain('[CRON JOB]')
    expect(text).toContain('name: Backup')
    expect(text).toContain('occurrence_at: 2026-01-01T09:00:00.000Z')
    expect(text).toContain('task: back up the workspace')
  })
})

describe('CronFirer', () => {
  it('creates the dedicated session on first fire and follows up', async () => {
    const ctx = makeCtx()
    const created = makeHandle('session-cron-created')
    ctx.agents.create.mockResolvedValue(created)
    const setDedicated = vi.fn(async () => undefined)
    const firer = new CronFirer(ctx as never, () => undefined, setDedicated, { warn: vi.fn() })

    await firer.fire(job({}), new Date('2026-01-01T09:00:00.000Z'))

    expect(ctx.agents.create).toHaveBeenCalledTimes(1)
    expect(setDedicated).toHaveBeenCalledTimes(1)
    expect(created.agent.followup).toHaveBeenCalledTimes(1)
    const message = (created.agent.followup as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(message.content[0].text).toContain('[CRON JOB]')
    expect(message.source).toEqual({ kind: 'plugin', plugin: 'cronjob' })
  })

  it('uses the configured cwd when creating the dedicated session', async () => {
    const ctx = makeCtx()
    const created = makeHandle('session-cron-cwd')
    ctx.agents.create.mockResolvedValue(created)
    const firer = new CronFirer(ctx as never, () => undefined, vi.fn(async () => undefined), { warn: vi.fn() }, 'D:\\work\\cron')

    await firer.fire(job({}), new Date())

    expect(ctx.agents.create).toHaveBeenCalledWith(
      expect.objectContaining({ meta: expect.objectContaining({ cwd: 'D:\\work\\cron' }) }),
    )
  })

  it('reuses a live dedicated session', async () => {
    const ctx = makeCtx()
    const live = makeAgent('session-live')
    ctx.agents.get.mockReturnValue(live)
    const firer = new CronFirer(ctx as never, () => 'session-live', vi.fn(async () => undefined), { warn: vi.fn() })

    await firer.fire(job({}), new Date())

    expect(ctx.agents.create).not.toHaveBeenCalled()
    expect(ctx.agents.resume).not.toHaveBeenCalled()
    expect(live.followup).toHaveBeenCalledTimes(1)
  })

  it('resumes a persisted session when not live', async () => {
    const ctx = makeCtx()
    const resumed = makeHandle('session-cold')
    ctx.agents.get.mockReturnValue(undefined)
    ctx.agents.resume.mockResolvedValue(resumed)
    const firer = new CronFirer(ctx as never, () => 'session-cold', vi.fn(async () => undefined), { warn: vi.fn() })

    await firer.fire(job({}), new Date())

    expect(ctx.agents.resume).toHaveBeenCalledWith({ resumeSessionId: SessionId('session-cold') })
    expect(ctx.agents.create).not.toHaveBeenCalled()
    expect(resumed.agent.followup).toHaveBeenCalledTimes(1)
  })

  it('falls back to creating when resume fails', async () => {
    const ctx = makeCtx()
    ctx.agents.get.mockReturnValue(undefined)
    ctx.agents.resume.mockRejectedValue(new Error('not found'))
    const created = makeHandle('session-cron-new')
    ctx.agents.create.mockResolvedValue(created)
    const warn = vi.fn()
    const firer = new CronFirer(ctx as never, () => 'session-cold', vi.fn(async () => undefined), { warn })

    await firer.fire(job({}), new Date())

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('resume of dedicated session'))
    expect(ctx.agents.create).toHaveBeenCalledTimes(1)
    expect(created.agent.followup).toHaveBeenCalledTimes(1)
  })
})
