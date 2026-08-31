/**
 * 面板页：系统状态条 + 大类导航 + 属性卡（日常积木+挑战）+ 勋章墙 + 成长足迹。
 * 数据来自 GET /api/panel；打卡/挑战后局部刷新，不整页重载。
 */
import { api } from '../api.js';
import { store } from '../state.js';
import { toast } from '../components/toast.js';
import { showLevelUpModal } from '../components/levelup-modal.js';
import { showChallengeModal } from '../components/challenge-modal.js';

let isFeeding = false;

export function renderPanel(root) {
  root.innerHTML = `
    <section class="page page-panel">
      <div class="sys-banner card">
        <div class="sys-banner-text">
          <span class="sys-banner-tag">SYSTEM</span>
          <span id="sys-message">系统初始化完毕。宿主，欢迎回来。</span>
        </div>
        <div class="sys-stats" id="sys-stats"></div>
      </div>

      <div id="categories" class="category-list">
        <div class="card card-hero"><p class="muted">正在载入系统面板…</p></div>
      </div>

      <div id="medals" class="medals"></div>
      <div id="timeline" class="timeline"></div>
    </section>
  `;

  loadPanel();

  store.subscribe('eggEvent', (result) => {
    if (!result) return;
    loadPanel();
    if (result.kind === 'exp' && result.levelUps > 0) {
      showLevelUpModal({
        attributeName: result.attribute.name,
        attributeIcon: result.attribute.icon,
        level: result.attribute.level,
      });
    }
  });
}

/* ---------- 面板加载与渲染 ---------- */

async function loadPanel() {
  try {
    const { panel } = await api.getPanel();
    renderSysBanner(panel);
    renderCategories(panel.categories);
    renderMedals(panel.medals);
    renderTimeline(panel.timeline);

    // 衰减警告：极简机械腔，逐条弹出（与六六的呆萌腔形成反差）
    if (panel.decayEvents?.length) {
      panel.decayEvents.forEach((ev, i) => {
        setTimeout(() => toast(ev.warning, 'warning', 4200), i * 500);
      });
      // 广播给六六，让她也用冷酷腔补一句
      store.set('feedEvent', {
        type: 'decay',
        attribute: { name: panel.decayEvents[0].attributeName },
        warnings: panel.decayEvents.map((e) => e.attributeName),
      });
    }
  } catch (err) {
    toast(`面板加载失败：${err.message}`, 'error');
  }
}

/** 顶部系统横幅：连击/今日进度，系统流味道的"状态播报" */
function renderSysBanner(panel) {
  const today = new Date().toLocaleDateString('zh-CN', {
    month: 'long', day: 'numeric', weekday: 'long',
  });
  const parts = [`📅 ${today}`];
  if (panel.streak > 0) parts.push(`🔥 连续打卡 ${panel.streak} 天`);
  parts.push(`⚡ 今日 ${panel.todayBlockCount} 次打卡`);
  document.getElementById('sys-stats').textContent = parts.join('　');
}

/* ---------- 大类与属性 ---------- */

