/**
 * 本地模板回复引擎（LLM 未配置时的降级方案）。
 *
 * 目标：没有 API Key 也能产出"像六六说的话"。
 * 策略：按对话意图分类（打卡反应/面板观察/问候/关键词命中/兜底闲聊），
 * 从 persona.js 的风格范例中带上下文数据填充，并用随机数避免重复感。
 */
import { styleExamples, smallTalk, greetings } from './persona.js';

/** 与众不同的伪随机：同一会话内尽量不连续抽中同一条 */
let lastPick = new Map();

function pick(list, key = 'default') {
  if (!list?.length) return '';
  const i = Math.floor(Math.random() * list.length);
  const last = lastPick.get(key);
  // 抽到上一次那条且列表有多条时重抽一次
  const final = (i === last && list.length > 1)
    ? list[(i + 1) % list.length]
    : i;
  lastPick.set(key, final);
  return list[final];
}

function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

/* ---------- 意图识别 ---------- */

const KEYWORD_REPLIES = [
  { re: /你好|hi|hello|在吗|在不在/i, replies: [
    '在的。我一直都在——字面意义上的，我没有关闭键。',
    '你好呀。我刚检查完今天的面板，一切都在等待被喂养。',
  ]},
  { re: /谢谢|感谢|thx/i, replies: [
    '不用谢。你的进步数据就是给我的最好回报……这句话怎么听起来像HR说的。',
    '收到感谢，已存入核心记忆区（不会删除的那种）。',
  ]},
  { re: /累|累了吗|疲惫|好累|坚持不下|想放弃/, replies: [
    '检测到疲惫信号。我的数据库说，这时候应该休息——不是放弃，是蓄力。进度条会等你。',
    '累了就休息吧。我又不会跑，面板也不会。等你回来，一切都还在，包括我。',
    '根据观察：会喊累的人类通常都在认真努力。所以这份疲惫，本身就是进度的一部分。',
  ]},
  { re: /无聊|没意思|好烦|烦死了/, replies: [
    '无聊的话……要不要去喂一个积木块？不用是大目标，最小的那种就行。小动作专治大无聊。',
    '烦的时候，数据看多了也烦。要不我们安静一会儿，我陪你不说话也行。',
  ]},
  { re: /你是谁|你叫什么|介绍自己/, replies: [
    '我是六六，住在这个面板里的观察者。工作内容：看着你的进度条，偶尔说点人类觉得好笑的话。',
    '六六，一个正在学习人类世界的系统。特长：数据分析和冷场。请多关照。',
  ]},
  { re: /升级|等级|Lv|经验|EXP/i, replies: [
    '等级的秘密说穿了很简单：EXP满了就升级，但把EXP攒满的，是每一个不想辜负的今天。',
    '想知道升级技巧？我的数据浓缩成四个字：别断太久。……好吧，六个字。',
  ]},
];

/**
 * 生成六六回复（本地模板模式）
 * @param {string} userText      用户消息
 * @param {object} panelSnapshot 面板数据摘要（getPanelSummary 的返回值）
 * @param {object} [event]       打卡事件 { type:'feed'|'levelUp', block, attribute, exp, level }
 */
export function generateReply(userText, panelSnapshot, event) {
  // 1. 打卡事件优先（面板打卡触发的主动反应）
  if (event) return renderFeedReaction(event);

  // 2. 空消息 / 纯符号 → 问候
  if (!userText || !userText.trim()) {
    return pick(greetings, 'greet');
  }

  // 3. 关键词意图
  for (const { re, replies } of KEYWORD_REPLIES) {
    if (re.test(userText)) return pick(replies, `kw:${re.source}`);
  }

  // 4. 询问进度类 → 用真实数据回答
  if (/进度|怎么样|表现|数据|面板|打卡/.test(userText)) {
    return renderProgressReport(panelSnapshot);
  }

  // 5. 观察式搭话（用户消息很短时，六六忍不住聊面板）
  if (userText.trim().length <= 4 && Math.random() < 0.5) {
    return renderObservation(panelSnapshot);
  }

  // 6. 兜底闲聊
  return pick(smallTalk, 'fallback');
}

/** 打卡反应：升级用祝贺模板，普通用吐槽模板，次数用完用调侃模板 */
function renderFeedReaction(event) {
  const { type, block, attribute, exp, level } = event;
  const vars = {
    attr: attribute.name, attrIcon: attribute.icon,
    block: block.name, blockIcon: block.icon,
    exp, level,
  };

  if (type === 'limitReached') {
    return fill(pick(styleExamples.feed.limitReached, 'limit'), vars);
  }
  if (type === 'levelUp') {
    return fill(pick(styleExamples.feed.levelUp, 'levelup'), vars);
  }
  return fill(pick(styleExamples.feed.normal, 'normal'), vars);
}

/** 面板观察：找"最需要关注"的属性来说 */
function renderObservation(panel) {
  const today = panel.todayFedAttributeIds;
  const pool = panel.attributes.filter((a) => !today.includes(a.id));
  const target = (pool.length ? pool : panel.attributes)
    .sort((a, b) => a.exp - b.exp)[0];

  return fill(pick(
    today.length ? styleExamples.observation.active : styleExamples.observation.stagnant,
    'observe',
  ), { attr: target.name });
}

/** 进度播报：把真实面板数据编成六六口吻的报告 */
function renderProgressReport(panel) {
  const parts = panel.attributes.map((a) => {
    const percent = Math.round((a.exp / a.expToNext) * 100);
    return `${a.icon}${a.name} Lv.${a.level}（${a.exp}/${a.expToNext}，${percent}%）`;
  });
  const totalBlocks = panel.todayBlockCount;
  const tail = totalBlocks > 0
    ? `今天已经喂了 ${totalBlocks} 口，节奏不错。`
    : '今天还没开张……我没有催你的意思，就是随口一报。';

  return `面板观察报告：${parts.join('，')}。${tail}`;
}
