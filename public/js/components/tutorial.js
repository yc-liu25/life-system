/**
 * 新手教程组件：分步高亮引导，首次进入自动触发，可随时跳过。
 *
 * 结构：
 * - 步骤定义在 TUTORIAL_STEPS（每步含定位选择器、标题、正文、放置方向）
 * - DOM 上一套三层：遮罩层(挖洞) + 高亮框 + 卡片
 * - 进度用 localStorage 键 `tutorial_done` 持久化
 * - 顶栏「新手教程」按钮可随时重走
 */
const STORAGE_KEY = 'tutorial_done';

/** 每个步骤：selector 为要高亮的元素；找不到元素时自动退化为居中卡片 */
const TUTORIAL_STEPS = [
  {
    selector: '#sys-banner, .sys-banner',
    title: '📊 系统横幅',
    body: '这里实时显示你的连续打卡天数和今日进度。系统的眼睛，一直都在。',
    next: '跳过也行，但下面的功能真的会用上 →',
  },
  {
    selector: '.attribute-card',
    title: '📌 日常积木（增分）',
    body: '每个属性由3个具体、可衡量的行为积木喂养。真实做到了就点一下：EXP自动入账，进度条实时流动。',
    note: '积木有每日上限——防刷分，也防止自我欺骗。',
  },
  {
    selector: '.challenge-card',
    title: '🎖 系统挑战（大额增分）',
    body: '系统按序发布阶段性挑战，完成给大额EXP。完成后有3天筹备期才发布下一个——挑战是稀缺的，才值得被记住。做到才点确认，这是对自己的诚实。',
  },
  {
    selector: '[data-page="chat"]',
    title: '💬 六六（AI陪伴）',
    body: '系统人格六六读得懂你的面板数据。在面板打卡后切到聊天页，她会主动来吐槽或祝贺；你也能问进度、聊情绪。打卡的正反馈，多一个声音帮你放大。',
  },
  {
    selector: '#egg-btn',
    title: '🎁 彩蛋通道（随缘增分）',
    body: '清单之外的即兴好事，可以汇报给六六。她"看心情"给奖：额外EXP或稀有勋章。每天限2次、有冷却——刻意稀缺，才不会被滥用成第二个刷分入口。',
  },
  {
    selector: '.attribute-card--warning, .attribute-card--danger',
    title: '⚠ 属性衰减（减分机制）',
    body: '任何属性超过72小时没人维护就开始掉EXP，卡片会亮起警告，六六也会切换成机械冷酷腔。但放心：等级永不掉落、EXP永不归零——紧迫感，不绝望。',
    fallback: '衰减是隐形的——只有真的72小时没打卡才会出现。现在看看这张示意图就好。',
  },
  {
    selector: '.topbar-nav',
    title: '🎓 随时回来重看',
    body: '顶栏的「新手教程」按钮可以随时重走本引导。现在，去完成今天的第一块积木吧——宿主，系统已就绪。',
    final: true,
  },
];

/** 遮罩层 SVG 挖洞路径计算所需数据 */
let overlayState = null;

export function isTutorialDone() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

export function markTutorialDone() {
  localStorage.setItem(STORAGE_KEY, '1');
}

