# CatPing
<<<<<<< HEAD
一个Napcat插件
=======

一个聚焦于 **NapCat 违禁词监控并自动禁言** 的轻量插件。

## 功能

- 秒级监听群消息（OneBot v11 WebSocket）
- 命中违禁词后自动调用 `set_group_ban`
- 支持关键词匹配 + 正则匹配
- 支持用户白名单、群白名单
- 支持管理员/群主免罚
- 内置禁言冷却，避免重复触发

## 安装与部署（详细）

### 1. 前置条件

- 已安装并正常运行 NapCat（支持 OneBot v11）
- Node.js `>= 18`
- npm（Node.js 自带）
- Bot 账号在目标群中有管理员权限（否则无法禁言）

检查 Node 版本：

```bash
node -v
npm -v
```

### 2. 下载并安装依赖

在项目目录执行：

```bash
npm install
```

### 3. 在 NapCat 里开启 OneBot v11 WebSocket

在 NapCat 管理面板中确认以下信息：

- 已启用 OneBot v11
- 连接方式为 WebSocket（正向 WS）
- 监听地址和端口（例如 `ws://127.0.0.1:3001`）
- 如果启用了访问令牌，记下 token

这个地址和 token 要与 `config.json` 中配置一致。

### 4. 复制并编辑配置文件

复制模板：

```bash
cp config.json.example config.json
```

Windows PowerShell：

```powershell
Copy-Item config.json.example config.json
```

编辑 `config.json`，至少确认这几项：

- `wsUrl`: 你的 NapCat WS 地址
- `accessToken`: 如果 NapCat 开了鉴权就填上
- `banDurationSeconds`: 禁言时长（秒）
- `forbiddenWords`: 违禁词列表
- `regexRules`: 正则匹配规则（可选）

示例（可直接参考）：

```json
{
  "wsUrl": "ws://127.0.0.1:3001",
  "accessToken": "",
  "banDurationSeconds": 600,
  "banCooldownSeconds": 30,
  "ignoreAdmin": true,
  "ignoreOwner": true,
  "whitelistUserIds": [10001, 10002],
  "whitelistGroupIds": [],
  "forbiddenWords": ["测试违禁词", "badword"],
  "regexRules": ["\\bspam\\b"]
}
```

### 5. 启动插件

```bash
npm start
```

启动后如果看到类似日志，说明连接成功：

```text
[Info] 已连接到 NapCat: ws://127.0.0.1:3001
```

### 6. 进行一次联调验证

建议先用测试群验证，避免误封：

1. 将 `banDurationSeconds` 先设成较短时间（如 60 秒）
2. 用普通成员账号发送一个违禁词
3. 观察插件日志是否出现 `[Ban]` 记录
4. 确认目标成员是否被禁言

如果验证通过，再逐步增加词表和禁言时长。

### 7. 常见问题排查

- 连接不上 NapCat  
  检查 `wsUrl`、端口、防火墙、NapCat 是否已开启 WS。
- 提示鉴权失败  
  检查 `accessToken` 是否与 NapCat 配置一致。
- 命中违禁词但没有禁言  
  检查 bot 是否是群管理员；检查用户是否在白名单；检查是否命中冷却。
- 误封较多  
  缩短词表、减少宽泛正则、先用短时禁言观察效果。
- 没有任何日志  
  检查是否执行了 `npm start`，以及 Node 版本是否符合要求。

## 配置说明

- `wsUrl`: NapCat OneBot v11 WebSocket 地址
- `accessToken`: OneBot token（如果启用了鉴权）
- `banDurationSeconds`: 禁言时长（秒）
- `banCooldownSeconds`: 同一用户在同一群触发后的冷却（秒）
- `ignoreAdmin`: 是否忽略管理员
- `ignoreOwner`: 是否忽略群主
- `whitelistUserIds`: 用户白名单（QQ号）
- `whitelistGroupIds`: 群白名单（为空表示所有群都监控）
- `forbiddenWords`: 关键词列表（会做简单归一化）
- `regexRules`: 正则规则列表（区分大小写关闭）

## 触发逻辑

- 仅处理 `group_message`
- 如果消息命中关键词或正则规则：
  - 非白名单用户
  - 非管理员/群主（可配置）
  - 不在冷却期
  - 则执行自动禁言

## 注意

- 本插件只做监控与自动禁言，不做复杂 AI 对话。
- 为降低误封概率，建议先从较短禁言时长（如 60~300 秒）开始。
>>>>>>> a5ddb15 (Expand README with detailed setup and troubleshooting guide)
