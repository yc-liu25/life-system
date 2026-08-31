/**
 * 属性衰减与警告机制（负反馈）。
 *
 * 设计约束（《功能增加.txt》）：
 * - 连续 72 小时无打卡的属性开始衰减：每滞后 24 小时扣一次 EXP
 * - 保护机制：Lv.1 不掉级、EXP 不扣穿——衰减制造紧迫感，不制造绝望感
 * - 结算时机：懒结算（跨天首次访问面板时），无定时器、重启安全
 * - 警告文案：极简、冷酷、机械腔——与六六日常的呆萌腔形成反差
 */
import { openAttributes } from '../data/seed/attributes.js';
import { expToNext } from './progression.js';
import {
  loadState, saveState, pushTimeline,
} from './storage.js';
import { createLogger } from '../logger.js';

const log = createLogger('decay-service');

/** ===== 衰减参数（调优只改这里）===== */
export const DECAY_CONFIG = {
  graceHours: 72,        // 宽限期：连续72小时无打卡后开始衰减
  tickHours: 24,         // 每滞后24小时结算一次衰减
  expPercent: 0.05,      // 每次扣除当前EXP的5%
  expMinDeduct: 10,      // 单次最少扣10点（有感知）
  expMaxDeduct: 40,      // 单次最多扣40点（不至绝望）
};

/* ==================== 纯函数（可单测） ==================== */

/**
 * 计算某属性"最近一次打卡"距今多久。
 * @returns 距最近一次打卡的小时数；从未打卡返回 null
 */
export function hoursSinceLastFeed(attr, blockLogs) {
  const attrBlockIds = new Set(attr.dailyBlocks.map((b) => b.id));
  let lastMs = null;

  for (const [day, blocks] of Object.entries(blockLogs)) {
    if (!Object.keys(blocks).some((id) => attrBlockIds.has(id))) continue;
    const ms = new Date(`${day}T00:00:00`).getTime();
    if (lastMs === null || ms > lastMs) lastMs = ms;
  }
  if (lastMs === null) return null;

  // 按天记录的精度以"当天结束"为界（温和估计）
  return (Date.now() - (lastMs + 24 * 3600 * 1000)) / (3600 * 1000);
}

/**
 * 结算一次衰减：返回要扣的 EXP 数（0 = 不衰减）。
 * 规则：闲置满 graceHours(72h) 触发首次衰减；此后每持续闲置 tickHours(24h) 再扣一次。
 * @param idleHours        距上次打卡的停滞小时数
 * @param hoursSinceDecay  距上次衰减结算的小时数（从未结算过为 Infinity）
 * @param currentExp       当前 EXP
 * @param currentLevel     当前等级
 */
export function computeDecay(idleHours, hoursSinceDecay, currentExp, currentLevel) {
  // 保护机制：Lv.1 或没有余粮时不扣——不掉级、不归零
  if (currentLevel <= 1 || currentExp <= 0) return 0;

  // 未达宽限期
  if (idleHours < DECAY_CONFIG.graceHours) return 0;

  // 已结算过一次且还没到下一个结算周期
  if (hoursSinceDecay < DECAY_CONFIG.tickHours) return 0;

  const raw = Math.round(currentExp * DECAY_CONFIG.expPercent) + DECAY_CONFIG.expMinDeduct;
  const deduct = Math.max(DECAY_CONFIG.expMinDeduct, Math.min(DECAY_CONFIG.expMaxDeduct, raw));
  return Math.min(deduct, currentExp); // 不扣穿
}

/** 机械冷酷腔警告文案（衰减时用） */
export function decayWarning(attrName, deduct) {
  return `【警告】宿主【${attrName}】属性长期未维护，数值发生衰减 -${deduct} EXP。请立即处理。`;
}

/* ==================== 结算入口 ==================== */

/**
 * 懒结算：检查所有属性，对达到衰减条件的执行扣减。
 * 在每次 getPanel() 时调用——幂等（同一次停滞只结算一次，因为
 * 结算后 lastDecayAt 更新，重新计时）。
 *
 * @returns 衰减事件列表（空数组 = 无衰减），供前端弹警告
 */
export function runDecaySettlement() {
  const state = loadState();
  const events = [];

  for (const attr of openAttributes) {
    const progress = state.attributes[attr.id];
    if (!progress) continue;

    const idleHours = hoursSinceLastFeed(attr, state.blockLogs);
    // 从未打卡过的属性不衰减（新属性/新用户保护）
    if (idleHours === null) continue;

    const lastDecayAt = state.lastDecayAt?.[attr.id];
    const hoursSinceDecay = lastDecayAt
      ? (Date.now() - lastDecayAt) / 3600000
      : Infinity;

    const deduct = computeDecay(idleHours, hoursSinceDecay, progress.exp, progress.level);
    if (deduct <= 0) continue;

    progress.exp -= deduct;
    state.lastDecayAt ??= {};
    state.lastDecayAt[attr.id] = Date.now();

    pushTimeline({
      type: 'decay',
      attributeName: attr.name,
      exp: -deduct,
    });
    events.push({
      attributeId: attr.id,
      attributeName: attr.name,
      attributeIcon: attr.icon,
      exp: -deduct,
      warning: decayWarning(attr.name, deduct),
    });
    log.warn(decayWarning(attr.name, deduct));
  }

  if (events.length > 0) {
    saveState();
    log.warn(`衰减结算完成：${events.length} 个属性受影响`);
  }
  return events;
}
