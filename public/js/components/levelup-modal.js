/**
 * 升级弹窗：属性升级时的高光时刻反馈（对应设计文档"升级时系统以它的性格祝贺你"，
 * Phase 3 接入 AI 后，祝贺语将由六六人格生成；当前为预设模板）。
 */
export function showLevelUpModal({ attributeName, attributeIcon, level }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card modal-card--levelup">
      <div class="levelup-sparkle">✨</div>
      <div class="levelup-icon">${attributeIcon}</div>
      <div class="levelup-label">${attributeName} 达到</div>
      <div class="levelup-level">Lv.${level}</div>
      <p class="levelup-quote">每一次打卡，都在悄悄重塑你。</p>
      <button class="btn btn--primary">继续成长</button>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.querySelector('button').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}
