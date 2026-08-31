/**
 * 前端路由：把 nav 按钮映射到对应页面的渲染函数。
 * 新增页面 = 新增一个 pages/xxx.js + 在 pages 表里注册一行。
 */
import { renderPanel } from './pages/panel.js';
import { renderChat } from './pages/chat.js';

const pages = {
  panel: renderPanel,
  chat: renderChat,
};

let currentPage = null;

export function initRouter(rootEl) {
  // 顶栏导航点击 → 切换页面
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page, rootEl));
  });
  // 默认进入面板页
  switchPage('panel', rootEl);
}

function switchPage(name, rootEl) {
  const render = pages[name];
  if (!render) return;

  if (currentPage === name) return;
  currentPage = name;

  // 导航高亮
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.page === name);
  });

  render(rootEl);
}
