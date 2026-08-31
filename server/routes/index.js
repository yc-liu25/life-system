/**
 * 路由注册中心：所有 API 路由在这里统一挂载。
 * 后续新增模块（AI人格、彩蛋通道……）时，
 * 各自建一个 routes/xxx.js，然后在这里一行注册即可。
 */
import { Router } from 'express';
import { config } from '../config/index.js';
import { createLogger } from '../logger.js';
import panelRoutes from './panel.js';
import chatRoutes from './chat.js';
import eggRoutes from './egg.js';

const log = createLogger('routes');
const router = Router();

/**
 * GET /api/health —— 健康检查：前端用它判断后端是否可达。
 */
router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: config.appName,
    time: new Date().toISOString(),
  });
});

/**
 * GET /api/meta —— 应用元信息：前端启动时拉取，用于渲染标题等。
 */
router.get('/meta', (_req, res) => {
  res.json({
    appName: config.appName,
    version: '0.5.0',
    phases: {
      panel: 'live',       // 面板页（大类→属性→日常+挑战）
      chat: 'live',        // 聊天页（六六人格）
      egg: 'live',         // 彩蛋通道（随缘奖励）
      challenge: 'live',   // 挑战任务系统
    },
  });
});

/* ---------- 业务模块路由 ---------- */
router.use(panelRoutes);
router.use(chatRoutes);
router.use(eggRoutes);

export function registerRoutes(app) {
  app.use('/api', router);
  log.info('API 路由已挂载：/api/health, /api/meta, /api/panel, /api/panel/feed, /api/chat/*, /api/egg/report');
}

/** 404 + 业务错误的统一 JSON 出口 */
export function registerErrorHandlers(app) {
  // 未匹配的 /api 路径 → 404 JSON（而不是前端页面）
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: '接口不存在' });
  });

  // 业务错误（ApiError）与其余异常 → 统一 JSON 格式
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    if (status >= 500) {
      log.error('未处理异常：', err);
    }
    res.status(status).json({
      ok: false,
      error: err.message ?? '服务器内部错误',
      code: err.code,
    });
  });
}
