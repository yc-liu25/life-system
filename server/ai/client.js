/**
 * 大模型客户端封装（Phase 4 启用）。
 *
 * 约定：
 * - 通过环境变量配置；未配置时 chat-service 自动降级为本地模板引擎，
 *   前端体验完整、不会报错（对应 step3 要求）。
 * - 返回格式统一为 string；调用方不感知具体厂商差异。
 *
 * 环境变量（可在 xiaoban/.env 或启动前设置）：
 *   AI_PROVIDER = 'anthropic' | 'openai'     默认 anthropic
 *   AI_API_KEY  = 你的密钥
 *   AI_MODEL    = 模型ID（如 claude-sonnet-5 / gpt-4o），有默认值
 */
import { createLogger } from '../logger.js';

const log = createLogger('ai-client');

const PROVIDER_DEFAULTS = {
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-5',
    headers: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    }),
    /** Anthropic Messages API 请求体格式 */
    body: (system, messages, model) => ({
      model,
      max_tokens: 300,
      system,
      messages,
    }),
    /** 从响应中取出回复文本 */
    parse: (data) => data?.content?.[0]?.text,
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    }),
    /** OpenAI Chat Completions 请求体格式（system 放进消息数组） */
    body: (system, messages, model) => ({
      model,
      max_tokens: 300,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
    parse: (data) => data?.choices?.[0]?.message?.content,
  },
};

export function isLlmConfigured() {
  const provider = process.env.AI_PROVIDER ?? 'anthropic';
  return Boolean(process.env.AI_API_KEY && PROVIDER_DEFAULTS[provider]);
}

/**
 * 调用大模型生成回复。
 * @param {string} system    系统提示词（人格设定）
 * @param {Array}  messages  [{ role: 'user'|'assistant', content }]
 * @returns {string} 模型回复文本；失败时抛错，由调用方降级处理
 */
export async function chatCompletion(system, messages) {
  const providerName = process.env.AI_PROVIDER ?? 'anthropic';
  const provider = PROVIDER_DEFAULTS[providerName];
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL ?? provider.model;

  const res = await fetch(provider.url, {
    method: 'POST',
    headers: provider.headers(apiKey),
    body: JSON.stringify(provider.body(system, messages, model)),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const text = provider.parse(await res.json());
  if (!text) throw new Error('LLM 响应格式异常');
  return text.trim();
}
