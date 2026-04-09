import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG = {
  enabled: true,
  enableKeywordGuard: true,
  keywordMuteDurationSeconds: 600,
  keywordGuardGroupIdsText: '',
  keywordWhitelistUserIdsText: '',
  banDurationSeconds: 600,
  enableMentionGuard: false,
  mentionMuteDurationSeconds: 1800,
  mentionGuardGroupIdsText: '',
  mentionWhitelistUserIdsText: '',
  enableUserIdGuard: false,
  userIdMuteDurationSeconds: 1800,
  userIdGuardGroupIdsText: '',
  userIdWhitelistUserIdsText: '',
  forbiddenUserIdsText: '',
  userIdReplaceCardOnHit: true,
  userIdReplacementText: '非法id，请改回去',
  banUserIdOnHit: false,
  banCooldownSeconds: 30,
  onlyCheckTextMessage: true,
  recallKeywordMessageOnHit: false,
  recallMentionMessageOnHit: false,
  recallUserIdMessageOnHit: false,
  recallKeywordWhenInCooldown: true,
  recallMentionWhenInCooldown: true,
  recallUserIdWhenInCooldown: true,
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
  botUserId: '',
  lastBanByUserInGroup: new Map(),
  keywordRules: [],
  regexRules: [],
  keywordGuardGroups: new Set(),
  keywordWhitelistUsers: new Set(),
  mentionGuardGroups: new Set(),
  mentionWhitelistUsers: new Set(),
  userIdGuardGroups: new Set(),
  userIdWhitelistUsers: new Set(),
  forbiddenUserIds: new Set(),
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
    if (typeof raw.enableKeywordGuard === 'boolean') cfg.enableKeywordGuard = raw.enableKeywordGuard;
    if (typeof raw.keywordMuteDurationSeconds === 'number') {
      cfg.keywordMuteDurationSeconds = raw.keywordMuteDurationSeconds;
    } else if (typeof raw.banDurationSeconds === 'number') {
      cfg.keywordMuteDurationSeconds = raw.banDurationSeconds;
      cfg.banDurationSeconds = raw.banDurationSeconds;
    }
    if (typeof raw.enableMentionGuard === 'boolean') cfg.enableMentionGuard = raw.enableMentionGuard;
    if (typeof raw.mentionMuteDurationSeconds === 'number') {
      cfg.mentionMuteDurationSeconds = raw.mentionMuteDurationSeconds;
    } else if (typeof raw.muteDuration === 'number') {
      cfg.mentionMuteDurationSeconds = raw.muteDuration * 60;
    }
    if (typeof raw.enableUserIdGuard === 'boolean') cfg.enableUserIdGuard = raw.enableUserIdGuard;
    if (typeof raw.userIdMuteDurationSeconds === 'number') cfg.userIdMuteDurationSeconds = raw.userIdMuteDurationSeconds;
    if (typeof raw.banCooldownSeconds === 'number') cfg.banCooldownSeconds = raw.banCooldownSeconds;
    if (typeof raw.onlyCheckTextMessage === 'boolean') cfg.onlyCheckTextMessage = raw.onlyCheckTextMessage;
    if (typeof raw.recallKeywordMessageOnHit === 'boolean') {
      cfg.recallKeywordMessageOnHit = raw.recallKeywordMessageOnHit;
    } else if (typeof raw.recallMessageOnHit === 'boolean') {
      cfg.recallKeywordMessageOnHit = raw.recallMessageOnHit;
    }
    if (typeof raw.recallMentionMessageOnHit === 'boolean') {
      cfg.recallMentionMessageOnHit = raw.recallMentionMessageOnHit;
    } else if (typeof raw.recallMessageOnHit === 'boolean') {
      cfg.recallMentionMessageOnHit = raw.recallMessageOnHit;
    }
    if (typeof raw.recallUserIdMessageOnHit === 'boolean') {
      cfg.recallUserIdMessageOnHit = raw.recallUserIdMessageOnHit;
    } else if (typeof raw.recallMessageOnHit === 'boolean') {
      cfg.recallUserIdMessageOnHit = raw.recallMessageOnHit;
    }
    if (typeof raw.recallKeywordWhenInCooldown === 'boolean') {
      cfg.recallKeywordWhenInCooldown = raw.recallKeywordWhenInCooldown;
    } else if (typeof raw.recallWhenInCooldown === 'boolean') {
      cfg.recallKeywordWhenInCooldown = raw.recallWhenInCooldown;
    }
    if (typeof raw.recallMentionWhenInCooldown === 'boolean') {
      cfg.recallMentionWhenInCooldown = raw.recallMentionWhenInCooldown;
    } else if (typeof raw.recallWhenInCooldown === 'boolean') {
      cfg.recallMentionWhenInCooldown = raw.recallWhenInCooldown;
    }
    if (typeof raw.recallUserIdWhenInCooldown === 'boolean') {
      cfg.recallUserIdWhenInCooldown = raw.recallUserIdWhenInCooldown;
    } else if (typeof raw.recallWhenInCooldown === 'boolean') {
      cfg.recallUserIdWhenInCooldown = raw.recallWhenInCooldown;
    }
    if (typeof raw.ignoreAdmin === 'boolean') cfg.ignoreAdmin = raw.ignoreAdmin;
    if (typeof raw.ignoreOwner === 'boolean') cfg.ignoreOwner = raw.ignoreOwner;
    if (typeof raw.debug === 'boolean') cfg.debug = raw.debug;

    if (raw.keywordGuardGroupIdsText !== undefined) {
      cfg.keywordGuardGroupIdsText = String(raw.keywordGuardGroupIdsText);
    } else if (raw.whitelistGroupIdsText !== undefined) {
      cfg.keywordGuardGroupIdsText = String(raw.whitelistGroupIdsText);
      cfg.whitelistGroupIdsText = String(raw.whitelistGroupIdsText);
    } else if (raw.whitelistGroupIds !== undefined) {
      const value = splitNumberList(raw.whitelistGroupIds).join('\n');
      cfg.keywordGuardGroupIdsText = value;
      cfg.whitelistGroupIdsText = value;
    }

    if (raw.keywordWhitelistUserIdsText !== undefined) {
      cfg.keywordWhitelistUserIdsText = String(raw.keywordWhitelistUserIdsText);
    } else if (raw.whitelistUserIdsText !== undefined) {
      cfg.keywordWhitelistUserIdsText = String(raw.whitelistUserIdsText);
      cfg.whitelistUserIdsText = String(raw.whitelistUserIdsText);
    } else if (raw.whitelistUserIds !== undefined) {
      const value = splitNumberList(raw.whitelistUserIds).join('\n');
      cfg.keywordWhitelistUserIdsText = value;
      cfg.whitelistUserIdsText = value;
    }

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

    if (raw.mentionGuardGroupIdsText !== undefined) {
      cfg.mentionGuardGroupIdsText = String(raw.mentionGuardGroupIdsText);
    } else if (raw.monitoredGroups !== undefined) {
      cfg.mentionGuardGroupIdsText = splitNumberList(raw.monitoredGroups).join('\n');
    }

    if (raw.mentionWhitelistUserIdsText !== undefined) {
      cfg.mentionWhitelistUserIdsText = String(raw.mentionWhitelistUserIdsText);
    } else if (raw.mentionWhitelistUserIds !== undefined) {
      cfg.mentionWhitelistUserIdsText = splitNumberList(raw.mentionWhitelistUserIds).join('\n');
    } else if (raw.whitelistQQ !== undefined) {
      cfg.mentionWhitelistUserIdsText = splitNumberList(raw.whitelistQQ).join('\n');
    }

    if (raw.userIdGuardGroupIdsText !== undefined) {
      cfg.userIdGuardGroupIdsText = String(raw.userIdGuardGroupIdsText);
    }

    if (raw.userIdWhitelistUserIdsText !== undefined) {
      cfg.userIdWhitelistUserIdsText = String(raw.userIdWhitelistUserIdsText);
    }

    if (raw.forbiddenUserIdsText !== undefined) {
      cfg.forbiddenUserIdsText = String(raw.forbiddenUserIdsText);
    } else if (raw.targetUserIdsText !== undefined) {
      cfg.forbiddenUserIdsText = String(raw.targetUserIdsText);
    } else if (raw.targetUserIds !== undefined) {
      cfg.forbiddenUserIdsText = splitNumberList(raw.targetUserIds).join('\n');
    }
    if (typeof raw.userIdReplaceCardOnHit === 'boolean') cfg.userIdReplaceCardOnHit = raw.userIdReplaceCardOnHit;
    if (raw.userIdReplacementText !== undefined) cfg.userIdReplacementText = String(raw.userIdReplacementText);
    if (typeof raw.banUserIdOnHit === 'boolean') cfg.banUserIdOnHit = raw.banUserIdOnHit;

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

  cfg.keywordMuteDurationSeconds = Math.max(
    1,
    Math.min(30 * 24 * 3600, Math.floor(Number(cfg.keywordMuteDurationSeconds) || 600)),
  );
  cfg.banDurationSeconds = Math.max(1, Math.min(30 * 24 * 3600, Math.floor(Number(cfg.banDurationSeconds) || 600)));
  cfg.mentionMuteDurationSeconds = Math.max(
    1,
    Math.min(30 * 24 * 3600, Math.floor(Number(cfg.mentionMuteDurationSeconds) || 1800)),
  );
  cfg.userIdMuteDurationSeconds = Math.max(
    1,
    Math.min(30 * 24 * 3600, Math.floor(Number(cfg.userIdMuteDurationSeconds) || 1800)),
  );
  cfg.userIdReplacementText = String(cfg.userIdReplacementText || '非法id，请改回去').trim() || '非法id，请改回去';
  cfg.banCooldownSeconds = Math.max(0, Math.min(3600, Math.floor(Number(cfg.banCooldownSeconds) || 30)));

  return cfg;
}

