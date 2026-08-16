import { describe, expect, it, vi } from 'vitest'
import { registerCronTools } from '../src/tools.ts'
import type { CronJobStore } from '../src/store.ts'

/** A store stub; the tools never call it at registration time. */
function storeStub(): CronJobStore {
  return {
    list: () => [],
    get: () => undefined,
    getDedicatedSessionId: () => undefined,
    watch: () => () => undefined,
    register: () => undefined,
    create: async () => { throw new Error('unused') },
    update: async () => undefined,
    remove: async () => false,
    setEnabled: async () => undefined,
    markRun: async () => undefined,
    setDedicatedSessionId: async () => undefined,
    warn: () => undefined,
  } as unknown as CronJobStore
}

describe('registerCronTools', () => {
  it('registers the three tools without schema DSL violations (boot path)', () => {
    const registered: string[] = []
    const ctx = {
      tools: {
        register: (definition: { name: string }) => {
          registered.push(definition.name)
          return () => undefined
        },
      },
      logger: { warn: vi.fn() },
    }
    const dispose = registerCronTools(ctx as never, { store: storeStub() })
    expect(registered).toEqual(['cron_create', 'cron_list', 'cron_delete'])
    dispose()
  })
})
