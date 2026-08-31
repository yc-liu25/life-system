/**
 * 彩蛋通道 UI：汇报弹窗 + 结果展示。
 * 入口在聊天页输入栏的 🎁 按钮——刻意做得不显眼，保持"随缘"感。
 */
import { api } from '../api.js';

/**
 * 打开彩蛋汇报弹窗。
 * @param {() => void} [onDone] 关闭后回调（用于刷新面板/广播）
 */
export function openEggModal(onDone) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card egg-modal">
      <div class="egg-modal-icon">🎁</div>
      <h3>向六六汇报一件好事</h3>
      <p class="muted">
        清单之外的即兴小事：帮了别人、尝试了新东西、看见一件美事……<br>
        六六看<b>心情</b>给奖——可能是 EXP，也可能是稀有勋章。随缘。
      </p>
      <textarea class="egg-textarea" maxlength="200" rows="3"
                placeholder="今天我……（200字以内）"></textarea>
      <div class="egg-modal-actions">
        <button class="btn btn--ghost" data-act="cancel">算了</button>
        <button class="btn btn--primary" data-act="submit">汇报 ✨</button>
      </div>
      <p class="egg-fineprint muted">每日机会有限 · 六六心情不稳定 · 敬请谅解</p>
    </div>
  `;

  const textarea = overlay.querySelector('.egg-textarea');
  const submitBtn = overlay.querySelector('[data-act="submit"]');

  const close = () => overlay.remove();
  overlay.querySelector('[data-act="cancel"]').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  submitBtn.addEventListener('click', async () => {
    const text = textarea.value.trim();
    if (!text) {
      textarea.focus();
      textarea.placeholder = '（写点什么嘛，哪怕一句）';
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = '判定中…';

    try {
      const result = await api.submitEgg(text);
      showEggResult(overlay, result);
      onDone?.(result);
    } catch (err) {
      showEggResult(overlay, { granted: false, kind: 'error', quote: err.message });
    }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
  setTimeout(() => textarea.focus(), 300);
}

/** 在弹窗内展示判定结果（替换内容区） */
function showEggResult(overlay, result) {
  const card = overlay.querySelector('.egg-modal');

  const visuals = {
    exp: { icon: '🍬', title: '获得额外 EXP！' },
    medal: { icon: result.medal?.icon ?? '🏅', title: '稀有勋章掉落！' },
    miss: { icon: '🌙', title: '缘分未到' },
    cooldown: { icon: '⏳', title: '通道冷却中' },
    limitReached: { icon: '🚪', title: '今日打烊' },
    error: { icon: '📡', title: '出错了' },
  };
  const v = visuals[result.kind] ?? visuals.miss;

  const detail = result.kind === 'exp'
    ? `<div class="egg-reward">+${result.bonusExp} EXP → ${result.attribute.icon} ${result.attribute.name}</div>`
    : result.kind === 'medal'
      ? `<div class="egg-reward egg-reward--medal">${result.medal.icon} ${result.medal.name}</div>`
      : '';

  card.innerHTML = `
    <div class="egg-result-icon">${v.icon}</div>
    <h3>${v.title}</h3>
    ${detail}
    <p class="egg-quote">"${result.quote}"</p>
    <button class="btn btn--primary" data-act="close">${result.granted ? '收下啦' : '好吧'}</button>
  `;

  card.querySelector('[data-act="close"]').addEventListener('click', () => overlay.remove());
}
