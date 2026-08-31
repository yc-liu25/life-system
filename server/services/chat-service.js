/**
 * 聊天服务：对话编排（人格 + 面板上下文 + LLM/模板双模式）。
 *
 * 职责：
 * - 组装"面板快照"注入对话上下文，让六六说得出具体数据
 * - LLM 已配置 → 走 ai/client.js；未配置 → 降级 ai/reply-engine.js
 * - 对话历史持久化（storage），重启不丢
 */
import { systemPrompt } from '../ai/persona.js';
import { chatCompletion, isLlmConfigured } from '../ai/client.js';
import { generateReply } from '../ai/reply-engine.js';
import { loadState, saveState } from './storage.js';
import { getPanel } from './progress-service.js';
import { ApiError } from './api-error.js';
import { createLogger } from '../logger.js';

const log = createLogger('chat-service');

const MAX_HISTORY = 40;           // 持久化的对话轮数上限
const LLM_CONTEXT_WINDOW = 12;    // 送入 LLM 的最近消息数

/** 从新面板结构中取出所有开放属性（扁平） */
function openAttrs(panel) {
  return panel.categories
    .flatMap((c) => c.attributes)
    .filter((a) => !a.locked);
}

/** 把面板数据压缩成给 LLM 看的文本摘要 */
function panelDigest() {
  const panel = getPanel();
  const attrs = openAttrs(panel)
    .map((a) => `${a.name} Lv.${a.level}（${a.exp}/${a.expToNext}）`
      + a.dailyBlocks.map((b) => `\n  - ${b.name}：今日剩 ${b.remaining} 次`).join(''))
    .join('\n');
  const challenges = openAttrs(panel)
    .filter((a) => a.challenge?.status === 'published')
    .map((a) => `【${a.name}】${a.challenge.name}（+${a.challenge.exp} EXP）`)
    .join('；');
  return `【用户面板实时数据】\n${attrs}\n今日打卡总次数：${panel.todayBlockCount}\n连续打卡：${panel.streak} 天\n进行中的挑战：${challenges || '无'}`;
}

/** 面板数据摘要（供本地模板引擎使用） */
export function getPanelSummary() {
  const panel = getPanel();
  const attrs = openAttrs(panel);
  return {
    attributes: attrs.map((a) => ({
      id: a.id, name: a.name, icon: a.icon,
      level: a.level, exp: a.exp, expToNext: a.expToNext,
    })),
    todayFedAttributeIds: attrs
      .filter((a) => a.dailyBlocks.some((b) => b.usedToday > 0))
      .map((a) => a.id),
    todayBlockCount: panel.todayBlockCount,
  };
}

function loadHistory() {
  return loadState().chatHistory ?? [];
}

/**
 * 处理一条用户消息，返回六六的回复。
 * @returns {{ reply: string, mode: 'llm'|'local' }}
 */
export async function sendMessage(userText) {
  if (typeof userText !== 'string') {
    throw new ApiError(400, '消息内容无效');
  }
  const text = userText.slice(0, 500); // 防超长输入

  const history = loadHistory();
  history.push({ role: 'user', content: text, at: Date.now() });

  let reply;
  let mode = 'local';

  if (isLlmConfigured()) {
    try {
      const messages = [
        ...history.slice(-LLM_CONTEXT_WINDOW).map(({ role, content }) => ({ role, content })),
      ];
      // 面板数据以 system 附言方式注入，随每次请求刷新
      const system = `${systemPrompt}\n\n${panelDigest()}`;
      reply = await chatCompletion(system, messages);
      mode = 'llm';
    } catch (err) {
      log.warn('LLM 调用失败，降级为本地模板：', err.message);
      reply = generateReply(text, getPanelSummary());
    }
  } else {
    reply = generateReply(text, getPanelSummary());
  }

  history.push({ role: 'assistant', content: reply, at: Date.now(), mode });

  const state = loadState();
  state.chatHistory = history.slice(-MAX_HISTORY);
  saveState();

  return { reply, mode };
}

/** 读取历史（前端进聊天页时拉取） */
export function getHistory() {
  return loadHistory().map(({ role, content, at }) => ({ role, content, at }));
}

/** 清空对话（前端"重新开始"按钮） */
export function clearHistory() {
  loadState().chatHistory = [];
  saveState();
}
