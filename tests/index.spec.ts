import { join } from 'node:path'
import { homedir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultDedicatedCwd } from '../src/index.ts'

describe('defaultDedicatedCwd', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses $DSH_HOME/cron-job when DSH_HOME is set', () => {
    vi.stubEnv('DSH_HOME', 'C:\\custom\\dsh-home')
    expect(defaultDedicatedCwd()).toBe(join('C:\\custom\\dsh-home', 'cron-job'))
  })

  it('falls back to ~/.dsh/cron-job', () => {
    vi.stubEnv('DSH_HOME', '')
    expect(defaultDedicatedCwd()).toBe(join(homedir(), '.dsh', 'cron-job'))
  })
})
