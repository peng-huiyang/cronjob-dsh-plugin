/**
 * Cron job management page: lists machine-level scheduled tasks with their
 * next run, enablement, and last-run outcome; creates, edits, toggles,
 * deletes, and fires them through the /cronjob/* host routes.
 */
import { useCallback, useEffect, useState } from 'react'
import { createJob, deleteJob, fireJob, listJobs, toggleJob, updateJob, type ApiJob, type ApiJobInput } from './api.ts'
import { JobForm } from './JobForm.tsx'
import styles from './CronPage.module.css'

export interface CronPageProps {
  /** Bound locale translator for the cronjob namespace. */
  t: (key: string) => string
}

type Editing = ApiJob | 'new' | null

export function CronPage({ t }: CronPageProps) {
  const [jobs, setJobs] = useState<ApiJob[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { jobs: next } = await listJobs()
      setJobs(next)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Run one mutation, surface errors, and refresh the list on success. */
  async function run(action: () => Promise<unknown>, okMessage: string): Promise<boolean> {
    setBusy(true)
    setNotice(null)
    setLoadError(null)
    try {
      await action()
      setNotice(okMessage)
      await refresh()
      return true
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (input: ApiJobInput): Promise<void> => {
    const ok = editing === 'new'
      ? await run(() => createJob(input), t('saved'))
      : editing !== null
        ? await run(() => updateJob(editing.id, input), t('saved'))
        : false
    if (ok) setEditing(null)
  }

  return (
    <div className={styles.page}>
      <p className={styles.subtitle}>{t('subtitle')}</p>
      {loadError !== null && <div className={styles.error}>{loadError}</div>}
      {notice !== null && <div className={styles.notice}>{notice}</div>}

      {editing !== null && (
        <JobForm
          t={t}
          initial={editing === 'new' ? null : editing}
          busy={busy}
          onSubmit={(input) => void onSubmit(input)}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className={styles.toolbar}>
        <button className={styles.primary} disabled={busy || editing !== null} onClick={() => setEditing('new')}>
          {t('newJob')}
        </button>
      </div>

      {jobs === null ? (
        <p>{t('loading')}</p>
      ) : jobs.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        <ul className={styles.list}>
          {jobs.map((job) => (
            <li key={job.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.jobName}>{job.name}</div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={job.enabled}
                    disabled={busy}
                    onChange={(event) => void run(() => toggleJob(job.id, event.target.checked), t('saved'))}
                  />
                  <span>{job.enabled ? t('on') : t('off')}</span>
                </label>
              </div>
              <div className={styles.meta}>
                <code>{job.schedule}</code>
                <span>{job.timeZone}</span>
                <span>{`${t('nextRun')}: ${job.nextRunAt !== null ? new Date(job.nextRunAt).toLocaleString() : t('never')}`}</span>
                <span>
                  {`${t('lastRun')}: ${job.lastRunAt !== undefined ? new Date(job.lastRunAt).toLocaleString() : t('never')}`}
                </span>
              </div>
              {job.lastError !== undefined && <div className={styles.error}>{job.lastError}</div>}
              <div className={styles.actions}>
                <button disabled={busy} onClick={() => setEditing(job)}>
                  {t('editJob')}
                </button>
                <button disabled={busy} onClick={() => void run(() => fireJob(job.id), t('fired'))}>
                  {t('fireNow')}
                </button>
                <button
                  className={styles.danger}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t('confirmDelete'))) void run(() => deleteJob(job.id), t('deleted'))
                  }}
                >
                  {t('delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