function renderCategories(categories) {
  const container = document.getElementById('categories');
  container.innerHTML = categories.map((cat) => `
    <div class="category-block">
      <div class="category-header">
        <span class="category-icon">${cat.icon}</span>
        <h3 class="category-name">${cat.name}</h3>
        ${cat.locked ? '<span class="category-locked">🔒 待解锁</span>' : ''}
      </div>
      <div class="category-attributes">
        ${cat.attributes.map((attr) => attrCardHtml(attr)).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.block-btn').forEach((btn) => {
    btn.addEventListener('click', () => feed(btn));
  });
  container.querySelectorAll('.challenge-btn').forEach((btn) => {
    btn.addEventListener('click', () => completeChallengeFlow(btn));
  });
}

function attrCardHtml(attr) {
  if (attr.locked) {
    return `
      <article class="card attribute-card attribute-card--locked">
        <header class="attribute-head">
          <span class="attribute-icon">${attr.icon}</span>
          <div class="attribute-title">
            <h3>${attr.name}</h3>
          </div>
        </header>
        <p class="muted">该属性尚在封印中。先把手头的两条线养好，它会自己亮起来。</p>
      </article>
    `;
  }

  return `
    <article class="card attribute-card ${idleCardClass(attr.idle)}"
             data-attribute="${attr.id}">
      <header class="attribute-head">
        <span class="attribute-icon">${attr.icon}</span>
        <div class="attribute-title">
          <h3>${attr.name} <span class="attribute-level">Lv.${attr.level}</span>
            ${idleBadgeHtml(attr.idle)}</h3>
          <p class="muted">${attr.tagline}</p>
        </div>
      </header>

      <div class="progress" role="progressbar"
           aria-valuemin="0" aria-valuemax="${attr.expToNext}"
           aria-valuenow="${attr.exp}">
        <div class="progress-fill" style="width: ${progressPercent(attr)}%"></div>
        <span class="progress-text">${attr.exp} / ${attr.expToNext} EXP</span>
      </div>

      <p class="section-label">📌 今日积木</p>
      <div class="block-grid">
        ${attr.dailyBlocks.map((block) => blockButtonHtml(block)).join('')}
      </div>

      ${challengeHtml(attr)}
    </article>
  `;
}

function blockButtonHtml(block) {
  const disabled = block.remaining <= 0;
  return `
    <button class="block-btn" ${disabled ? 'disabled' : ''}
            data-block="${block.id}"
            data-remaining="${block.remaining}" data-exp="${block.exp}"
            title="每次 +${block.exp} EXP · 每日上限 ${block.dailyLimit} 次">
      <span class="block-icon">${block.icon}</span>
      <span class="block-name">${block.name}</span>
      <span class="block-meta">+${block.exp} EXP · 剩余 ${block.remaining} 次</span>
    </button>
  `;
}

/* ---------- 闲置/衰减视觉状态 ---------- */

const IDLE_CLASSES = {
  warning: 'attribute-card--warning',
  danger: 'attribute-card--danger',
};

function idleCardClass(idle) {
  return IDLE_CLASSES[idle?.level] ?? '';
}

function idleBadgeHtml(idle) {
  if (!idle) return '';
  if (idle.level === 'danger') {
    return `<span class="idle-badge idle-badge--danger" title="超过72小时未维护，衰减中">⚠ 衰减中</span>`;
  }
  if (idle.level === 'warning') {
    return `<span class="idle-badge idle-badge--warning" title="超过48小时未维护，临近衰减">⚠ ${idle.hours}小时未维护</span>`;
  }
  return '';
}

/* ---------- 挑战任务卡 ---------- */

function challengeHtml(attr) {
  const c = attr.challenge;
  if (!c) return '';

  if (c.status === 'locked') {
    return `
      <div class="challenge-card challenge-card--locked">
        <span class="challenge-label">🎖 挑战筹备中</span>
        <p class="challenge-name">「${c.completedName}」完成！下一个挑战将在 ${c.countdown} 天后发布</p>
        <p class="challenge-desc">好钢用在刀刃上——挑战是稀缺的，才值得被记住。</p>
      </div>
    `;
  }
  if (c.status === 'empty') {
    return `
      <div class="challenge-card challenge-card--locked">
        <span class="challenge-label">🎖 挑战池</span>
        <p class="challenge-name">已全部完成（${c.completedCount} 个）🎉</p>
        <p class="challenge-desc">新的挑战正在路上。此期间，日常积木就是你的主战场。</p>
      </div>
    `;
  }

  return `
    <div class="challenge-card">
      <div class="challenge-top">
        <span class="challenge-label">🎖 系统挑战 · ${c.completedCount + 1}/${c.total}</span>
        <span class="challenge-reward">+${c.exp} EXP</span>
      </div>
      <p class="challenge-name">${c.name}</p>
      <p class="challenge-desc">${c.desc}</p>
      <button class="btn challenge-btn" data-attribute="${attr.id}"
              data-name="${c.name}" data-exp="${c.exp}">
        ✓ 我完成了这个挑战
      </button>
    </div>
  `;
}

async function completeChallengeFlow(btn) {
  if (btn.disabled) return;
  // 挑战是大事件：确认弹窗，防误触，也给仪式感
  const confirmed = await showChallengeModal({
    name: btn.dataset.name,
    exp: Number(btn.dataset.exp),
  });
  if (!confirmed) return;

  btn.disabled = true;
  try {
    const result = await api.completeChallenge(btn.dataset.attribute);
    applyChallengeResult(result);

    store.set('feedEvent', {
      type: 'challenge',
      challenge: result.challenge,
      attribute: result.attribute,
      exp: result.challenge.exp,
      level: result.attribute.level,
    });

    if (result.levelUps > 0) {
      showLevelUpModal({
        attributeName: result.attribute.name,
        attributeIcon: result.attribute.icon,
        level: result.attribute.level,
      });
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

/** 挑战完成后刷新对应属性卡（含挑战状态→冷却） */
function applyChallengeResult(result) {
  loadPanel(); // 挑战影响挑战卡与时间线，整面板刷新一次（低频操作，可接受）
  toast(`🎖 挑战完成「${result.challenge.name}」 +${result.challenge.exp} EXP！`, 'success', 3600);
}

/* ---------- 日常打卡交互 ---------- */

async function feed(btn) {
  if (isFeeding) return;
  isFeeding = true;
  btn.classList.add('is-loading');

  try {
    const result = await api.feedBlock(btn.dataset.block);
    applyFeedResult(result);

    store.set('feedEvent', {
      type: result.levelUps > 0 ? 'levelUp' : 'feed',
      block: result.block,
      attribute: result.attribute,
      exp: result.block.exp,
      level: result.attribute.level,
    });

    if (result.levelUps > 0) {
      showLevelUpModal({
        attributeName: result.attribute.name,
        attributeIcon: result.attribute.icon,
        level: result.attribute.level,
      });
    } else {
      toast(
        `${result.block.icon} ${result.block.name} +${result.block.exp} EXP → ${result.attribute.name}`,
        'success',
      );
    }
  } catch (err) {
    toast(err.message, 'error');
    if (err.code === 'DAILY_LIMIT_REACHED') {
      store.set('feedEvent', {
        type: 'limitReached',
        block: { name: extractBlockName(err.message) },
        attribute: { name: '' },
      });
    }
  } finally {
    isFeeding = false;
    btn.classList.remove('is-loading');
  }
}

function applyFeedResult(result) {
  const attr = result.attribute;
  const card = document.querySelector(`[data-attribute="${attr.id}"]`);
  if (!card) return;

  const levelEl = card.querySelector('.attribute-level');
  levelEl.textContent = `Lv.${attr.level}`;
  if (result.levelUps > 0) {
    levelEl.classList.add('is-bumped');
    setTimeout(() => levelEl.classList.remove('is-bumped'), 800);
  }

  const bar = card.querySelector('.progress');
  bar.setAttribute('aria-valuemax', attr.expToNext);
  bar.setAttribute('aria-valuenow', attr.exp);
  card.querySelector('.progress-fill').style.width =
    `${progressPercent({ exp: attr.exp, expToNext: attr.expToNext })}%`;
  card.querySelector('.progress-text').textContent =
    `${attr.exp} / ${attr.expToNext} EXP`;

  const blockBtn = card.querySelector(`[data-block="${result.block.id}"]`);
  const remaining = Number(blockBtn.dataset.remaining ?? 0) || 0;
  updateBlockButton(blockBtn, remaining - 1);

  loadTimeline();
}

function updateBlockButton(btn, remaining) {
  btn.dataset.remaining = remaining;
  const meta = btn.querySelector('.block-meta');
  const limitPart = meta.textContent.split('·')[1]?.trim() ?? '';
  if (remaining <= 0) {
    btn.disabled = true;
    meta.textContent = `今日已满 · ${limitPart}`;
  } else {
    meta.textContent = `+${btn.dataset.exp} EXP · 剩余 ${remaining} 次`;
  }
}

function progressPercent(attr) {
  return Math.min(100, Math.round((attr.exp / attr.expToNext) * 100));
}

function extractBlockName(message) {
  const m = message.match(/「(.+?)」/);
  return m ? m[1] : '积木块';
}

/* ---------- 勋章墙与时间线 ---------- */

function renderMedals(medals) {
  const el = document.getElementById('medals');
  if (!medals?.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <div class="medals-strip card">
      <span class="medals-label">🏅 彩蛋勋章</span>
      <div class="medals-row">
        ${medals.map((m) => `
          <span class="medal-chip" title="${m.name} · ${m.earnedAt?.slice(0, 10) ?? ''}">
            ${m.icon} ${m.name}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

async function loadTimeline() {
  try {
    const { panel } = await api.getPanel();
    renderTimeline(panel.timeline);
  } catch { /* 时间线失败不打扰主流程 */ }
}

const TIMELINE_RENDERERS = {
  levelup: (ev) => `${ev.attributeName} 达到 <b>Lv.${ev.level}</b> 🎉`,
  challenge: (ev) => `完成挑战 <b>「${ev.challengeName}」</b>（${ev.attributeName} +${ev.exp} EXP）🎖`,
  medal: (ev) => `获得彩蛋勋章 <b>${ev.medalIcon} ${ev.medalName}</b> ✨`,
  eggExp: (ev) => `一次即兴汇报，换来意外之喜 🎁`,
  decay: (ev) => `<span style="color:#E53E3E">【衰减】${ev.attributeName} 长期未维护，- ${Math.abs(ev.exp)} EXP</span>`,
};

function renderTimeline(events) {
  const el = document.getElementById('timeline');
  if (!events?.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `
    <h3 class="timeline-title">📜 成长档案</h3>
    <ul class="timeline-list">
      ${events.map((ev) => {
        const render = TIMELINE_RENDERERS[ev.type] ?? (() => ev.type);
        return `
          <li class="timeline-item">
            <span class="timeline-dot timeline-dot--${ev.type}"></span>
            <span class="timeline-text">
              <b>${ev.date}</b> · ${render(ev)}
            </span>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}
