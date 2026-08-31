/**
 * 成长曲线：EXP ↔ 等级的纯计算，无任何 IO。
 *
 * 曲线设计：升级所需 EXP 随等级温和增长（Lv1→100, Lv2→150, Lv3→225…），
 * 前期升级快、给正反馈；越往后越需要持续积累。
 */

export const BASE_EXP = 100; // Lv1 → Lv2 所需
export const GROWTH = 1.5;   // 每级所需 EXP 的增长系数

/** 从 level 升到 level+1 所需的 EXP */
export function expToNext(level) {
  return Math.round((BASE_EXP * Math.pow(GROWTH, level - 1)) / 5) * 5;
}

/**
 * 向属性池注入 EXP，并自动完成升级进位。
 * @returns {{ level:number, exp:number, levelUps:number }} levelUps 为连升次数
 */
export function applyExp(level, exp, gain) {
  let nextLevel = level;
  let nextExp = exp + gain;
  let levelUps = 0;

  while (nextExp >= expToNext(nextLevel)) {
    nextExp -= expToNext(nextLevel);
    nextLevel += 1;
    levelUps += 1;
  }
  return { level: nextLevel, exp: nextExp, levelUps };
}
