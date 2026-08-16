/**
 * Create/edit form for one scheduled task. Shows a live next-run preview via
 * croner (bundled into the client artifact), defaults the time zone to the
 * browser's, and submits through the host routes.
 */
import { useMemo, useState } from 'react'
import { Cron } from 'croner'
import type { ApiJob, ApiJobInput } from './api.ts'
import styles from './CronPage.module.css'

export interface JobFormProps {
  t: (key: string) => string
  initial?: ApiJob | null
  busy: boolean
  onSubmit: (input: ApiJobInput) => void
  onCancel: () => void
}

const PRESETS: Array<{ key: string; value: string }> = [
  { key: 'presetCustom', value: '' },
  { key: 'presetDaily9', value: '0 9 * * *' },
  { key: 'presetHourly', value: '0 * * * *' },
  { key: 'presetEvery5', value: '*/5 * * * *' },
  { key: 'presetWeekdays9', value: '0 9 * * 1-5' },
]

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 'ok' | 'invalid' | 'none' | 'future' — the preview verdict. */
function previewOf(schedule: string, timeZone: string): { kind: 'invalid' } | { kind: 'ok'; at: string } | { kind: 'none' } {
  if (schedule.trim() === '' || timeZone.trim() === '') return { kind: 'none' }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    return { kind: 'invalid' }
  }
  try {
    const next = new Cron(schedule, { timezone: timeZone }).nextRun()
    if (next === null) return { kind: 'none' }
    return { kind: 'ok', at: new Date(next.getTime()).toLocaleString() }
  } catch {
    return { kind: 'invalid' }
  }
}

export function JobForm({ t, initial, busy, onSubmit, onCancel }: JobFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [schedule, setSchedule] = useState(initial?.schedule ?? '0 9 * * *')
  const [timeZone, setTimeZone] = useState(initial?.timeZone ?? browserTimeZone())
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => previewOf(schedule, timeZone), [schedule, timeZone])

  function submit(): void {
    if (name.trim() === '' || schedule.trim() === '' || timeZone.trim() === '' || prompt.trim() === '') {
      setError(t('requiredFields'))
      return
    }
    if (preview.kind === 'invalid') {
      setError(t('invalidSchedule'))
      return
    }
    setError(null)
    onSubmit({
      name: name.trim(),
      schedule: schedule.trim(),
      timeZone: timeZone.trim(),
      prompt: prompt.trim(),
      enabled,
    })
  }

  return (
    <div className={styles.form}>
      <h3 className={styles.formTitle}>{initial === null || initial === undefined ? t('newJob') : t('editJob')}</h3>
      {error !== null && <div className={styles.error}>{error}</div>}

      <label className={styles.field}>
        <span>{t('name')}</span>
        <input value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
      </label>

      <label className={styles.field}>
        <span>{t('presets')}</span>
        <select
          disabled={busy}
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value
            if (value !== '') setSchedule(value)
          }}
        >
          {PRESETS.map((preset) => (
            <option key={preset.key} value={preset.value}>
              {t(preset.key)}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>{t('schedule')}</span>
        <input value={schedule} disabled={busy} placeholder={t('scheduleHint')} onChange={(event) => setSchedule(event.target.value)} />
      </label>

      <label className={styles.field}>
        <span>{t('timeZone')}</span>
        <input value={timeZone} disabled={busy} placeholder={t('timeZoneHint')} onChange={(event) => setTimeZone(event.target.value)} />
      </label>

      {preview.kind === 'ok' && <p className={styles.preview}>{`${t('nextRun')}: ${preview.at}`}</p>}
      {preview.kind === 'invalid' && <p className={styles.error}>{t('invalidSchedule')}</p>}

      <label className={styles.field}>
        <span>{t('prompt')}</span>
        <textarea value={prompt} disabled={busy} rows={4} placeholder={t('promptHint')} onChange={(event) => setPrompt(event.target.value)} />
      </label>

      <label className={styles.checkbox}>
        <input type="checkbox" checked={enabled} disabled={busy} onChange={(event) => setEnabled(event.target.checked)} />
        <span>{t('enabled')}</span>
      </label>

      <div className={styles.formActions}>
        <button className={styles.primary} disabled={busy} onClick={submit}>
          {initial === null || initial === undefined ? t('create') : t('save')}
        </button>
        <button disabled={busy} onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
