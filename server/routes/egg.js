/**
 * 彩蛋通道路由。
 */
import { Router } from 'express';
import { submitEggReport } from '../services/easter-egg-service.js';

const router = Router();

/** POST /api/egg/report { text } —— 汇报一件清单之外的好事，随缘得奖 */
router.post('/egg/report', (req, res, next) => {
  try {
    const { text } = req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ ok: false, error: '说点什么吧，哪怕很小的事' });
      return;
    }
    const result = submitEggReport(text.trim().slice(0, 200));
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
