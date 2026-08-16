# cronjob-dsh-plugin

Machine-level cron jobs for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
configure scheduled tasks directly in the Web settings page; the host fires
internally-driven agent requests into a dedicated session — hands-off.

> **Status: M1–M4 implemented (skeleton, host core, HTTP routes + model tools,
> Web UI), unit-tested. M5 (install into a live profile) in progress.**

## Features

- Real cron expressions (5/6/7-field, IANA timezone) via `croner`
- Web settings page **Cron Jobs / 定时任务**: create, edit, enable/disable,
  delete, fire-now, live next-run preview
- Machine-level durable job table (`ctx.settings` namespace,
  `~/.dsh/settings.yaml`)
- Internally-driven firing: at the due time the host wakes the dedicated
  session with the job's prompt (`[CRON JOB]` user message); the agent
  executes and replies in that session's transcript
- Model tools `cron_create` / `cron_list` / `cron_delete` so the agent can
  manage its own jobs
- Host HTTP routes `/cronjob/*` (list/create/update/toggle/delete/fire) with
  same-origin protection on mutations

## Architecture

Single package with two halves (same pattern as the `dshmarket` plugin):

| Path | Half | Role |
|---|---|---|
| `src/index.ts` | Host | Plugin entry: store + scheduler + routes + tools wiring |
| `src/store.ts` | Host | Durable job table over the `cronjob` settings namespace |
| `src/schedule-util.ts` | Host | croner-based validation + next-occurrence computation |
| `src/scheduler.ts` | Host | Wall-clock scheduler (single armed timer, clock re-read on wake) |
| `src/fire.ts` | Host | Fires jobs into the dedicated session (`whenIdle` + `runMaintenance` + `followup`) |
| `src/routes.ts` | Host | `/cronjob/*` HTTP routes for the Web UI |
| `src/tools.ts` | Host | `cron_create` / `cron_list` / `cron_delete` model tools |
| `src/client/` | Client | Settings section UI (browser bundle via tsdown) |

## Install (once released)

```sh
dsh plugin --profile web add cronjob-dsh-plugin
# restart dsh web, open Settings -> Cron Jobs
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run build   # host tsc -> lib/, client tsdown -> client/client.js
```

## License

Apache-2.0
