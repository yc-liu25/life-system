/**
 * 业务错误：携带 HTTP 状态码，路由层统一捕获转成 JSON 响应。
 */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
