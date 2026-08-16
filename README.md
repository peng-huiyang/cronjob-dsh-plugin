# cronjob-dsh-plugin

English | [中文](README.zh.md)

Machine-level cron jobs for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness):
configure scheduled tasks directly in the Web settings page; the host fires
internally-driven agent requests into a dedicated session — hands-off.

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

## Documentation

- [使用指南（中文）](docs/usage.zh.md) — install, configure, first job, model tools
- [开发指南（中文）](docs/development.zh.md) — structure, build, test, local dev, release
- [故障排查（中文）](docs/troubleshooting.zh.md) — common issues and fixes

## Install

```sh
dsh plugin --profile web add cronjob-dsh-plugin
# restart dsh web, open Settings -> Cron Jobs
```

The dedicated firing session is created with the dsh process cwd as its
working directory, which groups it under that directory's workspace in the
UI. To pin it to a specific workspace instead, configure the plugin in your
profile patch (`~/.dsh/profiles/web/cordis.patch.yml`):

```yaml
- id: cronjob
  name: cronjob-dsh-plugin
  config:
    dedicatedSessionCwd: 'D:\DeskTop\harness-test'
```

An existing dedicated session keeps its original cwd; delete it from the UI
and the next fire creates a fresh one at the configured path.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build   # host tsc -> lib/, client tsdown -> client/client.js
```

## Known limitations

- The scheduler lives inside the `dsh web` process: it stops when the host is
  down and recomputes the next run from the current time on restart (missed
  occurrences are skipped).
- Each fire injects one user-role message into the dedicated session and
  consumes model tokens; the session log grows over time (use the built-in
  `/compact` command to compress it).
- The task text is treated as untrusted content by the firing framing.

## License

Apache-2.0
