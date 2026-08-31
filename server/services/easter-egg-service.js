/**
 * 彩蛋通道：清单之外的好事汇报 → 随缘奖励。
 *
 * 设计文档 §2.4 的约束：
 * - 刻意稀缺（每日上限、概率判定），不是稳定计分入口
 * - 一次性奖励（EXP 或特殊勋章），不进主积分规则
 * - AI/随机只决定"给不给、给多少"，主积分的可信度不受影响
 */
import { openAttributes as seedAttributes } from '../data/seed/attributes.js';
import { applyExp, expToNext } from './progression.js';
import { ApiError } from './api-error.js';
import {
  loadState, saveState, pushTimeline, getTodayLog,
} from './storage.js';

/** 彩蛋参数（调优只改这里） */
export const EGG_CONFIG = {
  cooldownMinutes: 10,   // 两次汇报的最小间隔
  dailyLimit: 2,         // 每日最多成功 2 次
  baseChance: 0.75,      // 基础概率（不是每次都有）
  pityThreshold: 3,      // 连续失败 3 次后必中（保底，避免挫败感）
  expRange: [10, 40],    // 一次性 EXP 区间
  medalChance: 0.25,     // 命中后 25% 概率升级为勋章（更稀有）
};

/** 预设勋章池（达成即收藏，无 EXP） */
const MEDALS = [
  { id: 'spontaneous-goodness', icon: '🍀', name: '即兴好事' },
  { id: 'life-poet', icon: '📜', name: '生活诗人' },
  { id: 'small-kindness', icon: '🤝', name: '微光善举' },
  { id: 'curious-soul', icon: '🔭', name: '好奇心旺盛' },
  { id: 'self-surprise', icon: '🎪', name: '给自己惊喜' },
];

/** 彩蛋文案：不同结果的呆萌评语 */
const EGG_QUOTES = {
  exp: [
    '嗯……这条汇报我读了两遍。判定：值得记录。这是我的一点心意，别跟其他积木块说。',
    '检测到清单之外的善良/努力。按章程第 ∞ 条，系统有权限"看心情"发奖。今天心情不错。',
    '这件事不在清单里，但数据会记住它。奖励已发放，请查收——不用谢，我只是顺路。',
  ],
  medal: [
    '叮！这不是普通的奖励——是勋章。整个系统的勋章墙都亮了一下。真的，我看见了。',
    '罕见事件：你的汇报触发了稀有判定。这枚勋章从此只属于你，编号都是你的幸运数字（大概）。',
    '我决定给你一枚勋章。没有为什么，硬要说的话：你做了件清单外的好事，而我有眼睛。',
  ],
  miss: [
    '汇报已收到。这次我先记在小本本上，不发奖——不是不好，是缘分未到。多做好事，缘分总会来的。',
    '嗯……这次没有触发奖励判定。但你的汇报让今天的数据变好看了，这本身就是一种回报？',
    '判定完成：先存档，不发糖。系统的眼光是很挑剔的（也很随缘）。',
  ],
  cooldown: [
    '叮——彩蛋通道冷却中。好东西太频繁就不稀有了，你懂的。',
    '刚汇报过啦。让子弹飞一会儿，让缘分歇一会儿。',
  ],
  limitReached: [
    '今天的彩蛋额度已经用完啦。知足常乐这个技能，你今天已经练满了。',
    '汇报通道今日打烊。明天的缘分正在充电中。',
  ],
};

/** 今天的彩蛋记录 */
function todayEggLog(state) {
  const key = new Date().toISOString().slice(0, 10);
  return (state.eggLogs ??= {}), (state.eggLogs[key] ??= { attempts: 0, successes: 0 });
}

/**
 * 提交一次彩蛋汇报。
 * @returns 判定结果 + 奖励详情 + 六六评语
 */
