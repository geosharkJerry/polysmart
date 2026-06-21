# Polysmart Logto + Turnstile 生产接入说明

## 目标

本文件用于完成 Polysmart 会员注册 / 登录系统的最终生产接入。当前代码、路由、页面和 Worker 部署已经就位，剩余工作仅为：

1. 在 Logto 中创建并配置生产应用
2. 在 Cloudflare Turnstile 中创建生产站点
3. 将对应的 vars / secrets 写入 Cloudflare Worker `polysmart`
4. 完成一次真实生产回调验证

## 当前生产域名

- `https://www.polysmart.io`
- `https://polysmart.io`

## 当前生产认证入口

- 会员注册：`https://www.polysmart.io/register`
- 会员登录：`https://www.polysmart.io/login`
- 管理员登录：`https://www.polysmart.io/admin/login`

## 当前生产回调地址

这些地址已经在代码中固定，需要在 Logto 应用配置中允许：

- Member callback: `https://www.polysmart.io/api/logto/member/callback`
- Admin callback: `https://www.polysmart.io/api/logto/admin/callback`

当前登录后跳转地址：

- Member post sign-in redirect: `https://www.polysmart.io/console`
- Admin post sign-in redirect: `https://www.polysmart.io/admin`

## Cloudflare 变量与 Secret 名称

### Vars

这些值在 `wrangler.jsonc` 中声明，应通过 Cloudflare Worker vars 提供：

- `APP_BASE_URL`
- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `TURNSTILE_SITE_KEY`

### Secrets

这些值应通过 Cloudflare secrets 提供：

- `LOGTO_APP_SECRET`
- `LOGTO_COOKIE_SECRET`
- `TURNSTILE_SECRET_KEY`

## Logto 配置要求

建议在 Logto 中创建一个 production Web application，并至少完成以下配置：

### Redirect URIs

- `https://www.polysmart.io/api/logto/member/callback`
- `https://www.polysmart.io/api/logto/admin/callback`

### Post logout redirect URIs

- `https://www.polysmart.io/`

### CORS / allowed origins

- `https://www.polysmart.io`
- `https://polysmart.io`

### 推荐要求

- 开启 email scope / profile scope
- 使用 production tenant，不要继续使用测试 tenant
- 管理员登录使用同一个 Logto tenant，但后续由 Polysmart 本地管理员守卫限制为 `infor@polysmart.io`

## Turnstile 配置要求

建议在 Cloudflare Turnstile 中创建 production site，域名至少包含：

- `www.polysmart.io`
- `polysmart.io`

产出两个值：

- Site key -> `TURNSTILE_SITE_KEY`
- Secret key -> `TURNSTILE_SECRET_KEY`

## Cloudflare 写入命令

以下命令在项目根目录 `/Users/mac/Documents/Polysmart` 执行。

## 重要保护：避免部署时覆盖线上认证 Vars

当前项目已经在 [wrangler.jsonc](/Users/mac/Documents/Polysmart/wrangler.jsonc) 中启用了：

- `keep_vars: true`

并且已移除本地配置文件中会把线上认证配置覆盖为空值的这些键：

- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `TURNSTILE_SITE_KEY`

这意味着：

1. 真实生产值应直接保存在 Cloudflare Worker 的 runtime vars / secrets 中
2. 后续执行 `npx wrangler deploy` 时，不会再被本地空值反向覆盖
3. 如果需要变更这些 public vars，请优先在 Cloudflare Dashboard 或对应环境变量注入流程中更新

### 写入 vars

`wrangler.jsonc` 中当前需要回填：

- `APP_BASE_URL=https://www.polysmart.io`
- `LOGTO_ENDPOINT=<真实值>`
- `LOGTO_APP_ID=<真实值>`
- `TURNSTILE_SITE_KEY=<真实值>`

### 写入 secrets

```bash
cd /Users/mac/Documents/Polysmart

echo '<LOGTO_APP_SECRET>' | npx wrangler secret put LOGTO_APP_SECRET
echo '<LOGTO_COOKIE_SECRET>' | npx wrangler secret put LOGTO_COOKIE_SECRET
echo '<TURNSTILE_SECRET_KEY>' | npx wrangler secret put TURNSTILE_SECRET_KEY
```

## 部署前预检

项目内已经补充了一个认证生产预检脚本：

```bash
cd /Users/mac/Documents/Polysmart
LOGTO_ENDPOINT='<真实值>' \
LOGTO_APP_ID='<真实值>' \
LOGTO_APP_SECRET='<真实值>' \
LOGTO_COOKIE_SECRET='<真实值>' \
TURNSTILE_SITE_KEY='<真实值>' \
TURNSTILE_SECRET_KEY='<真实值>' \
npm run check:auth-production
```

预期输出：

- `[polysmart] Auth production config check passed.`

如果脚本失败，说明当前值仍缺失或看起来像占位符，不应继续部署。

## 部署命令

```bash
cd /Users/mac/Documents/Polysmart
npx wrangler deploy
```

## 生产验证顺序

### 1. 检查配置状态

```bash
curl -sS https://www.polysmart.io/api/auth/config-status
```

预期：

- `logto.configured = true`
- `turnstile.configured = true`

### 2. 验证会员注册入口

打开：

- `https://www.polysmart.io/register`

检查：

- 页面显示 `Continue with Logto`
- 页面出现真实 Turnstile 小组件，不再是 loading placeholder
- 首次页面不出现 `Full Name` / `Country` / `Address` / `Password`

### 3. 验证会员注册回调

流程：

1. 访问 `/register`
2. 完成 Turnstile
3. 进入 Logto sign-up
4. 完成注册并回调
5. 自动进入 `/console`

预期：

- 浏览器获得会员登录态
- `/console` 要求补全资料
- 补全项在控制台中，而不是注册页中

### 4. 验证会员登录

流程：

1. 访问 `/login`
2. 完成 Turnstile
3. 跳转到 Logto sign-in
4. 回调到 `/console`

### 5. 验证管理员登录

流程：

1. 访问 `/admin/login`
2. 完成 Turnstile
3. 登录 Logto
4. 回调到 `/admin`

预期：

- 非管理员身份应被拒绝
- 仅 `infor@polysmart.io` 对应的 super admin 可进入后台

## 现阶段已知状态

截至当前版本，以下事项已经完成：

- `Logto + Turnstile` 页面和接口已上线
- 初始注册字段已从前台入口剔除
- 资料补全已移动到 `/console`
- 旧验证码接口已下线
- 最新 Worker 已部署到 Cloudflare

当前唯一阻塞是生产认证配置缺失。可以通过以下接口直接查看：

- `https://www.polysmart.io/api/auth/config-status`
