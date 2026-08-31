/**
 * 成长服务：面板数据组装 + 日常打卡 + 挑战任务。
 * 路由层只调用这里的函数，不接触存储细节。
 */
import {
  seedCategories, openAttributes, attributeIndex, findBlock,
} from '../data/seed/attributes.js';
import { ApiError } from './api-error.js';
import { applyExp, expToNext } from './progression.js';
import { runDecaySettlement, hoursSinceLastFeed } from './decay-service.js';
import {
  loadState, saveState, getTodayBlockCount, getTodayLog,
  recordBlockUse, pushTimeline, getChallengeState, setChallengeState,
} from './storage.js';
import { createLogger } from '../logger.js';

const log = createLogger('progress-service');

/** 挑战完成后到下一个挑战发布的天数（稀缺感：不是永远有待办） */
const CHALLENGE_COOLDOWN_DAYS = 3;

/* ==================== 面板视图 ==================== */

/**
 * 组装面板视图：大类导航 + 属性进度 + 日常积木 + 当前挑战。
 * 这是 GET /api/panel 的返回结构。
 */
export function getPanel() {
  // 懒结算：每次取面板时先执行衰减检查（幂等，内部有 lastDecayAt 节流）
  const decayEvents = runDecaySettlement();

  const state = loadState();

  const categories = seedCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    locked: cat.locked,
    attributes: cat.attributes.map((attr) => {
      if (cat.locked) {
        return { id: attr.id, name: attr.name, icon: attr.icon, locked: true };
      }
      return buildAttributeView(attr, state);
    }),
  }));

  return {
    user: state.user,
    categories,
    decayEvents,
    todayBlockCount: Object.values(getTodayLog()).reduce((sum, n) => sum + n, 0),
    streak: getStreak(state),
    medals: state.medals ?? [],
    timeline: state.timeline.slice(-20).reverse(),
  };
}

/** 组装单个开放属性的完整视图 */
function buildAttributeView(attr, state) {
  const progress = state.attributes[attr.id] ?? { level: 1, exp: 0 };
  const idleHours = hoursSinceLastFeed(attr, state.blockLogs);

  return {
    id: attr.id,
    name: attr.name,
    icon: attr.icon,
    tagline: attr.tagline,
    locked: false,
    level: progress.level,
    exp: progress.exp,
    expToNext: expToNext(progress.level),
    /** 闲置状态（衰减预警）：ok <48h <警告 48-72h <危险 >72h（衰减中） */
    idle: buildIdleView(idleHours),
    dailyBlocks: attr.dailyBlocks.map((block) => {
      const used = getTodayBlockCount(block.id);
      return {
        id: block.id,
        name: block.name,
        icon: block.icon,
        exp: block.exp,
        dailyLimit: block.dailyLimit,
        usedToday: used,
        remaining: Math.max(0, block.dailyLimit - used),
      };
    }),
    challenge: buildChallengeView(attr, state),
  };
}

/** 闲置程度分级（与 DECAY_CONFIG.graceHours 联动） */
function buildIdleView(idleHours) {
  if (idleHours === null) return { level: 'new', hours: 0 };
  if (idleHours >= 72) return { level: 'danger', hours: Math.round(idleHours) };
  if (idleHours >= 48) return { level: 'warning', hours: Math.round(idleHours) };
  if (idleHours >= 24) return { level: 'attention', hours: Math.round(idleHours) };
  return { level: 'ok', hours: Math.round(idleHours) };
}

/* ==================== 挑战任务系统 ==================== */

/**
 * 挑战状态机（每属性独立按序推进）：
 *   locked    —— 上一个挑战刚完成，冷却中（downday 倒计时），制造稀缺感
 *   published —— 挑战已发布，可接受、可完成
 *   empty     —— 挑战池已见底
 */
function buildChallengeView(attr, state) {
  const pool = attr.challenges;
  const cs = getChallengeState(attr.id);
  const challenge = pool[cs.index];

  // 冷却中：有 revealedAt 且还没到期
  if (cs.revealedAt) {
    const daysLeft = daysUntil(cs.revealedAt);
    if (daysLeft > 0) {
      return {
        status: 'locked',
        countdown: daysLeft,
        completedName: cs.completedName ?? '上一个挑战',
      };
    }
    // 冷却结束 → 正式发布
    return publishChallenge(attr.id, cs, challenge);
  }

  if (!challenge) {
    return { status: 'empty', completedCount: cs.index };
  }

  return {
    status: 'published',
    id: challenge.id,
    name: challenge.name,
    desc: challenge.desc,
    exp: challenge.exp,
    completedCount: cs.index,
    total: pool.length,
  };
}

