/**
 * 面板路由：GET 面板数据 / POST 打卡 / POST 挑战完成。
 * 只做参数接收与业务调用；错误统一由 error middleware 转成 JSON。
 */
import { Router } from 'express';
import { getPanel, feedBlock, completeChallenge } from '../services/progress-service.js';

const router = Router();

/** GET /api/panel —— 面板全量数据（大类/属性/积木/挑战/时间线） */
router.get('/panel', (_req, res) => {
  res.json({ ok: true, panel: getPanel() });
});

/** POST /api/panel/feed { blockId } —— 打卡：日常积木喂养属性 */
router.post('/panel/feed', (req, res) => {
  const { blockId } = req.body ?? {};
  if (!blockId || typeof blockId !== 'string') {
    res.status(400).json({ ok: false, error: '缺少 blockId' });
    return;
  }
  const result = feedBlock(blockId);
  res.json({ ok: true, ...result });
});

/** POST /api/panel/challenge/complete { attributeId } —— 完成当前挑战 */
router.post('/panel/challenge/complete', (req, res, next) => {
  try {
    const { attributeId } = req.body ?? {};
    if (!attributeId || typeof attributeId !== 'string') {
      res.status(400).json({ ok: false, error: '缺少 attributeId' });
      return;
    }
    const result = completeChallenge(attributeId);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
