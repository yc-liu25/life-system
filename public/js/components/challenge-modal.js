/**
 * 挑战完成确认弹窗：大额奖励要有确认仪式，防误触。
 * 返回 Promise<boolean>：true = 确认完成。
 */
export function showChallengeModal({ name, exp }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card challenge-modal">
        <div class="challenge-modal-icon">🎖</div>
        <h3>确认完成挑战？</h3>
        <p class="challenge-modal-name">「${name}」</p>
        <div class="challenge-modal-reward">+${exp} EXP</div>
        <p class="muted">系统会记录这次挑战，并开始筹备下一个。<br>确定你已经真的做到了？</p>
        <div class="challenge-modal-actions">
          <button class="btn btn--ghost" data-act="no">还没有</button>
          <button class="btn btn--primary" data-act="yes">做到了 ✓</button>
        </div>
      </div>
    `;

    const close = (val) => {
      overlay.classList.remove('is-visible');
      setTimeout(() => overlay.remove(), 250);
      resolve(val);
    };
    overlay.querySelector('[data-act="no"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-act="yes"]').addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
  });
}