function buildRuntimeCaches() {
  const cfg = runtime.config;

  runtime.keywordGuardGroups = new Set(splitNumberList(cfg.keywordGuardGroupIdsText || cfg.whitelistGroupIdsText));
  runtime.keywordWhitelistUsers = new Set(splitNumberList(cfg.keywordWhitelistUserIdsText || cfg.whitelistUserIdsText));
  runtime.mentionGuardGroups = new Set(splitNumberList(cfg.mentionGuardGroupIdsText));
  runtime.mentionWhitelistUsers = new Set(splitNumberList(cfg.mentionWhitelistUserIdsText));
  runtime.userIdGuardGroups = new Set(splitNumberList(cfg.userIdGuardGroupIdsText));
  runtime.userIdWhitelistUsers = new Set(splitNumberList(cfg.userIdWhitelistUserIdsText));
  runtime.forbiddenUserIds = new Set(splitNumberList(cfg.forbiddenUserIdsText));

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
    ctx.NapCatConfig.plainText('CatPing：关键词 / @机器人 / 用户ID 三板块独立管控。'),
    ctx.NapCatConfig.boolean('enabled', '启用插件', true, '关闭后不处理任何消息', true),
    ctx.NapCatConfig.number('banCooldownSeconds', '同用户冷却（秒）', 30, '避免重复触发刷屏禁言', true),
    ctx.NapCatConfig.boolean('ignoreAdmin', '忽略管理员', true, '管理员命中后不处罚', true),
    ctx.NapCatConfig.boolean('ignoreOwner', '忽略群主', true, '群主命中后不处罚', true),
    ctx.NapCatConfig.boolean('debug', '调试日志', false, '开启后打印更多命中日志', true),
    ctx.NapCatConfig.plainText('【关键词板块】'),
    ctx.NapCatConfig.boolean('enableKeywordGuard', '启用关键词检测', true, '关闭后跳过关键词与正则匹配', true),
    ctx.NapCatConfig.number('keywordMuteDurationSeconds', '关键词禁言时长（秒）', 600, '仅关键词命中时使用', true),
    ctx.NapCatConfig.text(
      'keywordGuardGroupIdsText',
      '关键词监控群聊',
      '',
      '留空表示所有群；每行一个群号，或英文逗号分隔',
      true,
    ),
    ctx.NapCatConfig.text(
      'keywordWhitelistUserIdsText',
      '关键词白名单用户',
      '',
      '每行一个 QQ 号；这些用户命中关键词不处罚',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'recallKeywordMessageOnHit',
      '关键词命中后撤回',
      false,
      '开启后关键词命中会调用 delete_msg 撤回原消息',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'recallKeywordWhenInCooldown',
      '关键词冷却中仍撤回',
      true,
      '开启后即便用户处于禁言冷却，关键词命中后仍会尝试撤回消息',
      true,
    ),
    ctx.NapCatConfig.boolean('enableMentionGuard', '启用@机器人守卫', false, '命中@机器人后可单独触发禁言', true),
    ctx.NapCatConfig.number('mentionMuteDurationSeconds', '@机器人禁言时长（秒）', 1800, '仅在@机器人命中时使用该时长', true),
    ctx.NapCatConfig.text(
      'mentionGuardGroupIdsText',
      '@机器人守卫群列表',
      '',
      '留空表示所有群；每行一个群号，或英文逗号分隔',
      true,
    ),
    ctx.NapCatConfig.text(
      'mentionWhitelistUserIdsText',
      '@机器人守卫白名单用户',
      '',
      '每行一个 QQ 号；命中@机器人时这些用户不处罚',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'recallMentionMessageOnHit',
      '@机器人命中后撤回',
      false,
      '开启后@机器人命中会调用 delete_msg 撤回原消息',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'recallMentionWhenInCooldown',
      '@机器人冷却中仍撤回',
      true,
      '开启后即便用户处于禁言冷却，@机器人命中后仍会尝试撤回消息',
      true,
    ),
    ctx.NapCatConfig.plainText('【用户ID板块】'),
    ctx.NapCatConfig.boolean('enableUserIdGuard', '启用用户ID检测', false, '检测消息中命中的目标用户ID', true),
    ctx.NapCatConfig.number('userIdMuteDurationSeconds', '用户ID命中禁言时长（秒）', 1800, '仅用户ID命中时使用', true),
    ctx.NapCatConfig.text(
      'forbiddenUserIdsText',
      '违禁用户ID列表',
      '',
      '每行一个 QQ 号；发言者ID命中列表即触发',
      true,
    ),
    ctx.NapCatConfig.text(
      'userIdGuardGroupIdsText',
      '用户ID检测监控群聊',
      '',
      '留空表示所有群；每行一个群号，或英文逗号分隔',
      true,
    ),
    ctx.NapCatConfig.text(
      'userIdWhitelistUserIdsText',
      '用户ID检测白名单用户',
      '',
      '每行一个 QQ 号；这些用户命中目标ID不处罚',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'userIdReplaceCardOnHit',
      '用户ID命中后修改群名片',
      true,
      '开启后会尝试将群名片改为下方文本',
      true,
    ),
    ctx.NapCatConfig.text(
      'userIdReplacementText',
      '用户ID命中替换名片文本',
      '非法id，请改回去',
      '用于 set_group_card 的 card 文本',
      true,
    ),
    ctx.NapCatConfig.boolean('banUserIdOnHit', '用户ID命中后执行禁言', false, '关闭后仅改名片/撤回，不执行禁言', true),
    ctx.NapCatConfig.boolean(
      'recallUserIdMessageOnHit',
      '用户ID命中后撤回',
      false,
      '开启后用户ID命中会调用 delete_msg 撤回原消息',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'recallUserIdWhenInCooldown',
      '用户ID冷却中仍撤回',
      true,
      '开启后即便用户处于禁言冷却，用户ID命中后仍会尝试撤回消息',
      true,
    ),
    ctx.NapCatConfig.boolean(
      'onlyCheckTextMessage',
      '仅检测文本消息',
      true,
      '开启后只检查 text 段内容，图片/卡片等非文本消息默认跳过',
      true,
    ),
    ctx.NapCatConfig.text('whitelistUserIdsText', '兼容字段：全局白名单用户', '', '旧配置兼容字段；新配置建议使用关键词白名单', false),
    ctx.NapCatConfig.text('whitelistGroupIdsText', '兼容字段：全局白名单群', '', '旧配置兼容字段；新配置建议使用关键词监控群聊', false),
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

function extractMessageId(event) {
  const raw = event?.message_id;
  if (raw === undefined || raw === null) return '';

  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    return Math.floor(num);
  }

  const text = String(raw).trim();
  return text || '';
}

