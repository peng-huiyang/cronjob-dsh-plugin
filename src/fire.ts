/**
 * Firing path: queues the job's task into the dedicated session. The session
 * is created lazily on first fire, resumed from persistence on later boots,
 * and adopted when it is already live (e.g. the user opened it in the Web
 * UI). All deliveries use the idle-phase maintenance claim so they never race
 * an active turn.
 * @module cronjob-dsh-plugin
 */
import { randomUUID } from 'node:crypto'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Agent, AgentHandle } from '@deepseek-ai/dsh-agent'
import type { Context } from '@deepseek-ai/cordis'
import type { CronJob } from './types.ts'
import { renderThrown } from './util.ts'

export interface FirerLogger {
  warn(message: string): void
}

/** Stable user-role framing for one fired job. The task text is untrusted content. */
export function renderCronFraming(job: CronJob, occurrenceAt: Date): string {
  return [
    '[CRON JOB]',
    `name: ${job.name}`,
    `occurrence_at: ${occurrenceAt.toISOString()}`,
    `task: ${job.prompt}`,
  ].join('\n')
}

/** Queues one job's task into the dedicated session, waking the agent. */
export class CronFirer {
  private handles: AgentHandle[] = []
  private dedicated: Agent | null = null

  constructor(
    private readonly ctx: Context,
    private readonly getDedicatedSessionId: () => string | undefined,
    private readonly setDedicatedSessionId: (id: string) => Promise<void>,
    private readonly logger: FirerLogger,
    /** Working directory for a freshly created dedicated session. */
    private readonly dedicatedSessionCwd?: string,
  ) {}

  /**
   * Whether the workspace registry reports the session as archived (hidden
   * from every UI grouping surface). Archived sessions are unarchivable in
   * the current harness, so the plugin rotates away from them.
   */
  private isArchived(id: string): boolean {
    const registry = this.ctx.get('workspaceRegistry') as { archivedSessionIds?: readonly unknown[] } | undefined
    if (registry?.archivedSessionIds === undefined) return false
    return (registry.archivedSessionIds as readonly string[]).includes(id)
  }

  /**
   * Resolve the dedicated firing session: the live agent, a resumed persisted
   * session, or a freshly created one. An archived dedicated session is
   * abandoned in favor of a fresh one.
   */
  async ensureDedicatedAgent(): Promise<Agent> {
    if (this.dedicated !== null && this.ctx.agents.get(this.dedicated.id) === this.dedicated) {
      return this.dedicated
    }
    this.dedicated = null
    const id = this.getDedicatedSessionId()
    if (id !== undefined && !this.isArchived(id)) {
      const live = this.ctx.agents.get(SessionId(id))
      if (live !== undefined) {
        this.dedicated = live
        return live
      }
      try {
        const handle = await this.ctx.agents.resume({ resumeSessionId: SessionId(id) })
        this.handles.push(handle)
        this.dedicated = handle.agent
        return handle.agent
      } catch (error) {
        this.logger.warn(`cronjob: resume of dedicated session "${id}" failed, creating a fresh one: ${renderThrown(error)}`)
      }
    } else if (id !== undefined) {
      this.logger.warn(`cronjob: dedicated session "${id}" is archived (hidden from the UI); rotating to a fresh session`)
    }
    const sessionId = SessionId(`session-${randomUUID()}`)
    const handle = await this.ctx.agents.create({ sessionId, meta: { cwd: this.dedicatedSessionCwd ?? process.cwd() } })
    this.handles.push(handle)
    this.dedicated = handle.agent
    try {
      await this.setDedicatedSessionId(sessionId)
    } catch (error) {
      this.logger.warn(`cronjob: could not persist dedicated session id: ${renderThrown(error)}`)
    }
    return handle.agent
  }

  /**
   * Queue one job's task into the dedicated session. Throws when the session
   * cannot be resolved or the agent is busy with a turn or another
   * maintenance task.
   * @param job - the fired job.
   * @param occurrenceAt - the occurrence this delivery corresponds to.
   */
  async fire(job: CronJob, occurrenceAt: Date): Promise<void> {
    const agent = await this.ensureDedicatedAgent()
    await agent.whenIdle()
    await agent.runMaintenance(() => {
      const message = createUserMessage({
        content: [{ type: 'text', text: renderCronFraming(job, occurrenceAt) }],
        source: { kind: 'plugin', plugin: 'cronjob' },
      })
      agent.followup(message)
      return Promise.resolve()
    })
  }
}
