/**
 * 前端入口：启动健康检查 → 初始化路由 → 状态栏反馈。
 */
import { api } from './api.js';
import { store } from './state.js';
import { initRouter } from './router.js';

function setConnection(ok, text) {
  const dot = document.getElementById('status-connection');
  const label = document.getElementById('status-text');
  dot.className = `status-dot ${ok ? 'status-dot--ok' : 'status-dot--bad'}`;
  label.textContent = text;
}

async function boot() {
  initRouter(document.getElementById('main'));

  try {
    const health = await api.health();
    const meta = await api.meta();
    store.set('meta', meta);
    document.getElementById('app-title').textContent = meta.appName;
    document.title = meta.appName;
    setConnection(true, `已连接 · ${health.app} v${meta.version}`);
  } catch (err) {
    setConnection(false, `后端连接失败：${err.message}`);
  }
}

document.addEventListener('DOMContentLoaded', boot);
