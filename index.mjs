import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = {
  enabled: true,
  banDurationSeconds: 600,
  banCooldownSeconds: 30,
  ignoreAdmin: true,
  ignoreOwner: true,
  whitelistUserIdsText: '',
  whitelistGroupIdsText: '',
  forbiddenWordsText: '测试违禁词\nbadword',
  regexRulesText: '\\bspam\\b',
  debug: false,
};

const runtime = {
  ctx: null,
  config: { ...DEFAULT_CONFIG },
  lastBanByUserInGroup: new Map(),
  keywordRules: [],
  regexRules: [],
  whitelistUsers: new Set(),
  whitelistGroups: new Set(),
};

export let plugin_config_ui = [];
export let plugin_config_schema = [];

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function splitTextList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitNumberList(value) {
  return splitTextList(value)
    .map((item) => Number(item))
    .filter((num) => Number.isFinite(num) && num > 0);
}

function sanitizeConfig(raw) {
  const cfg = { ...DEFAULT_CONFIG };

  if (raw && typeof raw === 'object') {
    if (typeof raw.enabled === 'boolean') cfg.enabled = raw.enabled;
    if (typeof raw.banDurationSeconds === 'number') cfg.banDurationSeconds = raw.banDurationSeconds;
    if (typeof raw.banCooldownSeconds === 'number') cfg.banCooldownSeconds = raw.banCooldownSeconds;
    if (typeof raw.ignoreAdmin === 'boolean') cfg.ignoreAdmin = raw.ignoreAdmin;
    if (typeof raw.ignoreOwner === 'boolean') cfg.ignoreOwner = raw.ignoreOwner;
    if (typeof raw.debug === 'boolean') cfg.debug = raw.debug;

    if (raw.whitelistUserIdsText !== undefined) {
      cfg.whitelistUserIdsText = String(raw.whitelistUserIdsText);
    } else if (raw.whitelistUserIds !== undefined) {
      cfg.whitelistUserIdsText = splitNumberList(raw.whitelistUserIds).join('\n');
    }

    if (raw.whitelistGroupIdsText !== undefined) {
      cfg.whitelistGroupIdsText = String(raw.whitelistGroupIdsText);
    } else if (raw.whitelistGroupIds !== undefined) {
      cfg.whitelistGroupIdsText = splitNumberList(raw.whitelistGroupIds).join('\n');
    }

    if (raw.forbiddenWordsText !== undefined) {
      cfg.forbiddenWordsText = String(raw.forbiddenWordsText);
    } else if (raw.forbiddenWords !== undefined) {
      cfg.forbiddenWordsText = splitTextList(raw.forbiddenWords).join('\n');
    }

    if (raw.regexRulesText !== undefined) {
      cfg.regexRulesText = String(raw.regexRulesText);
    } else if (raw.regexRules !== undefined) {
      cfg.regexRulesText = splitTextList(raw.regexRules).join('\n');
    }
  }

  cfg.banDurationSeconds = Math.max(1, Math.min(30 * 24 * 3600, Math.floor(Number(cfg.banDurationSeconds) || 600)));
  cfg.banCooldownSeconds = Math.max(0, Math.min(3600, Math.floor(Number(cfg.banCooldownSeconds) || 30)));

  return cfg;
}

function buildRuntimeCaches() {
  const cfg = runtime.config;

  runtime.whitelistUsers = new Set(splitNumberList(cfg.whitelistUserIdsText));
  runtime.whitelistGroups = new Set(splitNumberList(cfg.whitelistGroupIdsText));

  runtime.keywordRules = splitTextList(cfg.forbiddenWordsText)
    .map((word) => normalizeText(word))
    .filter(Boolean);

  runtime.regexRules = [];
  for (const pattern of splitTextList(cfg.regexRulesText)) {
    try {
      runtime.regexRules.push(new RegExp(pattern, 'i'));
    } catch (error) {
      runtime.ctx?.logger?.warn(`[CatPing] 跳过非法正则 ${pattern}: ${error?.message || error}`);
    }
  }
}

function loadConfig(ctx) {
  const configPath = ctx.configPath;

  try {
    if (configPath && fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      runtime.config = sanitizeConfig(raw);
    } else {
      runtime.config = { ...DEFAULT_CONFIG };
      saveConfig(ctx);
    }
  } catch (error) {
    ctx.logger.error('[CatPing] 加载配置失败，已回退默认配置:', error);
    runtime.config = { ...DEFAULT_CONFIG };
  }

  buildRuntimeCaches();
}

function saveConfig(ctx) {
  const configPath = ctx.configPath;

  if (!configPath) {
    return;
  }

  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(runtime.config, null, 2), 'utf8');
  } catch (error) {
    ctx.logger.error('[CatPing] 保存配置失败:', error);
  }
}

