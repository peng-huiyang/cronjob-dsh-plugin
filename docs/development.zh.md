# 开发指南

> cronjob-dsh-plugin —— DeepSeek Harness 机器级定时任务插件。本页面向开发者。

## 仓库结构

```
cronjob-dsh-plugin/
├── package.json          # dsh.bundle + dsh.client 声明；依赖与脚本
├── cordis.patch.yml      # bundle patch：把插件条目插入 profile 组合层
├── tsconfig.json         # Host 端 tsc 工程（src → lib/）
├── tsconfig.client.json  # Client 端类型检查工程（src/client）
├── tsdown.config.ts      # Client bundle 构建（client/client.js）
├── scripts/normalize-client-banner.mjs  # 规整 __ModuleLoader__ banner
├── src/                  # Host 端（Node，运行在 dsh 进程内）
│   ├── index.ts          # 插件入口：store + scheduler + routes + tools 组装
│   ├── store.ts          # settings 命名空间上的持久任务表（CRUD）
│   ├── schedule-util.ts  # croner 封装：校验 + 下次发生时刻计算
│   ├── scheduler.ts      # 墙钟调度器（单定时器、唤醒重读时钟）
│   ├── fire.ts           # 触发到专用会话（含模型选择安装、归档轮换）
│   ├── routes.ts         # /cronjob/* HTTP 路由（同源校验）
│   ├── tools.ts          # cron_create / cron_list / cron_delete
│   ├── types.ts          # 共享领域类型
│   └── util.ts           # 小工具
├── src/client/           # Client 端（浏览器，tsdown 打包）
│   ├── index.ts          # 注册 locale + 设置页「定时任务」section
│   ├── CronPage.tsx      # 任务列表/操作
│   ├── JobForm.tsx       # 新建/编辑表单（croner 实时预览）
│   ├── api.ts            # /cronjob/* fetch 封装
│   └── locales.ts        # zh/en 文案
├── tests/                # vitest 单元测试
└── docs/                 # 文档
```

## 环境准备

- Node.js ≥ 22.19（或 ≥ 24）
- pnpm 或 npm

```sh
npm install
```

## 常用命令

```sh
npm run typecheck   # Host + Client 两侧 tsc 检查
npm test            # vitest 单元测试（当前 42 个）
npm run build       # tsc 编译 Host -> lib/；tsdown 打包 Client -> client/client.js
```

> 注意：`defineTool` 的 schema 是 DSL，**只在插件加载时校验**（单测不会走到）。
> 改过 `src/tools.ts` 后务必用 `dsh web` 实际启动验证，或运行
> `tests/tools.spec.ts`（它走真实的 defineTool 编译路径）。

## 架构要点

### 双半结构

单包 = Host（Node，跑在 dsh 进程内）+ Client（浏览器 bundle）。
Host 通过 `cordis.patch.yml` 插入组合层；Client 通过 `package.json` 的
`dsh.client` 声明 + `exports["./client"]` 由 web 应用自动加载。

### 核心流程

```
设置页 (fetch /cronjob/*) ──> store（settings 持久化）
                                │
scheduler（croner 算 nextRun，setTimeout 等待）
                                │ 到点
fire（whenIdle → runMaintenance → followup([CRON JOB] 消息)）
                                │
                专用会话（agent 执行任务 → 回复写回会话日志）
```

- **持久化**：`ctx.settings` 命名空间 `cronjob`，文件在 `~/.dsh/settings.yaml`；
  所有变更走内部串行队列（read-modify-write 原子）。
- **触发**：`agent.followup()` 入队 durable 的用户消息并唤醒 driver；
  用 `runMaintenance` 独占空闲期，避免与正在进行的对话竞争。
- **模型选择**：专用会话由插件程序化创建，必须在 `setup` 阶段
  `installModelSelection`（读会话日志，否则回退 `agentDefaultModel`），
  否则 persona 里的 `{{model}}` 无法解析。
- **归档轮换**：DSH 当前没有取消归档 API；插件检测到专用会话被归档
  （`workspaceRegistry.archivedSessionIds`）时自动轮换到新会话，
  缓存命中路径也检查（见 `tests/fire.spec.ts`）。

## 本地联调

```sh
# 1. 用 link: 把本地代码装进 profile（改动即时生效，需重启 dsh web）
dsh plugin --profile web add link:D:\DeskTop\harness-test\cronjob-dsh-plugin

# 2. 查看组合结果（不启动服务）
dsh --profile web --dump-config | findstr /C:cronjob

# 3. 改代码后重建 + 测试
npm run build && npm test

# 4. 重启 dsh web，浏览器强刷，验证设置页与触发
```

> 从 link: 切回注册表版：先改 `~/.dsh/profiles/web/package.json` 里依赖为
> `^0.1.0`，删除旧 junction 后 `pnpm install`（或直接 `dsh plugin --profile web add cronjob-dsh-plugin@0.1.0`）。

## 发布

```sh
npm version patch    # 0.1.0 -> 0.1.1（同时打 git tag）
npm publish          # prepack 会自动构建；发布到 registry.npmjs.org
git push --tags

# 使用方升级（profile 目录内）
pnpm update cronjob-dsh-plugin
```

## 测试约定

- 单测覆盖纯逻辑：cron 计算、调度器时序、store CRUD、路由校验、
  触发路径（含归档轮换、模型选择安装）。
- 用 fake timers（`vi.setSystemTime`）测调度器，不依赖真实时钟。
- 端到端验证（手动）：装进 profile → UI 建任务 → 立即触发 → 检查专用会话。

## 许可证

Apache-2.0
