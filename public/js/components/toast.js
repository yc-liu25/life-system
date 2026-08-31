/**
 * Toast 轻提示：打卡成功 / 出错时的非阻断反馈。
 */
let container = null;
let timer = null;

export function toast(message, type = 'info', duration = 2600) {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  container.appendChild(el);

  // 触发入场动画
  requestAnimationFrame(() => el.classList.add('is-visible'));

  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
