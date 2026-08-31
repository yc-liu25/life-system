/**
 * 聊天页：与系统人格「六六」的对话流。
 *
 * 功能：
 * - 历史消息拉取与渲染（含进入时的主动问候）
 * - 发送消息 / 打字机效果的回复呈现
 * - 面板打卡联动：监听全局 feed 事件，六六主动"插话"吐槽或祝贺
 */
import { api } from '../api.js';
import { store } from '../state.js';
import { generateLocalReaction } from './chat-reactions.js';
import { openEggModal } from '../components/egg-modal.js';

let scrollContainer = null;
let isSending = false;

export function renderChat(root) {
  root.innerHTML = `
    <section class="page page-chat">
      <div class="chat-shell card">
        <header class="chat-head">
          <span class="chat-avatar">🌱</span>
          <div class="chat-peer">
            <h3>六六</h3>
            <p class="muted" id="chat-status">观察者模式 · 在线</p>
          </div>
          <button class="chat-clear" id="chat-clear-btn" title="清空对话记录">🧹</button>
        </header>

        <div class="chat-scroll" id="chat-scroll"></div>

        <form class="chat-inputbar" id="chat-form">
          <button type="button" class="chat-egg-btn" id="egg-btn"
                  title="向六六汇报一件清单外的好事（随缘奖励）">🎁</button>
          <input type="text" id="chat-input" class="chat-input"
                 placeholder="跟六六说点什么…（也可以问问今天的进度）"
                 maxlength="500" autocomplete="off" />
          <button type="submit" class="chat-send" id="chat-send-btn">发送</button>
        </form>
      </div>
    </section>
  `;

  scrollContainer = root.querySelector('#chat-scroll');

  bindEvents(root);
  loadHistory();
  subscribeFeedEvents(root);
}

/* ---------- 历史加载 ---------- */

async function loadHistory() {
  try {
    const { history } = await api.getChatHistory();

    if (history.length === 0) {
      // 首次进入：六六主动打招呼
      pushMessage('assistant', '你来了。我刚把今天的面板数据看了三遍——不是担心，是职业习惯。');
    } else {
      history.forEach((m) => pushMessage(m.role, m.content));
    }
  } catch {
    pushMessage('assistant', '（六六似乎连接不稳定，稍后再试试？）');
  }
}

/* ---------- 发送流程 ---------- */

function bindEvents(root) {
  const form = root.querySelector('#chat-form');
  const input = root.querySelector('#chat-input');
  const clearBtn = root.querySelector('#chat-clear-btn');
  const eggBtn = root.querySelector('#egg-btn');

  // 彩蛋通道：汇报 → 结果弹窗 → 若得 EXP，广播事件刷新面板数据
  eggBtn.addEventListener('click', () => {
    openEggModal((result) => {
      if (result.granted && result.kind === 'exp') {
        store.set('eggEvent', result);
      } else if (result.granted) {
        store.set('eggEvent', result);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    isSending = true;
    input.value = '';
    pushMessage('user', text);
    const typing = pushTyping();

    try {
      const { reply } = await api.sendChat(text);
      typing.remove();
      await typeMessage(reply);
    } catch (err) {
      typing.remove();
      pushMessage('assistant', `（信号不好：${err.message}）`);
    } finally {
      isSending = false;
      input.focus();
    }
  });

  clearBtn.addEventListener('click', async () => {
    try {
      await api.clearChat();
      scrollContainer.innerHTML = '';
      pushMessage('assistant', '记忆已清空。我们重新认识一下吧：你好，我是六六。');
    } catch (err) {
      showToastError(err.message);
    }
  });
}

function showToastError(message) {
  // 简单复用 toast 样式类，避免循环依赖 toast 组件
  const el = document.createElement('div');
  el.className = 'toast toast--error is-visible';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ---------- 消息渲染 ---------- */

function pushMessage(role, text) {
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg--${role}`;
  el.innerHTML = `
    ${role === 'assistant' ? '<span class="chat-msg-avatar">🌱</span>' : ''}
    <div class="chat-bubble">${escapeHtml(text)}</div>
  `;
  scrollContainer.appendChild(el);
  scrollToBottom();
  return el;
}

/** "正在输入"占位气泡 */
function pushTyping() {
  const el = pushMessage('assistant', '');
  el.querySelector('.chat-bubble').innerHTML =
    '<span class="typing-dots"><i></i><i></i><i></i></span>';
  return el;
}

/** 打字机效果逐字显示回复 */
async function typeMessage(text) {
  const el = pushMessage('assistant', '');
  const bubble = el.querySelector('.chat-bubble');
  for (const ch of text) {
    bubble.textContent += ch;
    scrollToBottom();
    // 标点处停顿更久，模拟"思考着说"
    await sleep('，。！？…'.includes(ch) ? 90 : 22);
  }
}

function scrollToBottom() {
  scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

/* ---------- 面板打卡联动 ---------- */

/**
 * 订阅全局 feed 事件（面板页打卡时通过 store 广播）。
 * 用户正停留在聊天页时，六六主动弹出吐槽/祝贺气泡。
 */
function subscribeFeedEvents(root) {
  store.subscribe('feedEvent', (event) => {
    if (!event) return;
    const text = generateLocalReaction(event);
    // 稍作延迟，让"六六看到了你的打卡"更自然
    setTimeout(() => {
      const typing = pushTyping();
      setTimeout(async () => {
        typing.remove();
        await typeMessage(text);
        // 发给后端留档（不等待、失败静默——体验优先）
        api.sendChatSystemEvent(event).catch(() => {});
      }, 600);
    }, 800);
  });
}

/* ---------- 工具 ---------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
