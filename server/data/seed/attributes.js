/**
 * 世界设定：大类 → 属性 → 日常积木 + 挑战任务（版本受控）
 *
 * 结构（对齐设计文档 §1/§2.1/§3 与《功能设想.txt》）：
 *   大类 (category) —— 身体健康 / 学习能力 / 科学减脂 / 认知成长
 *     └ 属性 (attribute) —— 最具体、可量化的成长单位（试验版：4个全开放）
 *         ├ dailyBlocks   —— 日常积木：具体、可衡量、当天可完成的短任务
 *         └ challenges    —— 挑战池：阶段性、有仪式感，系统按序发布
 *
 * 字段说明：
 * - exp            打卡/完成注入属性池的 EXP
 * - dailyLimit     日常积木每日次数上限（防刷分）
 * - locked         大类锁定（false = 开放）
 */
export const seedCategories = [
  {
    id: 'body',
    name: '身体健康',
    icon: '🫀',
    locked: false,
    attributes: [
      {
        id: 'vigor',
        name: '体魄与作息',
        icon: '🌙',
        tagline: '改善日常基础能量、睡眠质量与身体形态',
        dailyBlocks: [
          { id: 'golden-sleep', name: '黄金睡眠：23:00前入睡且睡满7.5小时', icon: '😴', exp: 25, dailyLimit: 1 },
          { id: 'hydration', name: '水分补给：全天饮水1500ml以上', icon: '💧', exp: 15, dailyLimit: 1 },
          { id: 'posture', name: '体态矫正：10分钟脊柱拉伸/肩颈放松', icon: '🧘', exp: 20, dailyLimit: 2 },
        ],
        challenges: [
          { id: 'vigor-week', name: '黄金睡眠七连击', desc: '连续7天达成黄金睡眠积木', exp: 100 },
          { id: 'vigor-rhythm', name: '固定作息实验', desc: '连续14天，固定入睡与起床时间（±30分钟内）', exp: 150 },
          { id: 'vigor-posture', name: '体态纪录片之月', desc: '本月累计完成20次体态矫正训练', exp: 200 },
        ],
      },
    ],
  },
  {
    id: 'mind',
    name: '学习能力',
    icon: '🧠',
    locked: false,
    attributes: [
      {
        id: 'express',
        name: '表达与沟通',
        icon: '🎤',
        tagline: '提升公众表达、逻辑清晰度与倾听反馈能力',
        dailyBlocks: [
          { id: 'impromptu', name: '即兴演讲：无草稿清晰讲述一个观点2分钟', icon: '🎤', exp: 25, dailyLimit: 2 },
          { id: 'deep-input', name: '高效输入：深度朗读优质文章5分钟', icon: '📖', exp: 15, dailyLimit: 2 },
          { id: 'review-talk', name: '复盘总结：一次高质量的主动沟通', icon: '💬', exp: 20, dailyLimit: 1 },
        ],
        challenges: [
          { id: 'express-3min', name: '3分钟即兴演讲挑战', desc: '任意主题，当众无草稿讲满3分钟', exp: 120 },
          { id: 'express-listen', name: '倾听者之日', desc: '一天内完成3次"只倾听不给建议"的完整对话', exp: 100 },
          { id: 'express-debate', name: '公开表达实战场', desc: '参加一次辩论、演讲比赛或主持一场讨论', exp: 200 },
        ],
      },
    ],
  },
  {
    id: 'burn',
    name: '科学减脂',
    icon: '🔥',
    locked: false,
    attributes: [
      {
        id: 'metabolism',
        name: '能量与代谢',
        icon: '⚡',
        tagline: '科学运动与饮食控制体脂，保持代谢活力',
        dailyBlocks: [
          { id: 'low-carb', name: '控卡饮食：至少一餐高蛋白低碳水', icon: '🥗', exp: 20, dailyLimit: 2 },
          { id: 'cardio', name: '有氧燃脂：20分钟以上有氧或快走', icon: '🏃', exp: 25, dailyLimit: 1 },
          { id: 'no-snack', name: '拒绝加餐：成功抵御一次高糖零食诱惑', icon: '🍏', exp: 15, dailyLimit: 1 },
        ],
        challenges: [
          { id: 'meta-week', name: '燃脂一周目', desc: '一周内累计完成5次有氧燃脂积木', exp: 100 },
          { id: 'meta-diet', name: '控卡七天挑战', desc: '连续7天每天至少一餐达标控卡饮食', exp: 120 },
          { id: 'meta-milestone', name: '体脂里程碑', desc: '达成阶段性体脂/围度目标并记录数据', exp: 250 },
        ],
      },
    ],
  },
  {
    id: 'focus',
    name: '认知成长',
    icon: '📚',
    locked: false,
    attributes: [
      {
        id: 'deepwork',
        name: '专注与深度输入',
        icon: '🎯',
        tagline: '对抗碎片化信息，提升深度思考与长时间专注能力',
        dailyBlocks: [
          { id: 'no-phone', name: '无手机时刻：专注模式45分钟不碰手机', icon: '📵', exp: 25, dailyLimit: 2 },
          { id: 'deep-read', name: '深度阅读：无干扰连续阅读20分钟', icon: '📚', exp: 20, dailyLimit: 2 },
          { id: 'deep-note', name: '复盘输出：写一段深度思考或日记', icon: '✍️', exp: 15, dailyLimit: 1 },
        ],
        challenges: [
          { id: 'deep-90', name: '90分钟深度工作', desc: '单次不受干扰地连续专注90分钟', exp: 120 },
          { id: 'deep-book', name: '啃完一本硬书', desc: '读完一本一直想读但没读的严肃书籍', exp: 200 },
          { id: 'deep-sunday', name: '离线星期日', desc: '一个休息日只使用必要的通讯功能，其余时间离线', exp: 150 },
        ],
      },
    ],
  },
];

/** 扁平化：所有开放属性的列表（服务层主要消费这个） */
export const openAttributes = seedCategories
  .filter((c) => !c.locked)
  .flatMap((c) => c.attributes);

/** 按 id 建索引 */
export const attributeIndex = Object.fromEntries(
  openAttributes.map((attr) => [attr.id, attr]),
);

/** 查积木块（含所属属性） */
export function findBlock(blockId) {
  for (const attr of openAttributes) {
    const block = attr.dailyBlocks.find((b) => b.id === blockId);
    if (block) return { attribute: attr, block };
  }
  return null;
}
