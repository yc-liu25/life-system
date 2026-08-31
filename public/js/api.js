/**
 * API 封装：前端所有后端请求都经过这里，方便统一处理错误与未来加鉴权。
 * 后端约定响应格式：{ ok: true, ...data } 或 { ok: false, error, code? }
 */

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch { /* 非 JSON 响应 */ }

  if (!res.ok || body?.ok === false) {
    const message = body?.error ?? `请求失败（HTTP ${res.status}）`;
    const err = new Error(message);
    err.code = body?.code;
    err.status = res.status;
    throw err;
  }
  return body;
}

export const api = {
  health: () => request('/api/health'),
  meta: () => request('/api/meta'),
  getPanel: () => request('/api/panel'),
  feedBlock: (blockId) =>
    request('/api/panel/feed', {
      method: 'POST',
      body: JSON.stringify({ blockId }),
    }),
  completeChallenge: (attributeId) =>
    request('/api/panel/challenge/complete', {
      method: 'POST',
      body: JSON.stringify({ attributeId }),
    }),
  getChatHistory: () => request('/api/chat/history'),
  sendChat: (text) =>
    request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  /** 打卡事件的系统侧留档（六六"看见"打卡的记录，不产生回复） */
  sendChatSystemEvent: (event) =>
    request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ text: `[系统事件] ${event.type}:${event.block?.name ?? ''}` }),
    }),
  clearChat: () => request('/api/chat/history', { method: 'DELETE' }),
  submitEgg: (text) =>
    request('/api/egg/report', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};
