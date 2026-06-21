# Onyx 与 Polysmart 集成架构方案

Date: 2026-06-19

## 一、Onyx 的定位

Onyx（onyx-dot-app/onyx）是一个**完整的开源 AI 平台**，不是一个前端 UI 组件库：
- 语言：Python 后端 + TypeScript Web 前端
- 核心能力：Agentic RAG、Deep Research、自定义 Agent、MCP 集成、代码执行沙箱
- 部署方式：Docker Compose 独立部署（PostgreSQL + 向量数据库 + Web 服务）
- 官网：[onyx.app](https://onyx.app) | GitHub：[onyx-dot-app/onyx](https://github.com/onyx-dot-app/onyx)

这意味着 Onyx **不能以 npm 包的方式替换 Polysmart 的现有前端**。Polysmart 已经完成纯 Tailwind CSS 迁移（无 Chakra UI），更适合的集成方式是 **并行部署 + 协议桥接**。

---

## 二、集成架构图

```
┌──────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                        │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐ │
│  │   Polysmart (Next.js)       │  │   Onyx (Docker Host)    │ │
│  │                             │  │                         │ │
│  │  ┌───────────────────────┐  │  │  ┌───────────────────┐  │ │
│  │  │ Polysmart UI (Tailwind)│  │  │  │ Onyx Web Frontend │  │ │
│  │  │   - Admin Console      │  │  │  └────────┬──────────┘  │ │
│  │  │   - Member Console     │  │  │           │             │ │
│  │  │   - Workspace          │  │  │  ┌────────▼──────────┐  │ │
│  │  └───────────┬───────────┘  │  │  │ Onyx Python API   │  │ │
│  │              │              │  │  │   - RAG Engine     │  │ │
│  │  ┌───────────▼───────────┐  │  │  │   - Deep Research  │  │ │
│  │  │ Polysmart API Routes  │  │  │  │   - Custom Agents  │  │ │
│  │  │   - Onyx Bridge Layer │──┼──┼──│   - Code Sandbox   │  │ │
│  │  │   - AI Route Service  │  │  │  └───────────────────┘  │ │
│  │  │   - Strategy Engine   │  │  │                         │ │
│  │  └───────────────────────┘  │  │  ┌───────────────────┐  │ │
│  │                             │  │  │ Persistent Store  │  │ │
│  └─────────────────────────────┘  │  │   - PostgreSQL    │  │ │
│                                    │  │   - Vector DB     │  │ │
│                                    │  └───────────────────┘  │ │
└──────────────────────────────────────────────────────────────┘
```

---

## 三、集成方式（三层渐进模式）

### 层 1：链接集成（最低耦合，最快）

Polysmart 前端通过链接/iframe 嵌入 Onyx 的特定页面或聊天界面。

**已就绪的槽位：**
- `AdminCommandCenter` → "Grafana / LangGraph / AionUi" 面板 → 可改为 "Onyx AI" 
- `ConsoleCommandCenter` → "Oracle assistant lane" → 可嵌入 Onyx 聊天 widget
- Workspace 页面 → "Assistant Briefing" Onyx-style 面板

**示例实现：**
```tsx
// components/admin/modern/OnyxEmbedPanel.tsx
export function OnyxEmbedPanel() {
  const onyxUrl = process.env.NEXT_PUBLIC_ONYX_URL?.trim() || "";
  if (!onyxUrl) {
    return <PlaceholderPanel message="Set NEXT_PUBLIC_ONYX_URL to embed Onyx AI chat" />;
  }
  return (
    <div className="overflow-hidden rounded-[24px] border">
      <iframe src={`${onyxUrl}/chat`} title="Onyx AI" className="h-[460px] w-full" />
    </div>
  );
}
```

### 层 2：API 桥接（中等耦合，可编程）

Polysmart 通过内部 API Route 代理 Onyx 的推理请求，使操作员流程中直接调用 Onyx 能力。

**桥接接口设计：**
```
POST /api/ai/onyx/query
  → 转发到 Onyx API（RAG 查询 / Agent 调用）
  → 将结构化的响应注入 Polysmart 的策略逻辑

POST /api/ai/onyx/research
  → 启动深度研究任务
  → 异步回调写入 Polysmart 的操作证据表

POST /api/ai/onyx/classify
  → 使用 Onyx 的 Agentic RAG 分析市场事件
  → 结果注入 AI 路由评分

GET  /api/ai/onyx/status
  → 返回 Onyx 连接状态和可用的 Agent 列表
```

**现有代码起点：**
```
lib/services/oracle/           → 当前 Oracle Agent（LangGraph）
lib/services/ai-router.ts      → AI 路由选择（mock → live → onyx）
app/api/ai/route/route.ts      → AI 路由 API 端点
```

只需在 `lib/services/ai-router.ts` 中添加一个 `"onyx"` 模式的 provider 路由即可。

### 层 3：MCP 协议集成（最灵活）

Onyx 原生支持 MCP（Model Context Protocol）。Polysmart 可以在 Onyx 中注册为自己的 MCP server，让 Onyx Agent 直接读取/写入 Polysmart 的业务数据。

**注册为 MCP Server 的方式：**
```
onyx-config.json:
{
  "mcp_servers": [
    {
      "name": "polysmart-ops",
      "url": "https://polysmart.io/api/mcp",
      "tools": [
        "get-execution-intent",
        "list-venue-accounts",
        "run-risk-check",
        "get-market-events"
      ]
    }
  ]
}
```

Polysmart 端只需在 `app/api/mcp/` 下实现一个标准 MCP 端点。

---

## 四、推荐路线图

| 阶段 | 集成层 | 工作量 | 价值 |
|------|--------|--------|------|
| Phase 1 | 链接/iframe 嵌入 | 1 天 | 高——立即可体验 |
| Phase 2 | API 桥接（query + classify） | 3 天 | 高——自动化流程 |
| Phase 3 | MCP 协议集成 | 5 天 | 高——Agent 自主操作 |
| Phase 4 | 深度定制（自定义 Agent 模版） | 按需 | 视业务需求 |

### Phase 1 实现步骤
1. 创建 `NEXT_PUBLIC_ONYX_URL` 环境变量
2. 创建 `OnyxEmbedPanel.tsx` 组件（iframe wrapper）
3. 替换 `AdminCommandCenter` 中的 "AionUi / Onyx Interaction" 面板
4. 替换 `ConsoleCommandCenter` 中的 "Oracle assistant lane"
5. 在 `AdminSectionNav` 中添加 Onyx 入口

---

## 五、前提条件

Onyx 需要在独立服务器（或 Cloudflare 外的容器集群）上运行，因为 Cloudflare Workers 不支持 Docker/PostgreSQL：

- 部署 Onyx：`curl -fsSL https://onyx.app/install_onyx.sh | bash`
- 配置域名和 HTTPS
- 在 Polysmart 环境变量中设置 `NEXT_PUBLIC_ONYX_URL`
- 如果启用 API 桥接，还需要 `ONYX_API_KEY` 环境变量

---

## 六、环境变量

```env
# .env.local
NEXT_PUBLIC_ONYX_URL=https://onyx.example.com    # 前端嵌入用
ONYX_API_KEY=sk-...                               # API 桥接用（仅后端）
ONYX_API_BASE_URL=http://onyx-internal:8080       # 内部 API 地址
```
