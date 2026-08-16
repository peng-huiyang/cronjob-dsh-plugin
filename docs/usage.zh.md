# 使用指南

> cronjob-dsh-plugin —— DeepSeek Harness 机器级定时任务插件。本页面向使用者。

## 安装

```sh
dsh plugin --profile web add cronjob-dsh-plugin
```

安装完成后需要**重启 dsh web** 才会加载插件：

```sh
dsh web   # 或你惯用的启动命令
```

重启后打开 **设置 → 定时任务**，即可看到管理界面。

### 从 git 源码安装（可选）

```sh
dsh plugin --profile web add git+https://github.com/peng-huiyang/cronjob-dsh-plugin.git
```

git 源安装会在安装时执行构建脚本，pnpm 默认拦截，需先在
`~/.dsh/profiles/web/pnpm-workspace.yaml` 放行：

```yaml
allowBuilds:
  cronjob-dsh-plugin: true
```

## 配置

插件的可选配置通过 profile patch 提供（`~/.dsh/profiles/web/cordis.patch.yml`）：

```yaml
- id: cronjob
  config:
    # 专用会话的工作目录：决定它出现在哪个工作区、默认访问哪些文件。
    # 不配置时使用 dsh web 的启动目录。必须是已存在的绝对路径。
    dedicatedSessionCwd: 'D:\DeskTop\harness-test'
```

修改配置后重启 `dsh web` 生效。注意：**已存在的专用会话保持原目录**——想换位置，
先从 UI 删除该会话，下次触发会自动在配置的目录新建。

## 创建第一个任务

1. 打开 **设置 → 定时任务**，点「新建任务」
2. 填写：
   - **名称**：如 `每日备份`
   - **Cron 表达式**：如 `0 9 * * *`（每天 09:00，按下方时区解释）。支持 5/6/7 段：
     - `0 9 * * 1-5` — 工作日 09:00
     - `*/5 * * * *` — 每 5 分钟
     - `0 0 9 * * 1-5` — 6 段（秒 分 时 日 月 周）
   - **时区**：IANA 时区，如 `Asia/Shanghai`（默认取浏览器时区）
   - **任务内容**：触发时交给 agent 执行的任务文本，如 `备份 D:\DeskTop\harness-test 到 D:\backup`
3. 表单会实时显示「下次运行」预览；点「创建」

## 管理任务

| 操作 | 说明 |
|---|---|
| 启停开关 | 暂停/恢复任务，不影响其他任务 |
| 编辑 | 修改表达式、时区、任务内容等 |
| 立即触发 | 无视调度，立刻执行一次（用于测试） |
| 删除 | 移除任务（需确认） |

## 查看执行结果

每次触发后，消息和 agent 的执行/回复都出现在**专用「定时任务」会话**里
（侧边栏按工作区分组，注意 `dedicatedSessionCwd` 配置的目录）。任务卡片上
也会显示「上次运行」时间和失败原因（如有）。

## 用对话创建任务（模型工具）

插件注册了三个全局工具，agent 可以直接帮你管理任务：

- `cron_create` — 创建任务（表达式、时区、任务内容）
- `cron_list` — 列出所有任务及下次运行时间
- `cron_delete` — 按 id 删除任务

用法示例：

> 用户：以后每天早上 9 点帮我检查一下磁盘空间，并汇报到定时任务会话。
> agent：调用 `cron_create`，表达式 `0 9 * * *`，时区 `Asia/Shanghai`，
> 任务内容「检查 C 盘剩余空间并汇报」。

## 卸载

```sh
dsh plugin --profile web remove cronjob-dsh-plugin
# 重启 dsh web
```

任务数据保留在 `~/.dsh/settings.yaml` 的 `cronjob:` 段（不会自动删除，可手动清理）。

## 数据存储位置

- 任务表：`~/.dsh/settings.yaml` → `cronjob:` 段
- 专用会话日志：`~/.dsh/sessions/<工作区编码>/session-<id>`
