/**
 * 全局状态：一个极简的发布-订阅 store，避免引入框架。
 * 用法：
 *   store.set('user', {...});        // 写入并通知
 *   store.get('user');               // 读取
 *   store.subscribe('user', fn);     // 订阅变化
 */
const state = new Map();
const listeners = new Map();

export const store = {
  get(key) {
    return state.get(key);
  },

  set(key, value) {
    state.set(key, value);
    (listeners.get(key) || []).forEach((fn) => fn(value));
  },

  subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, []);
    listeners.get(key).push(fn);
    // 立即用当前值回调一次，省去"先订阅后取值"的样板代码
    if (state.has(key)) fn(state.get(key));
    // 返回退订函数
    return () => {
      const arr = listeners.get(key) || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  },
};
