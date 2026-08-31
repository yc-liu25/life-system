/**
 * 存储层：JSON 文件持久化（Phase 2 方案）。
 *
 * 设计要点：
 * - 所有磁盘读写集中在此，业务层（progress-service）不碰 fs；
 * - 未来换真实数据库时，只需保持本文件导出的接口不变。
 *
 * 文件结构（server/data/runtime/state.json）：
 * {
 *   "user": { "name": "旅人", "createdAt": "..." },
 *   "attributes": {
 *     "vision":  { "level": 1, "exp": 0 },
 *     "english": { "level": 1, "exp": 0 }
 *   },
 *   "blockLogs": {                       // 打卡流水（用于每日限额与成长轨迹）
 *     "2026-08-31": { "carrot": 1, "words": 2 }
 *   },
 *   "challenges": {                      // 挑战任务状态（每属性按序推进）
 *     "vision": { "index": 1, "revealedAt": "2026-09-05" }
 *   },
 *   "timeline": [ ... ]                  // 升级/挑战/勋章/彩蛋事件
 * }
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';
import { openAttributes } from '../data/seed/attributes.js';
import { createLogger } from '../logger.js';

const log = createLogger('storage');
const stateFile = path.join(config.runtimeDir, 'state.json');

const todayKey = () => new Date().toISOString().slice(0, 10);

/** 按 seed 生成一份全新的属性进度（Lv.1 / 0 EXP） */
function freshAttributes() {
  return Object.fromEntries(
    openAttributes.map((attr) => [attr.id, { level: 1, exp: 0 }]),
  );
}

function freshState() {
  return {
    user: { name: '旅人', createdAt: new Date().toISOString() },
    attributes: freshAttributes(),
    blockLogs: {},
    challenges: {},
    timeline: [],
  };
}

let cache = null;

/** 读取全局状态；文件不存在或损坏时自动初始化 */
export function loadState() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    // 兼容未来 seed 新增属性：老存档缺的属性补默认值
    for (const [id, progress] of Object.entries(freshAttributes())) {
      if (!cache.attributes[id]) cache.attributes[id] = progress;
    }
  } catch {
    log.info('未找到有效存档，初始化新存档');
    cache = freshState();
    saveState();
  }
  return cache;
}

/** 写盘（同步写足够——单用户场景，写入频率低） */
export function saveState() {
  fs.mkdirSync(config.runtimeDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(cache, null, 2), 'utf-8');
}

/** 某积木块今天的已打卡次数 */
export function getTodayBlockCount(blockId) {
  return loadState().blockLogs[todayKey()]?.[blockId] ?? 0;
}

/** 今天的完整打卡流水 { blockId: count } */
export function getTodayLog() {
  return loadState().blockLogs[todayKey()] ?? {};
}

/** 记录一次打卡：流水 +1 */
export function recordBlockUse(blockId) {
  const state = loadState();
  const day = todayKey();
  state.blockLogs[day] ??= {};
  state.blockLogs[day][blockId] = (state.blockLogs[day][blockId] ?? 0) + 1;

  // 流水只保留最近 90 天，防止无限膨胀
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000)
    .toISOString().slice(0, 10);
  for (const key of Object.keys(state.blockLogs)) {
    if (key < cutoff) delete state.blockLogs[key];
  }
}

/** 追加一条时间线事件（升级等里程碑） */
export function pushTimeline(event) {
  loadState().timeline.push({ date: todayKey(), ...event });
}

/** 挑战状态读写 */
export function getChallengeState(attributeId) {
  return loadState().challenges?.[attributeId] ?? { index: 0 };
}

export function setChallengeState(attributeId, challengeState) {
  const state = loadState();
  state.challenges ??= {};
  state.challenges[attributeId] = challengeState;
}