/** 启动教程（入口：首次进入自动调用 / 顶栏按钮手动调用） */
export function startTutorial() {
  // 防止重复启动
  if (document.getElementById('tutorial-root')) return;

  const root = document.createElement('div');
  root.id = 'tutorial-root';
  root.innerHTML = `
    <div class="tut-overlay">
      <svg class="tut-svg" width="100%" height="100%">
        <rect class="tut-mask" x="0" y="0" width="100%" height="100%" fill="rgba(20,26,20,0.72)"/>
      </svg>
    </div>
    <div class="tut-highlight" style="display:none"></div>
    <div class="tut-card" style="display:none">
      <div class="tut-card-head">
        <span class="tut-step-index"></span>
        <h4 class="tut-title"></h4>
        <button class="tut-skip" title="跳过全部">跳过全部 ✕</button>
      </div>
      <p class="tut-body"></p>
      <p class="tut-note" style="display:none"></p>
      <div class="tut-card-foot">
        <span class="tut-progress"></span>
        <div class="tut-btns">
          <button class="tut-btn tut-prev">上一步</button>
          <button class="tut-btn tut-next">下一步</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  let current = 0;

  const els = {
    svg: root.querySelector('.tut-svg'),
    mask: root.querySelector('.tut-mask'),
    highlight: root.querySelector('.tut-highlight'),
    card: root.querySelector('.tut-card'),
    index: root.querySelector('.tut-step-index'),
    title: root.querySelector('.tut-title'),
    body: root.querySelector('.tut-body'),
    note: root.querySelector('.tut-note'),
    progress: root.querySelector('.tut-progress'),
    prevBtn: root.querySelector('.tut-prev'),
    nextBtn: root.querySelector('.tut-next'),
    skipBtn: root.querySelector('.tut-skip'),
  };

  function cleanup() {
    markTutorialDone();
    root.classList.add('is-closing');
    setTimeout(() => root.remove(), 250);
  }

  function renderStep(i) {
    current = i;
    const step = TUTORIAL_STEPS[i];

    // 定位目标元素（找不到 → 居中卡片模式）
    const target = step.selector ? document.querySelector(step.selector) : null;

    els.index.textContent = `${i + 1}/${TUTORIAL_STEPS.length}`;
    els.title.textContent = step.title;
    els.body.textContent = step.body;
    els.progress.textContent = step.next ?? '';
    els.note.style.display = step.note ? 'block' : 'none';
    if (step.note) els.note.textContent = step.note;

    els.prevBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
    els.nextBtn.textContent = step.final ? '完成 ✓' : '下一步';

    if (target) {
      const r = target.getBoundingClientRect();
      const pad = 10;
      const W = window.innerWidth, H = window.innerHeight;

      // SVG 挖洞：外矩形 + 内矩形（反向绕行）构成遮罩洞
      els.mask.setAttribute('d', `
        M0,0 H${W} V${H} H0 Z
        M${r.left - pad},${r.top - pad}
        h${r.width + pad * 2} v${r.height + pad * 2}
        h-${r.width + pad * 2} Z
      `);
      els.svg.setAttribute('width', W);
      els.svg.setAttribute('height', H);

      els.highlight.style.display = 'block';
      els.highlight.style.left = `${r.left - pad}px`;
      els.highlight.style.top = `${r.top - pad}px`;
      els.highlight.style.width = `${r.width + pad * 2}px`;
      els.highlight.style.height = `${r.height + pad * 2}px`;

      positionCard(r, pad);
    } else {
      // 无目标：居中卡片 + 全暗遮罩
      els.mask.setAttribute('d', `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`);
      els.highlight.style.display = 'none';
      els.card.style.left = '50%';
      els.card.style.top = '50%';
      els.card.style.transform = 'translate(-50%, -50%)';
    }

    if (step.fallback && !target) {
      els.note.style.display = 'block';
      els.note.textContent = step.fallback;
    }
  }

  /** 把卡片放在高亮框下方；放不下则放上方 */
  function positionCard(targetRect, pad) {
    els.card.style.transform = 'none';
    const cardW = 340;
    els.card.style.width = `${cardW}px`;

    const left = Math.max(12, Math.min(
      targetRect.left + targetRect.width / 2 - cardW / 2,
      window.innerWidth - cardW - 12,
    ));
    els.card.style.left = `${left}px`;

    const below = targetRect.bottom + 14;
    const cardH = els.card.offsetHeight || 200;
    if (below + cardH < window.innerHeight - 12) {
      els.card.style.top = `${below}px`;
    } else {
      // 放上方
      const top = targetRect.top - cardH - 14;
      els.card.style.top = `${Math.max(12, top)}px`;
    }
  }

  // ---- 事件绑定 ----
  els.nextBtn.addEventListener('click', () => {
    if (current >= TUTORIAL_STEPS.length - 1) {
      cleanup();
    } else {
      renderStep(current + 1);
    }
  });
  els.prevBtn.addEventListener('click', () => {
    if (current > 0) renderStep(current - 1);
  });
  els.skipBtn.addEventListener('click', cleanup);
  document.addEventListener('keydown', function onKey(e) {
    if (!document.getElementById('tutorial-root')) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Escape') cleanup();
    if (e.key === 'ArrowRight') els.nextBtn.click();
    if (e.key === 'ArrowLeft') els.prevBtn.click();
  });
  window.addEventListener('resize', () => {
    if (document.getElementById('tutorial-root')) renderStep(current);
  });

  renderStep(0);
}

/** 顶栏教程按钮（不存在则创建），绑定重走逻辑 */
export function initTutorialButton() {
  let btn = document.querySelector('#tutorial-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'tutorial-btn';
    btn.className = 'nav-btn tutorial-btn';
    btn.textContent = '🎓 新手教程';
    document.querySelector('.topbar-nav')?.appendChild(btn);
  }
  btn.addEventListener('click', () => startTutorial());
}
