# 如果人生有系统

> 灵感来自系统流小说的"金手指"，但我们给不出凭空的奖励——
> 所有升级，都是你真实行为的积累。系统只是让这份积累**可见、有反馈、有陪伴感**。
> 系统人格「六六」：呆呆的、有点社恐、偶尔玩梗的观察者。

设计文档见 `../life_system.md`（v0.4）；完整说明文档见 `docs/GUIDE.md`。

## 技术栈

- **后端**：Node.js + Express（ES Modules）
- **前端**：原生 HTML/CSS/JS（ES Modules，无框架、无构建步骤）
- **存储**：Phase 2 起使用 `server/data/runtime/` 下的 JSON 文件，接口层已与存储解耦，未来可平滑换数据库

## 快速启动

```bash
cd xiaoban
npm install
npm start        # 或 npm run dev（文件变动自动重启）
```

浏览器访问 **http://localhost:3000** ，底部状态条显示"已连接"即跑通。

## 目录结构

```
xiaoban/
├── package.json
├── server/                 # 后端
│   ├── index.js            # 入口：创建应用、挂路由、启动监听
│   ├── logger.js           # 极简日志器
│   ├── config/
│   │   └── index.js        # 全局配置（端口、路径、参数）
│   ├── routes/
│   │   ├── index.js        # API 路由注册中心 + 统一错误处理
│   │   ├── panel.js        # 面板：GET /api/panel、POST /api/panel/feed
│   │   ├── chat.js         # 聊天：历史/发送/清空
│   │   └── egg.js          # 彩蛋：POST /api/egg/report
│   ├── services/           # 业务逻辑层
│   │   ├── progress-service.js   # 面板组装 + 打卡喂养
│   │   ├── progression.js        # EXP↔等级纯计算（成长曲线）
│   │   ├── chat-service.js       # 对话编排（LLM/模板双模式）
│   │   ├── easter-egg-service.js # 彩蛋判定（稀缺/保底/勋章）
│   │   ├── storage.js            # JSON 持久化（唯一 IO 层）
│   │   └── api-error.js          # 业务错误类型
│   ├── ai/                 # AI 人格
│   │   ├── persona.js      # 人格提示词与风格范例
│   │   ├── client.js       # 大模型客户端（Anthropic/OpenAI 双格式）
│   │   └── reply-engine.js # 本地模板引擎（无 Key 时的降级）
│   └── data/
│       ├── seed/attributes.js  # 属性/积木块世界设定（版本受控）
│       └── runtime/state.json  # 运行时存档（可删除重置）
└── public/                 # 前端
    ├── index.html
    ├── css/                # base / layout / components / chat
    └── js/
        ├── main.js         # 入口
        ├── api.js          # 后端请求统一封装
        ├── state.js        # 发布-订阅 store（跨页事件广播）
        ├── router.js       # 前端路由
        ├── pages/          # panel.js（面板）/ chat.js（聊天）/ chat-reactions.js
        └── components/     # toast / levelup-modal / egg-modal
```

## 功能总览（v0.4）

- **积木式 EXP**：属性由多个行为积木喂养，每日限额防刷分，EXP 满自动升级进位
- **聊天室**：小伴人格（观察者+轻度社恐+偶尔玩梗），打卡后主动吐槽/祝贺，问进度回复真实数据
- **彩蛋通道**：🎁 汇报清单外好事 → 随缘获得 EXP/稀有勋章（每日2次上限+10分钟冷却+失败保底）
- **成长轨迹**：升级/勋章/彩蛋事件自动记入"成长足迹"时间线，勋章墙上墙
- **双模式 AI**：设 `AI_API_KEY` 环境变量即接真实大模型；不设则本地模板，体验完整

## 迭代路线（与设计文档对应）

| Phase | 内容 | 状态 |
|---|---|---|
| 1 | 项目骨架 + 基础服务跑通 | ✅ |
| 2 | 积木式 EXP：属性/积木定义、打卡、升级、进度环 | ✅ |
| 3 | AI 人格聊天室 + 打卡联动 | ✅ |
| 4 | 彩蛋通道 + 成长轨迹 + 勋章墙 | ✅ |

## 设计原则

1. **复杂度隐藏**：无论后台多复杂，用户只面对等级、进度环、打卡按钮。
2. **模块化**：新增功能 = 新增模块文件 + 注册一行，不动已有代码。
3. **存储可替换**：业务代码只依赖 services 接口，不直接碰存储细节。