function extractTextForMatch(event) {
  const message = event?.message;

  if (Array.isArray(message)) {
    const text = message
      .filter((seg) => seg && typeof seg === 'object' && String(seg.type || '').toLowerCase() === 'text')
      .map((seg) => String(seg?.data?.text || ''))
      .join('');
    return text;
  }

  if (message && typeof message === 'object' && String(message.type || '').toLowerCase() === 'text') {
    return String(message?.data?.text || '');
  }

  const raw = String(event?.raw_message || '');
  if (!raw) return '';

  const stripped = raw.replace(/\[CQ:[^\]]+\]/g, '').trim();
  return stripped;
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

function isAtUser(event, targetUserId) {
  if (!targetUserId) return false;

  const message = event?.message;
  if (Array.isArray(message)) {
    return message.some(
      (seg) => seg && typeof seg === 'object' && String(seg.type || '').toLowerCase() === 'at' && String(seg?.data?.qq || '') === targetUserId,
    );
  }

  const raw = String(event?.raw_message || '');
  if (!raw) return false;

  const escapedTarget = String(targetUserId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const atRegex = new RegExp(`\\[CQ:at,qq=${escapedTarget}(?:,|\\])`);
  return atRegex.test(raw);
}

function isForbiddenSenderUserId(userId) {
  if (runtime.forbiddenUserIds.size === 0) return false;
  return runtime.forbiddenUserIds.has(Number(userId));
}

async function ensureBotUserId(ctx, event) {
  if (runtime.botUserId) return runtime.botUserId;

  const selfId = event?.self_id;
  if (selfId !== undefined && selfId !== null && String(selfId).trim()) {
    runtime.botUserId = String(selfId).trim();
    return runtime.botUserId;
  }

  try {
    const info = await ctx.actions.call('get_login_info', undefined, ctx.adapterName, ctx.pluginManager.config);
    const userId = info?.user_id;
    if (userId !== undefined && userId !== null && String(userId).trim()) {
      runtime.botUserId = String(userId).trim();
    }
  } catch (error) {
    if (runtime.config.debug) {
      ctx.logger.debug(`[CatPing] 获取机器人账号失败: ${error?.message || error}`);
    }
  }

  return runtime.botUserId;
}

async function banUser(ctx, groupId, userId, reason, durationSeconds = runtime.config.banDurationSeconds) {
  const params = {
    group_id: String(groupId),
    user_id: String(userId),
    duration: durationSeconds,
  };

  try {
    const res = await ctx.actions.call('set_group_ban', params, ctx.adapterName, ctx.pluginManager.config);
    markCooldown(groupId, userId);
    ctx.logger.info(`[CatPing] 已禁言 群:${groupId} 用户:${userId} 时长:${durationSeconds}s 原因:${reason}`);

    if (runtime.config.debug) {
      ctx.logger.debug('[CatPing] set_group_ban 返回:', res);
    }
  } catch (error) {
    ctx.logger.error(`[CatPing] 禁言失败 群:${groupId} 用户:${userId} 原因:${reason}`, error);
  }
}

async function recallMessage(ctx, messageId, reason) {
  if (!messageId) {
    if (runtime.config.debug) {
      ctx.logger.debug(`[CatPing] 跳过撤回：缺少 message_id，原因:${reason}`);
    }
    return;
  }

  const params = { message_id: messageId };

  try {
    const res = await ctx.actions.call('delete_msg', params, ctx.adapterName, ctx.pluginManager.config);
    ctx.logger.info(`[CatPing] 已撤回 message_id:${messageId} 原因:${reason}`);

    if (runtime.config.debug) {
      ctx.logger.debug('[CatPing] delete_msg 返回:', res);
    }
  } catch (error) {
    ctx.logger.error(`[CatPing] 撤回失败 message_id:${messageId} 原因:${reason}`, error);
  }
}

async function updateGroupCard(ctx, groupId, userId, cardText, reason) {
  if (!cardText) return;

  const params = {
    group_id: String(groupId),
    user_id: String(userId),
    card: String(cardText),
  };

  try {
    const res = await ctx.actions.call('set_group_card', params, ctx.adapterName, ctx.pluginManager.config);
    ctx.logger.info(`[CatPing] 已修改群名片 群:${groupId} 用户:${userId} 文本:${cardText} 原因:${reason}`);
    if (runtime.config.debug) {
      ctx.logger.debug('[CatPing] set_group_card 返回:', res);
    }
  } catch (error) {
    ctx.logger.error(`[CatPing] 修改群名片失败 群:${groupId} 用户:${userId} 原因:${reason}`, error);
  }
}

export const plugin_init = async (ctx) => {
  runtime.ctx = ctx;
  loadConfig(ctx);

  plugin_config_ui = buildConfigUI(ctx);
  plugin_config_schema = plugin_config_ui;

  ctx.logger.info(
    `[CatPing] 初始化完成，关键词守卫:${runtime.config.enableKeywordGuard ? '开' : '关'}，@守卫:${runtime.config.enableMentionGuard ? '开' : '关'}，用户ID守卫:${runtime.config.enableUserIdGuard ? '开' : '关'}，关键词 ${runtime.keywordRules.length} 个，正则 ${runtime.regexRules.length} 条，违禁ID ${runtime.forbiddenUserIds.size} 个`,
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
  const messageId = extractMessageId(event);
  const senderRole = String(event?.sender?.role || 'member').toLowerCase();

  if (!Number.isFinite(groupId) || !Number.isFinite(userId)) {
    return;
  }

  if (runtime.config.ignoreOwner && senderRole === 'owner') {
    return;
  }

  if (runtime.config.ignoreAdmin && senderRole === 'admin') {
    return;
  }

  const contentForMatch = runtime.config.onlyCheckTextMessage ? extractTextForMatch(event) : String(event.raw_message || '');
  const hitReasons = [];
  let hitKeyword = false;
  let hitMention = false;
  let hitUserId = false;
  let durationSeconds = 0;

  if (runtime.config.enableKeywordGuard) {
    const groupAllowed = runtime.keywordGuardGroups.size === 0 || runtime.keywordGuardGroups.has(groupId);
    const userAllowed = !runtime.keywordWhitelistUsers.has(userId);

    if (groupAllowed && userAllowed) {
      const matched = matchRule(contentForMatch);
      if (matched) {
        hitReasons.push(matched);
        hitKeyword = true;
        durationSeconds = Math.max(durationSeconds, runtime.config.keywordMuteDurationSeconds);
      }
    }
  }

  if (runtime.config.enableMentionGuard) {
    const groupAllowed = runtime.mentionGuardGroups.size === 0 || runtime.mentionGuardGroups.has(groupId);
    const userAllowed = !runtime.mentionWhitelistUsers.has(userId);
    if (groupAllowed && userAllowed) {
      const botUserId = await ensureBotUserId(ctx, event);
      if (botUserId && isAtUser(event, botUserId)) {
        hitReasons.push('@机器人');
        hitMention = true;
        durationSeconds = Math.max(durationSeconds, runtime.config.mentionMuteDurationSeconds);
      }
    }
  }

  if (runtime.config.enableUserIdGuard) {
    const groupAllowed = runtime.userIdGuardGroups.size === 0 || runtime.userIdGuardGroups.has(groupId);
    const userAllowed = !runtime.userIdWhitelistUsers.has(userId);
    if (groupAllowed && userAllowed) {
      if (isForbiddenSenderUserId(userId)) {
        hitReasons.push(`用户ID:${userId}`);
        hitUserId = true;
        durationSeconds = Math.max(durationSeconds, runtime.config.userIdMuteDurationSeconds);
      }
    }
  }

  if (hitReasons.length === 0) {
    return;
  }
  const hitReasonText = hitReasons.join(' + ');
  const shouldRecallOnHit =
    (hitKeyword && runtime.config.recallKeywordMessageOnHit) ||
    (hitMention && runtime.config.recallMentionMessageOnHit) ||
    (hitUserId && runtime.config.recallUserIdMessageOnHit);
  const shouldRecallInCooldown =
    (hitKeyword && runtime.config.recallKeywordWhenInCooldown) ||
    (hitMention && runtime.config.recallMentionWhenInCooldown) ||
    (hitUserId && runtime.config.recallUserIdWhenInCooldown);

  if (inCooldown(groupId, userId)) {
    if (shouldRecallOnHit && shouldRecallInCooldown) {
      await recallMessage(ctx, messageId, `${hitReasonText}(冷却期仅撤回)`);
    }

    if (runtime.config.debug) {
      ctx.logger.debug(`[CatPing] 冷却中，跳过处罚 群:${groupId} 用户:${userId}`);
    }
    return;
  }

  if (shouldRecallOnHit) {
    await recallMessage(ctx, messageId, hitReasonText);
  }

  if (hitUserId && runtime.config.userIdReplaceCardOnHit) {
    await updateGroupCard(ctx, groupId, userId, runtime.config.userIdReplacementText, hitReasonText);
  }

  if (durationSeconds > 0 && (!hitUserId || runtime.config.banUserIdOnHit || hitKeyword || hitMention)) {
    await banUser(ctx, groupId, userId, hitReasonText, durationSeconds);
  }
};

export const plugin_cleanup = async (ctx) => {
  saveConfig(ctx);
  runtime.lastBanByUserInGroup.clear();
  runtime.botUserId = '';
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