/** 冷却到期，正式发布当前挑战 */
function publishChallenge(attributeId, cs, challenge) {
  const next = { ...cs, revealedAt: undefined };
  setChallengeState(attributeId, next);
  // 注意：不落盘——发布动作在下次任何 saveState 时顺带持久化；
  // 若服务器重启，重新计算结果一致（幂等）。

  if (!challenge) {
    return { status: 'empty', completedCount: cs.index };
  }
  return {
    status: 'published',
    id: challenge.id,
    name: challenge.name,
    desc: challenge.desc,
    exp: challenge.exp,
    completedCount: cs.index,
  };
}

/** 完成当前挑战：大额一次性 EXP + 时间线 + 进入冷却 */
export function completeChallenge(attributeId) {
  const attr = attributeIndex[attributeId];
  if (!attr) throw new ApiError(404, `属性不存在：${attributeId}`, 'ATTR_NOT_FOUND');

  const cs = getChallengeState(attributeId);
  const challenge = attr.challenges[cs.index];

  if (cs.revealedAt) {
    throw new ApiError(429, '下一个挑战还在筹备中，先歇口气', 'CHALLENGE_LOCKED');
  }
  if (!challenge) {
    throw new ApiError(404, '这个属性的挑战池已经见底了', 'CHALLENGE_EMPTY');
  }

  // 注入大额 EXP
  const state = loadState();
  const progress = state.attributes[attributeId];
  const result = applyExp(progress.level, progress.exp, challenge.exp);
  progress.level = result.level;
  progress.exp = result.exp;

  // 推进到下一个挑战 + 设定发布日期（稀缺感的核心）
  const next = {
    index: cs.index + 1,
    completedName: challenge.name,
    revealedAt: addDays(CHALLENGE_COOLDOWN_DAYS),
  };
  setChallengeState(attributeId, next);

  pushTimeline({
    type: 'challenge',
    attributeName: attr.name,
    challengeName: challenge.name,
    exp: challenge.exp,
  });
  for (let i = 0; i < result.levelUps; i += 1) {
    pushTimeline({
      type: 'levelup',
      attribute: attributeId,
      attributeName: attr.name,
      level: progress.level,
    });
  }
  saveState();
  log.info(`挑战完成：${attr.name} - ${challenge.name} (+${challenge.exp} EXP)`);

  return {
    challenge: { id: challenge.id, name: challenge.name, exp: challenge.exp },
    attribute: {
      id: attr.id, name: attr.name, icon: attr.icon,
      level: progress.level, exp: progress.exp, expToNext: expToNext(progress.level),
    },
    levelUps: result.levelUps,
    nextChallengeDays: CHALLENGE_COOLDOWN_DAYS,
  };
}

/* ==================== 日常打卡 ==================== */

/**
 * 打卡：将积木块 EXP 注入主属性池，处理每日限额与自动升级。
 */
export function feedBlock(blockId) {
  const found = findBlock(blockId);
  if (!found) {
    throw new ApiError(404, `积木块不存在：${blockId}`, 'BLOCK_NOT_FOUND');
  }
  const { attribute, block } = found;

  const used = getTodayBlockCount(blockId);
  if (used >= block.dailyLimit) {
    throw new ApiError(
      429,
      `「${block.name}」今天的打卡次数已用完（每日上限 ${block.dailyLimit} 次）`,
      'DAILY_LIMIT_REACHED',
    );
  }

  const state = loadState();
  const progress = state.attributes[attribute.id];

  const result = applyExp(progress.level, progress.exp, block.exp);
  progress.level = result.level;
  progress.exp = result.exp;

  recordBlockUse(blockId);
  for (let i = 0; i < result.levelUps; i += 1) {
    pushTimeline({
      type: 'levelup',
      attribute: attribute.id,
      attributeName: attribute.name,
      level: progress.level,
    });
  }
  saveState();

  return {
    block: { id: block.id, name: block.name, icon: block.icon, exp: block.exp },
    attribute: {
      id: attribute.id,
      name: attribute.name,
      icon: attribute.icon,
      level: progress.level,
      exp: progress.exp,
      expToNext: expToNext(progress.level),
    },
    levelUps: result.levelUps,
  };
}

/* ==================== 工具 ==================== */

/** 连续打卡天数：昨天或今天有打卡则连续 */
function getStreak(state) {
  const days = Object.keys(state.blockLogs).sort();
  if (!days.length) return 0;

  const dayMs = 24 * 3600 * 1000;
  const today = new Date();
  const has = (d) => state.blockLogs[d] && Object.keys(state.blockLogs[d]).length > 0;

  let cursor = new Date(today);
  if (!has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(cursor.getTime() - dayMs); // 今天还没打，从昨天起算
    if (!has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }
  return streak;
}

function daysUntil(dateKey) {
  const target = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (24 * 3600 * 1000));
}

function addDays(n) {
  return new Date(Date.now() + n * 24 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 供旧引用兼容 */
export { attributeIndex };
