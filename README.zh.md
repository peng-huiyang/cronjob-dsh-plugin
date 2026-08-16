# cronjob-dsh-plugin

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的机器级定时任务插件：
直接在 Web 设置页配置定时任务，到点后由宿主内部驱动、自动触发到专用「定时任务」会话 —— 脱手执行。

> **状态：M1–M4 已完成**（骨架、宿主核心、HTTP 路由 + 模型工具、Web UI），单元测试通过；
> M5（装入实际 profile 联调）进行中。

## 功能

- 真实 cron 表达式（5/6/7 段，支持 IANA 时区），基于 `croner`
- Web 设置页 **定时任务 / Cron Jobs**：新建、编辑、启停、删除、立即触发、实时下次运行预览
- 机器级持久任务表（`ctx.settings` 命名空间，存储于 `~/.dsh/settings.yaml`）
- 内部驱动触发：到点后宿主以 `[CRON JOB]` 用户消息唤醒专用会话，agent 执行任务并在该会话中回复
- 模型工具 `cron_create` / `cron_list` / `cron_delete`，agent 可自行管理任务
- 宿主 HTTP 路由 `/cronjob/*`（list/create/update/toggle/delete/fire），变更类请求带同源校验

## 架构

单包双半（与 `dshmarket` 插件同款模式）：

| 路径 | 半 | 职责 |
|---|---|---|
| `src/index.ts` | Host | 插件入口：store + scheduler + routes + tools 组装 |
| `src/store.ts` | Host | `cronjob` settings 命名空间上的持久任务表 |
| `src/schedule-util.ts` | Host | 基于 croner 的校验与下次发生时刻计算 |
| `src/scheduler.ts` | Host | 墙钟调度器（单定时器，唤醒后重读时钟） |
| `src/fire.ts` | Host | 触发到专用会话（`whenIdle` + `runMaintenance` + `followup`） |
| `src/routes.ts` | Host | 面向 Web UI 的 `/cronjob/*` HTTP 路由 |
| `src/tools.ts` | Host | `cron_create` / `cron_list` / `cron_delete` 模型工具 |
| `src/client/` | Client | 设置页 UI（tsdown 构建浏览器包） |

## 安装（发布后）

```sh
dsh plugin --profile web add cronjob-dsh-plugin
# 重启 dsh web，打开 设置 -> 定时任务
```

## 开发

```sh
npm install
npm run typecheck
npm test
npm run build   # host tsc -> lib/，client tsdown -> client/client.js
```

## 许可证

Apache-2.0
