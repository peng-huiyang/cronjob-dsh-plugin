# cronjob-dsh-plugin

[中文](README.md) | [English](README.en.md)

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的**机器级定时任务插件**：
直接在 Web 设置页配置定时任务，到点后由宿主内部驱动、自动触发到专用「定时任务」会话 —— **脱手执行**。

## 功能

- **真实 cron 表达式**（5/6/7 段，支持 IANA 时区），基于 `croner`
- **Web 设置页「定时任务」**：新建、编辑、启停、删除、立即触发，表单实时显示下次运行预览
- **机器级持久任务表**：`ctx.settings` 命名空间，存储于 `~/.dsh/settings.yaml`，重启不丢
- **内部驱动触发**：到点后宿主以 `[CRON JOB]` 用户消息唤醒专用会话，agent 执行任务并在该会话中回复
- **模型工具** `cron_create` / `cron_list` / `cron_delete`：直接对 agent 说"以后每天 9 点做 X"，它就帮你建任务
- **宿主 HTTP 路由** `/cronjob/*`（list/create/update/toggle/delete/fire），变更类请求带同源校验

## 快速开始

```sh
# 1. 安装（npm 发布版）
dsh plugin --profile web add cronjob-dsh-plugin

# 2. 重启 dsh web
dsh web

# 3. 打开 设置 -> 定时任务，新建一个任务即可
```

**零配置开箱即用**：专用会话默认创建在 **`$DSH_HOME/cron-job`**（即 `~/.dsh/cron-job`，插件自动创建），
与你的日常工作区完全隔离——不需要配置任何路径。

> **可选覆盖**：想自定义专用会话的位置或名称时，编辑 `~/.dsh/profiles/web/cordis.patch.yml`：
>
> ```yaml
> - id: cronjob
>   config:
>     dedicatedSessionCwd: 'D:\你的\工作区'      # 可选：覆盖默认目录（必填绝对路径，需存在）
>     dedicatedSessionName: '定时任务'           # 可选：新建专用会话时的初始名称
> ```
> 专用会话会自动归入其工作目录对应的**工作区**（而不是「未分组」），会话行支持重命名。
> 修改 `dedicatedSessionCwd` 后无需手动删除旧会话：下一次触发会自动轮换到新目录。

## 工作原理

| 模块 | 职责 |
|---|---|
| `store` | 任务表 CRUD（settings 命名空间，带校验与串行写） |
| `scheduler` | 墙钟调度：算最近触发时刻 → 单定时器等待 → 唤醒后重读时钟，错过周期跳过 |
| `fire` | 把 `[CRON JOB]` 消息入队到专用会话（`whenIdle` + `runMaintenance` + `followup`） |
| `routes` | `/cronjob/*` HTTP 接口，供设置页调用 |
| `tools` | `cron_create` / `cron_list` / `cron_delete` 模型工具 |
| `client` | 设置页「定时任务」UI（tsdown 构建的浏览器包） |

## 文档

- [使用指南（中文）](docs/usage.zh.md) — 安装、配置、第一个任务、模型工具、卸载
- [开发指南（中文）](docs/development.zh.md) — 仓库结构、构建、测试、本地联调、发布
- [故障排查（中文）](docs/troubleshooting.zh.md) — 常见问题与解决方案

## 开发

```sh
npm install
npm run typecheck
npm test
npm run build   # host tsc -> lib/，client tsdown -> client/client.js
```

## 已知限制

- 调度器随 `dsh web` 进程存活：宿主关闭即停；重启后从当前时间重算下一次，**错过的周期不补跑**
- 每次触发 = 专用会话里一条用户消息，**消耗模型 token**；会话日志会持续增长，可用内置 `/compact` 压缩
- 触发消息中的任务文本按**不可信内容**处理（防止提示注入）

## 许可证

Apache-2.0
