/**
 * 六六 · 服务端入口
 * 职责只有一个：创建 Express 应用、挂中间件与路由、启动监听。
 * 具体业务（积分、AI人格……）分别住在 services/ 与 routes/ 里。
 */
import path from 'node:path';
import express from 'express';
import { config } from './config/index.js';
import { createLogger } from './logger.js';
import { registerRoutes, registerErrorHandlers } from './routes/index.js';

const log = createLogger('server');

const app = express();

/* ---------- 中间件 ---------- */
app.use(express.json({ limit: '1mb' }));

/* ---------- API 路由 ---------- */
registerRoutes(app);
registerErrorHandlers(app);

/* ---------- 前端静态资源 ---------- */
app.use(express.static(config.publicDir));

/* ---------- 其余路径交回前端（单页应用入口） ---------- */
app.use((_req, res) => {
  res.sendFile(path.resolve(config.publicDir, 'index.html'));
});

/* ---------- 启动 ---------- */
app.listen(config.port, () => {
  log.info(`${config.appName} 已启动`);
  log.info(`本地访问: http://localhost:${config.port}`);
});
