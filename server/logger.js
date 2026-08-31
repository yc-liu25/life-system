/**
 * 极简日志器：带时间戳与模块前缀，避免各处散落 console.log。
 */
function timestamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

export function createLogger(module) {
  const prefix = `[${timestamp()}] [${module}]`;
  return {
    info: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  };
}
