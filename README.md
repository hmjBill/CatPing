# CatPing

CatPing 是一个 NapCat 官方插件风格的轻量群管插件，专注于：

- 监听群消息
- 命中违禁词后自动禁言
- 可选监测 `@机器人` 并自动禁言
- 可选检测发言者群昵称违禁 ID 并执行改名片/禁言
- 可选命中后自动撤回原消息
- 支持白名单、管理员免罚、冷却防抖

## 这是什么形态

这是 **NapCat 内嵌插件**，不是额外常驻进程。

- 入口文件：`index.mjs`
- 生命周期导出：`plugin_init` / `plugin_onmessage` / `plugin_cleanup`
- 通过 `ctx.actions.call('set_group_ban', ...)` 与 `ctx.actions.call('delete_msg', ...)` 直接调用 NapCat Action

官方文档依据：

- 插件机制与安装方式（放入 `plugins` 目录）  
  <https://napneko.github.io/develop/plugin/mechanism>
- 生命周期与 `package.json` 字段  
  <https://napneko.github.io/develop/plugin/>
- 撤回消息 Action（`delete_msg`）
  <https://napcat.apifox.cn/226919954e0>

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
- `banCooldownSeconds`: 同一用户冷却（秒）
- `ignoreAdmin`: 是否忽略管理员
- `ignoreOwner`: 是否忽略群主
- `debug`: 调试日志

关键词板块：
- `enableKeywordGuard`
- `keywordMuteDurationSeconds`
- `keywordGuardGroupIdsText`
- `keywordWhitelistUserIdsText`
- `onlyCheckTextMessage`（仅关键词板块生效）
- `forbiddenWordsText`: 违禁词（每行一个）
- `regexRulesText`: 正则规则（每行一个）
- `recallKeywordMessageOnHit`
- `recallKeywordWhenInCooldown`

`@机器人` 板块：
- `enableMentionGuard`
- `mentionMuteDurationSeconds`
- `mentionGuardGroupIdsText`
- `mentionWhitelistUserIdsText`
- `recallMentionMessageOnHit`
- `recallMentionWhenInCooldown`

用户 ID 板块：
- `enableUserIdGuard`
- `userIdMuteDurationSeconds`
- `forbiddenUserIdsText`（违禁昵称词条列表，每行一个，检测发言者群名片/昵称）
- `userIdGuardGroupIdsText`
- `userIdWhitelistUserIdsText`
- `userIdReplaceCardOnHit`（命中后是否修改群名片）
- `userIdReplacementText`（命中后设置的群名片文本）
- `banUserIdOnHit`（命中后是否执行禁言）
- `recallUserIdMessageOnHit`
- `recallUserIdWhenInCooldown`

## Config 写法细节

### 1. 文本列表字段支持哪些分隔符

以下字段都支持三种分隔方式，且可以混用：

- `forbiddenWordsText`
- `regexRulesText`
- `keywordGuardGroupIdsText`
- `keywordWhitelistUserIdsText`
- `mentionGuardGroupIdsText`
- `mentionWhitelistUserIdsText`
- `forbiddenUserIdsText`
- `userIdGuardGroupIdsText`
- `userIdWhitelistUserIdsText`

支持的分隔符：

- 换行：`词1\n词2`
- 英文逗号：`词1,词2`
- 中文逗号：`词1，词2`

示例（完全等价）：

```json
{
  "forbiddenWordsText": "广告\n引流\n赌博"
}
```

```json
{
  "forbiddenWordsText": "广告,引流,赌博"
}
```

```json
{
  "forbiddenWordsText": "广告，引流，赌博"
}
```

### 2. 推荐配置示例

```json
{
  "enabled": true,
  "banCooldownSeconds": 30,
  "ignoreAdmin": true,
  "ignoreOwner": true,
  "onlyCheckTextMessage": true,

  "enableKeywordGuard": true,
  "keywordMuteDurationSeconds": 300,
  "keywordGuardGroupIdsText": "100001,100002",
  "keywordWhitelistUserIdsText": "12345678",
  "forbiddenWordsText": "广告\n引流,赌博",
  "regexRulesText": "\\bspam\\b\n(?:买|卖).{0,6}(号|群)",
  "recallKeywordMessageOnHit": true,
  "recallKeywordWhenInCooldown": true,

  "enableMentionGuard": true,
  "mentionMuteDurationSeconds": 1800,
  "mentionGuardGroupIdsText": "100001,100002",
  "mentionWhitelistUserIdsText": "12345678",
  "recallMentionMessageOnHit": false,
  "recallMentionWhenInCooldown": false,

  "enableUserIdGuard": true,
  "userIdMuteDurationSeconds": 1200,
  "forbiddenUserIdsText": "黄焖鸡\n测试违禁昵称",
  "userIdGuardGroupIdsText": "100001",
  "userIdWhitelistUserIdsText": "10000",
  "userIdReplaceCardOnHit": true,
  "userIdReplacementText": "非法id，请改回去",
  "banUserIdOnHit": false,
  "recallUserIdMessageOnHit": true,
  "recallUserIdWhenInCooldown": true,

  "debug": false
}
```

### 3. 字段模式

当前版本仅使用三板块新字段（关键词 / `@机器人` / 用户 ID），不再读取旧兼容字段。

### 4. 常见注意点

- 关键词匹配会忽略大小写和空白字符。
- `onlyCheckTextMessage=true` 时，仅关键词板块检查文本段；关闭后关键词板块使用 `raw_message`。
- 正则是逐行编译，并统一使用不区分大小写（`i`）模式。
- 非法正则不会导致插件崩溃，会被跳过并记录警告日志。
- `keywordGuardGroupIdsText` 留空表示关键词板块在所有群生效。
- `mentionGuardGroupIdsText` 留空表示所有群都参与 `@机器人` 守卫。
- `userIdGuardGroupIdsText` 留空表示用户 ID 板块在所有群生效。
- 用户 ID 板块检测的是“发言者群名片/昵称是否包含违禁词条（忽略空白和大小写）”。

## 触发逻辑

仅处理 `group` 消息：

1. 判断是否启用
2. 判断是否为管理员/群主（可免罚）
3. 关键词板块：按关键词监控群 + 白名单用户过滤后执行关键词/正则匹配
4. `@机器人` 板块：按守卫群 + 白名单用户过滤后检测 `@机器人`
5. 用户 ID 板块：按监控群 + 白名单用户过滤后检测发言者群名片/昵称是否包含违禁词条
6. 任一板块命中后进入处罚流程；若同时命中，处罚原因会合并记录，禁言时长取命中板块中的较大值
7. 若用户 ID 板块命中且 `userIdReplaceCardOnHit=true`，调用 `set_group_card` 把群名片改为 `userIdReplacementText`
8. 若命中且对应撤回开关开启，则调用 `delete_msg` 撤回原消息
9. 需要禁言时调用 `set_group_ban`；用户 ID 板块是否禁言由 `banUserIdOnHit` 控制
10. 命中冷却时：默认仅跳过禁言；若对应的“冷却中仍撤回”开关开启则仍尝试撤回消息
