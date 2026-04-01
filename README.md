# CatPing

CatPing 是一个 NapCat 官方插件风格的轻量群管插件，专注于：

- 监听群消息
- 命中违禁词后自动禁言
- 支持白名单、管理员免罚、冷却防抖

## 这是什么形态

这是 **NapCat 内嵌插件**，不是额外常驻进程。

- 入口文件：`index.mjs`
- 生命周期导出：`plugin_init` / `plugin_onmessage` / `plugin_cleanup`
- 通过 `ctx.actions.call('set_group_ban', ...)` 直接调用 NapCat Action

官方文档依据：

- 插件机制与安装方式（放入 `plugins` 目录）  
  <https://napneko.github.io/develop/plugin/mechanism>
- 生命周期与 `package.json` 字段  
  <https://napneko.github.io/develop/plugin/>

## 安装（官方插件方式）

### 1. 准备目录

将整个插件目录命名为 `napcat-plugin-catping`，目录内至少包含：

```text
napcat-plugin-catping/
├── index.mjs
└── package.json
```

### 2. 放到 NapCat 插件目录

把 `napcat-plugin-catping` 整个文件夹复制到 NapCat 的 `plugins` 目录下。

常见数据目录示例（按你的部署方式可能不同）：

- Windows 常见数据目录：`%APPDATA%\QQ\NapCat`
- 最终目标通常是：`<NapCat数据目录>\plugins\napcat-plugin-catping`

### 3. 在 NapCat WebUI 启用插件

1. 打开 NapCat WebUI
2. 进入插件管理
3. 找到 `CatPing`
4. 启用/重载插件

启用后可在插件配置中直接修改参数（无需手改文件）。

## 配置项说明

- `enabled`: 是否启用插件
- `banDurationSeconds`: 禁言时长（秒）
- `banCooldownSeconds`: 同一用户冷却（秒）
- `ignoreAdmin`: 是否忽略管理员
- `ignoreOwner`: 是否忽略群主
- `whitelistUserIdsText`: 用户白名单（每行一个 QQ 号）
- `whitelistGroupIdsText`: 群白名单（每行一个群号，留空表示所有群）
- `forbiddenWordsText`: 违禁词（每行一个）
- `regexRulesText`: 正则规则（每行一个）
- `debug`: 调试日志

## 触发逻辑

仅处理 `group` 消息：

1. 判断是否启用
2. 判断群/用户是否在白名单
3. 判断是否为管理员/群主（可免罚）
4. 匹配关键词或正则
5. 未命中冷却则调用 `set_group_ban`

## 使用建议

- 首次上线建议先设短时禁言（60~300 秒）
- 先从小词表开始，逐步扩展
- 正则尽量精准，避免过宽匹配
