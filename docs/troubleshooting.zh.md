# 故障排查

> cronjob-dsh-plugin 常见问题与解决方案。按症状索引。

## 设置页没有「定时任务」入口

**原因**：插件未加载，或 client bundle 未生效。

排查步骤：

1. 确认已安装且已加入组合层：

   ```sh
   dsh --profile web --dump-config | findstr /C:cronjob
   ```
   应输出 `- id: cronjob / name: cronjob-dsh-plugin`。没有则先安装：
   ```sh
   dsh plugin --profile web add cronjob-dsh-plugin
   ```

2. 确认插件在启动时没有报错（`dsh web` 的启动输出）。若提示
   `failed to apply loader entry cronjob (...)`，见下方「启动失败」类目。

3. 插件已加载但仍无入口：**浏览器强刷**（Ctrl+F5）让新 client bundle 生效，
   或确认 dsh web 是在插件安装**之后**启动的。

## 触发后没有消息 / 报错 "prompt variable {{model}} has no value"

**原因**：专用会话没有安装模型选择（程序化创建的会话与 UI 创建的区别）。
0.1.0 已内置修复（创建/恢复时自动 `installModelSelection`）。

**处理**：升级到 ≥ 0.1.0 并重启 dsh web。若仍出现，检查 dsh 的启动日志
（宿主日志中的 `cronjob:` warn 行）。

## 触发成功但看不到执行结果

**原因一：会话在工作区里但被分组到别处。** 专用会话的工作目录 = `dedicatedSessionCwd`
配置值（未配置时为 dsh web 的启动目录）。会话侧边栏按工作区分组，切到对应工作区
或展开「未分组 / Ungrouped」。

> **版本 ≥ 0.1.1 已修复分组**：插件会把专用会话自动记入其工作目录对应的工作区，
> 不再落入「未分组」，会话行也支持正常重命名。升级后已存在的旧会话会在下一次触发时自动补齐记账。

**原因二：会话被归档了。** 归档是单向操作（当前 DSH 版本没有取消归档 API），
归档的会话会从所有分组中隐藏。插件会在下一次触发时**自动轮换**：检测到专用会话
被归档 → 新建一个并更新记录（0.1.0 起，含缓存路径）。重启 dsh web 后触发一次即可看到新会话。

**原因三：任务被禁用。** 任务卡片上的开关是关的就不会触发（「立即触发」不受影响）。

## 专用会话落在不期望的工作区

**默认无需配置**：专用会话默认在 `$DSH_HOME/cron-job`（`~/.dsh/cron-job`，自动创建），
自动归入独立工作区，与日常会话隔离。若确实需要自定义目录：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- id: cronjob
  config:
    dedicatedSessionCwd: 'D:\DeskTop\cron-job'   # 必须是已存在的绝对路径，否则加载报错
```

**修改该配置后无需手动删除旧会话**：版本 ≥ 0.1.2 的插件会在下一次触发时检测到
会话 cwd 与配置不一致，自动轮换到新目录的新会话（旧会话保留在原工作区，可自行删除）。

## 启动失败：`failed to apply loader entry cronjob`

常见于改过代码后：

- **`unsupported JSON schema: schema.required ...` / `... .optional is not supported`**
  —— 改 `src/tools.ts` 时违反了 `defineTool` 的 schema DSL 规则：
  - 输出 schema **不要**写顶层 `required: [...]` 数组，改用**属性级** `required: true`
  - 参数与输出对象属性同理：`{ type: 'string', required: true, description: ... }`
  - 可空字段用 `oneOf: [{ type: 'string' }, { type: 'null' }]`
  - 修改后运行 `npm run build` 并重启 dsh web（单测不会走到 DSL 校验，
    可跑 `tests/tools.spec.ts` 覆盖）
- **其他报错**：把 `dsh web` 的完整启动输出贴到 Issue。

## 任务没按预期时间触发

- **时区问题**：cron 表达式按任务的 `timeZone` 解释（IANA 格式）。检查任务卡片上的时区。
- **宿主未运行**：调度器在 `dsh web` 进程内，进程关闭即停。
- **错过周期不补跑**：重启后从当前时间重算下一次，错过的周期**跳过**（设计如此）。
- **验证**：任务卡片显示「下次运行」时间；也可以用「立即触发」手动验证。

## 升级插件后行为异常

- 确认升级后重启了 dsh web（宿主与 client bundle 都是启动时加载的）。
- 若用 link: 本地开发版，改动代码后需 `npm run build` 再重启。
- 任务数据存在 `~/.dsh/settings.yaml`，升级不影响；如确需重置可手动删除 `cronjob:` 段
  （先停 dsh web）。

## 其他

- **token 消耗**：每次触发 = 一条进入专用会话的用户消息，会消耗模型 token。
  可用 `/compact` 压缩会话历史。
- **会话日志增长**：专用会话长期运行会累积，定期 `/compact` 或新建任务会话。
- **修改配置后不生效**：`cordis.patch.yml` 的改动需要重启 dsh web；
  patch 是按 entry id 整体替换 config，别漏写其他字段。
