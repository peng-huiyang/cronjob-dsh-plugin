/**
 * cronjob-dsh-plugin client: registers a "Cron Jobs" settings section that
 * manages the machine-level scheduled tasks. Built by tsdown into the
 * __ModuleLoader__ factory bundle at client/client.js; the only externals are
 * the loader module table's react entries.
 */
import { createElement as h } from 'react'
import { en, zh } from './locales.ts'
import { CronPage } from './CronPage.tsx'

const NS = 'cronjob'

/** The subset of the locale service this plugin touches. */
interface LocaleService {
  register(namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): (key: string) => string
}

/** The subset of the slots service this plugin touches. */
interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, component: () => unknown): unknown
}

/** The client cordis context shape this plugin relies on (structural: the
 * host provides the real Context; typing the touched surface keeps this
 * external package free of monorepo-internal type dependencies). */
interface CronClientContext {
  effect(callback: () => unknown, label?: string): void
  locale: LocaleService
  slots: SlotsService
}

export const name = 'cronjob-dsh-plugin'
export const inject = ['slots', 'locale']

export function apply(ctx: CronClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'cronjob: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'cronjob',
    order: 50,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ t }),
  }, () => h(CronPage, { t })))
}
