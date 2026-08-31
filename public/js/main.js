/**
 * 前端入口：启动健康检查 → 初始化路由 → 状态栏反馈 → 首次进入触发新手教程。
 */
import { api } from './api.js';
import { store } from './state.js';
import { initRouter } from './router.js';
import { isTutorialDone, startTutorial, initTutorialButton } from './components/tutorial.js';

function setConnection(ok, text) {
  const dot = document.getElementById('status-connection');
  const label = document.getElementById('status-text');
  dot.className = `status-dot ${ok ? 'status-dot--ok' : 'status-dot--bad'}`;
  label.textContent = text;
}

async function boot() {
  initTutorialButton(); // 顶栏常驻「新手教程」按钮
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

  // 首次进入：等面板渲染完成后自动开始新手教程
  if (!isTutorialDone()) {
    setTimeout(() => startTutorial(), 900);
  }
}

document.addEventListener('DOMContentLoaded', boot);
