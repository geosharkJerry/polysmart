# Polysmart Logto & Turnstile 后续生产配置指南

## 一、替换 TURNSTILE_SECRET_KEY 为真实值

当前 `TURNSTILE_SECRET_KEY` 使用的是与 `TURNSTILE_SITE_KEY` 相同的值（占位符）。
需要替换为 Turnstile 后台的真实 Secret Key。

### 方式 A：Cloudflare Dashboard（推荐）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → **polysmart** → Settings → **Variables**
3. **Secrets** 区域 → 点 **Add secret**
4. Name: `TURNSTILE_SECRET_KEY`
5. Value: 在 Turnstile 后台复制 Secret Key
6. 保存并部署

### 方式 B：Wrangler CLI

```bash
cd /Users/mac/Documents/Polysmart
echo '<真实 TURNSTILE_SECRET_KEY>' | npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler deploy
```

---

## 二、Logto 生产配置（当你有 Logto 实例时）

### 前置条件

需要一个 Logto Cloud 实例或自托管 Logto。
没有的话可以免费创建：https://cloud.logto.io

### 在 Logto 中创建应用

1. 登录 Logto Console
2. 创建 **Web Application**（传统 web 应用）
3. 填写以下配置：

**Redirect URIs**
- `https://www.polysmart.io/api/logto/member/callback`
- `https://www.polysmart.io/api/logto/admin/callback`

**Post sign-out redirect URIs**
- `https://www.polysmart.io/`

**CORS allowed origins**
- `https://www.polysmart.io`
- `https://polysmart.io`

### 写入 Cloudflare Vars（公开变量）

在 Cloudflare Dashboard → Workers & Pages → polysmart → Settings → Variables → **Environment Variables** 区域：

| Variable Name | Value |
|---|---|
| `LOGTO_ENDPOINT` | `https://你的实例.logto.app` |
| `LOGTO_APP_ID` | 从 Logto 应用详情页复制 |

### 写入 Cloudflare Secrets（机密变量）

在 Cloudflare Dashboard Variables → **Secrets** 区域：

| Secret Name | Value |
|---|---|
| `LOGTO_APP_SECRET` | 从 Logto 应用详情页复制 |
| `LOGTO_COOKIE_SECRET` | 一个随机长字符串（`openssl rand -hex 32` 生成） |

### 重新部署

```bash
cd /Users/mac/Documents/Polysmart
npx wrangler deploy
```

### 生产验证

访问 https://www.polysmart.io/api/auth/config-status

预期响应：
```json
{
  "logto": { "configured": true, "missing": [] },
  "turnstile": { "configured": true, "missing": [] }
}
```

然后验证：
- https://www.polysmart.io/register → 显示 "Continue with Logto"
- https://www.polysmart.io/login → 显示 "Continue with Logto"
- Logto 注册/登录回调到 /console
- /admin/login 仅 infor@polysmart.io 可进

---

## 三、验证当前状态

当前生产环境（执行以下命令验证）：

```bash
curl -sS https://www.polysmart.io/api/auth/config-status
docEOF