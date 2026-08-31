/**
 * 全局配置：所有可调参数集中在这里，其他模块只从这里读取。
 * 后续若加入环境变量 / .env，也只需要改这个文件。
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 项目根目录（xiaoban/） */
export const ROOT_DIR = path.resolve(__dirname, '../..');

export const config = {
  /** 展示用应用名 */
  appName: '如果人生有系统',

  /** 服务端口，可通过环境变量 PORT 覆盖 */
  port: Number(process.env.PORT) || 3000,

  /** 前端静态资源目录（public/） */
  publicDir: path.resolve(ROOT_DIR, 'public'),

  /** 数据目录根（server/data/） */
  dataDir: path.resolve(ROOT_DIR, 'server/data'),

  /** 种子数据目录：属性与积木块的初始定义（版本受控） */
  seedDir: path.resolve(ROOT_DIR, 'server/data/seed'),

  /**
   * 运行时数据目录：打卡记录、EXP、用户数据等由服务写入。
   * Phase 1 尚未启用；Phase 2 起使用，未来整体替换为真实数据库时，
   * 只需要把"读写这个目录"的服务层换成数据库驱动即可，路由层不动。
   */
  runtimeDir: path.resolve(ROOT_DIR, 'server/data/runtime'),
};
