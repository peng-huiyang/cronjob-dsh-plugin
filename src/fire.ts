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
import { installModelSelection, type Agent, type AgentHandle, type ModelSelection, type ModelSelectionRef } from '@deepseek-ai/dsh-agent'
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

/**
 * Build a model selection ref for the dedicated session: the session's own
 * logged request header when one exists, otherwise the deployment default.
 * Mirrors the ApiProxy's selectionFor so prompt assembly can resolve
 * `{{model}}`/`{{provider}}` variables and route requests.
 */
function makeModelSelection(agent: Agent, getDefault: () => ModelSelection | undefined): ModelSelectionRef {
  const ref: ModelSelectionRef = {
    get current(): ModelSelection | undefined {
      const logged = agent.session.requestHeader()?.config
      if (logged !== undefined) {
        return {
          provider: logged.provider,
          model: logged.model,
          ...(logged.reasoningEffort === undefined ? {} : { reasoningEffort: logged.reasoningEffort }),
        }
      }
      return getDefault()
    },
    // The cron session keeps log/default resolution; when the user opens the
    // session in the Web UI, the UI's own per-session selection handles
    // overrides on top of the listeners installed here.
    set current(_next: ModelSelection | undefined) {},
    assembled: undefined,
  }
  return ref
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

  /** The deployment default model selection, when the service is mounted. */
  private defaultSelection(): ModelSelection | undefined {
    const service = this.ctx.get('agentDefaultModel') as { currentSelection(): ModelSelection } | undefined
    return service?.currentSelection()
  }

  /** Pre-publication setup installing the model selection on a fresh/resumed agent. */
  private installSelection(agentCtx: { agent?: Agent }): void {
    const agent = agentCtx.agent
    if (agent === undefined) return // cannot happen through the factory; keep setup total
    installModelSelection(agent.ctx, makeModelSelection(agent, () => this.defaultSelection()))
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
        const handle = await this.ctx.agents.resume({ resumeSessionId: SessionId(id), setup: (agentCtx) => this.installSelection(agentCtx) })
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
    const handle = await this.ctx.agents.create({
      sessionId,
      meta: { cwd: this.dedicatedSessionCwd ?? process.cwd() },
      setup: (agentCtx) => this.installSelection(agentCtx),
    })
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