export function submitEggReport(text) {
  const state = loadState();
  const today = todayEggLog(state);

  // ---- 限制判定（顺序：冷却 → 每日上限）----
  const lastAt = state.lastEggAt ?? 0;
  const elapsedMin = (Date.now() - lastAt) / 60000;
  if (today.successes > 0 && elapsedMin < EGG_CONFIG.cooldownMinutes) {
    return missResult('cooldown', Math.ceil(EGG_CONFIG.cooldownMinutes - elapsedMin));
  }
  if (today.successes >= EGG_CONFIG.dailyLimit) {
    return missResult('limitReached');
  }

  today.attempts += 1;

  // ---- 随缘判定（带保底）----
  const streak = state.eggFailStreak ?? 0;
  const chance = streak >= EGG_CONFIG.pityThreshold
    ? 1 : EGG_CONFIG.baseChance;
  const hit = Math.random() < chance;

  state.lastEggAt = Date.now();

  if (!hit) {
    state.eggFailStreak = streak + 1;
    saveState();
    return missResult('miss');
  }
  state.eggFailStreak = 0;

  // ---- 发奖：EXP 或勋章 ----
  const wantMedal = Math.random() < EGG_CONFIG.medalChance;
  if (wantMedal) {
    const medal = MEDALS[Math.floor(Math.random() * MEDALS.length)];
    state.medals ??= [];
    const owned = state.medals.some((m) => m.id === medal.id);
    if (!owned) state.medals.push({ ...medal, earnedAt: new Date().toISOString() });

    pushTimeline({
      type: 'medal',
      medalName: medal.name,
      medalIcon: medal.icon,
    });
    today.successes += 1; // 勋章同样消耗每日彩蛋额度
    saveState();
    return {
      granted: true,
      kind: 'medal',
      medal,
      quote: pickQuote('medal'),
    };
  }

  // EXP 彩蛋：注入随机属性（选今日打卡最少的属性，模拟"锦上添花"）
  const [minExp, maxExp] = EGG_CONFIG.expRange;
  const bonusExp = minExp + Math.floor(Math.random() * (maxExp - minExp + 1));
  const attrProgress = pickAttributeForBonus(state);
  const attributeMeta = getAttributeMeta(attrProgress.id);

  const result = applyExp(
    state.attributes[attrProgress.id].level,
    state.attributes[attrProgress.id].exp,
    bonusExp,
  );
  state.attributes[attrProgress.id].level = result.level;
  state.attributes[attrProgress.id].exp = result.exp;

  for (let i = 0; i < result.levelUps; i += 1) {
    pushTimeline({
      type: 'levelup',
      attribute: attributeMeta.id,
      attributeName: attributeMeta.name,
      level: result.level,
    });
  }
  pushTimeline({ type: 'eggExp', text: text.slice(0, 50) });
  today.successes += 1;
  saveState();

  return {
    granted: true,
    kind: 'exp',
    bonusExp,
    attribute: {
      id: attributeMeta.id, name: attributeMeta.name, icon: attributeMeta.icon,
      level: result.level, exp: result.exp, expToNext: expToNext(result.level),
    },
    levelUps: result.levelUps,
    quote: pickQuote('exp'),
  };
}

/** 选一个"今日最需要关注"的属性接收彩蛋 EXP */
function pickAttributeForBonus(state) {
  const today = getTodayLog();
  const entries = Object.entries(state.attributes)
    .map(([id, p]) => {
      // 简化统计：该属性名下所有积木块今日次数
      const attr = getAttributeMeta(id);
      const used = attr.dailyBlocks.reduce((sum, b) => sum + (today[b.id] ?? 0), 0);
      return { id, exp: p.exp, used };
    })
    .sort((a, b) => a.used - b.used || a.exp - b.exp);
  return entries[0];
}

/** 查询属性元信息 */
function getAttributeMeta(id) {
  const attr = seedAttributes.find((a) => a.id === id);
  if (!attr) throw new ApiError(500, `属性不存在：${id}`);
  return attr;
}

/** 失败/受限时的统一返回结构 */
function missResult(type, ...args) {
  return {
    granted: false,
    kind: type,
    quote: type === 'cooldown'
      ? EGG_QUOTES.cooldown[0].replace('{min}', args[0] ?? EGG_CONFIG.cooldownMinutes)
      : pickQuote(type),
  };
}

function pickQuote(kind) {
  const list = EGG_QUOTES[kind] ?? EGG_QUOTES.miss;
  return list[Math.floor(Math.random() * list.length)];
}