function buildConfigUI(ctx) {
  return ctx.NapCatConfig.combine(
    ctx.NapCatConfig.plainText('CatPing：违禁词命中后自动禁言（群消息）。'),
    ctx.NapCatConfig.boolean('enabled', '启用插件', true, '关闭后不处理任何消息', true),
    ctx.NapCatConfig.number('banDurationSeconds', '禁言时长（秒）', 600, '建议先从 60~300 秒开始', true),
    ctx.NapCatConfig.number('banCooldownSeconds', '同用户冷却（秒）', 30, '避免重复触发刷屏禁言', true),
    ctx.NapCatConfig.boolean('ignoreAdmin', '忽略管理员', true, '管理员命中后不处罚', true),
    ctx.NapCatConfig.boolean('ignoreOwner', '忽略群主', true, '群主命中后不处罚', true),
    ctx.NapCatConfig.text(
      'whitelistUserIdsText',
      '用户白名单',
      '',
      '每行一个 QQ 号，或用英文逗号分隔',
      true,
    ),
    ctx.NapCatConfig.text(
      'whitelistGroupIdsText',
      '群白名单',
      '',
      '留空表示所有群都生效；每行一个群号',
      true,
    ),
    ctx.NapCatConfig.text(
      'forbiddenWordsText',
      '违禁词关键词',
      '测试违禁词\nbadword',
      '每行一个关键词；匹配时会忽略空白和大小写',
      true,
    ),
    ctx.NapCatConfig.text(
      'regexRulesText',
      '违禁词正则（可选）',
      '\\bspam\\b',
      '每行一个正则表达式，大小写不敏感',
      true,
    ),
    ctx.NapCatConfig.boolean('debug', '调试日志', false, '开启后打印更多命中日志', true),
  );
}

function inCooldown(groupId, userId) {
  const cd = runtime.config.banCooldownSeconds;
  if (cd <= 0) return false;

  const key = `${groupId}:${userId}`;
  const last = runtime.lastBanByUserInGroup.get(key);
  if (!last) return false;

  return Date.now() - last < cd * 1000;
}

function markCooldown(groupId, userId) {
  runtime.lastBanByUserInGroup.set(`${groupId}:${userId}`, Date.now());
}

function matchRule(rawMessage) {
  const normalized = normalizeText(rawMessage);
  if (!normalized) return '';

  for (const keyword of runtime.keywordRules) {
    if (normalized.includes(keyword)) {
      return `关键词:${keyword}`;
    }
  }

  for (const regex of runtime.regexRules) {
    if (regex.test(rawMessage)) {
      return `正则:${regex}`;
    }
  }

  return '';
}

async function banUser(ctx, groupId, userId, reason) {
  const params = {
    group_id: String(groupId),
    user_id: String(userId),
    duration: runtime.config.banDurationSeconds,
  };

  try {
    const res = await ctx.actions.call('set_group_ban', params, ctx.adapterName, ctx.pluginManager.config);
    markCooldown(groupId, userId);
    ctx.logger.info(`[CatPing] 已禁言 群:${groupId} 用户:${userId} 时长:${runtime.config.banDurationSeconds}s 原因:${reason}`);

    if (runtime.config.debug) {
      ctx.logger.debug('[CatPing] set_group_ban 返回:', res);
    }
  } catch (error) {
    ctx.logger.error(`[CatPing] 禁言失败 群:${groupId} 用户:${userId} 原因:${reason}`, error);
  }
}

export const plugin_init = async (ctx) => {
  runtime.ctx = ctx;
  loadConfig(ctx);

  plugin_config_ui = buildConfigUI(ctx);
  plugin_config_schema = plugin_config_ui;

  ctx.logger.info(
    `[CatPing] 初始化完成，关键词 ${runtime.keywordRules.length} 个，正则 ${runtime.regexRules.length} 条`,
  );
};

export const plugin_onmessage = async (ctx, event) => {
  if (!runtime.config.enabled) {
    return;
  }

  if (event?.post_type !== 'message' || event?.message_type !== 'group') {
    return;
  }

  const groupId = Number(event.group_id);
  const userId = Number(event.user_id);
  const senderRole = String(event?.sender?.role || 'member').toLowerCase();

  if (!Number.isFinite(groupId) || !Number.isFinite(userId)) {
    return;
  }

  if (runtime.whitelistGroups.size > 0 && !runtime.whitelistGroups.has(groupId)) {
    return;
  }

  if (runtime.whitelistUsers.has(userId)) {
    return;
  }

  if (runtime.config.ignoreOwner && senderRole === 'owner') {
    return;
  }

  if (runtime.config.ignoreAdmin && senderRole === 'admin') {
    return;
  }

  const rawMessage = String(event.raw_message || '');
  const matched = matchRule(rawMessage);
  if (!matched) {
    return;
  }

  if (inCooldown(groupId, userId)) {
    if (runtime.config.debug) {
      ctx.logger.debug(`[CatPing] 冷却中，跳过处罚 群:${groupId} 用户:${userId}`);
    }
    return;
  }

  await banUser(ctx, groupId, userId, matched);
};

export const plugin_cleanup = async (ctx) => {
  saveConfig(ctx);
  runtime.lastBanByUserInGroup.clear();
  ctx.logger.info('[CatPing] 插件已卸载');
};

export const plugin_get_config = async () => runtime.config;

export const plugin_set_config = async (ctx, config) => {
  runtime.config = sanitizeConfig(config);
  buildRuntimeCaches();
  saveConfig(ctx);
};

export const plugin_on_config_change = async (ctx, _ui, key, value, currentConfig) => {
  const next = sanitizeConfig({
    ...currentConfig,
    ...runtime.config,
    [key]: value,
  });

  runtime.config = next;
  buildRuntimeCaches();
  saveConfig(ctx);

  if (runtime.config.debug) {
    ctx.logger.debug(`[CatPing] 配置项已更新: ${String(key)}`);
  }
};
