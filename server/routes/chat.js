/**
 * 聊天路由：历史读取 / 发消息 / 清空。
 */
import { Router } from 'express';
import { sendMessage, getHistory, clearHistory } from '../services/chat-service.js';

const router = Router();

/** GET /api/chat/history —— 对话历史 */
router.get('/chat/history', (_req, res) => {
  res.json({ ok: true, history: getHistory() });
});

/** POST /api/chat/send { text } —— 发送消息，返回六六回复 */
router.post('/chat/send', async (req, res, next) => {
  try {
    const { text } = req.body ?? {};
    const result = await sendMessage(text);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/chat/history —— 清空对话 */
router.delete('/chat/history', (_req, res) => {
  clearHistory();
  res.json({ ok: true });
});

export default router;
