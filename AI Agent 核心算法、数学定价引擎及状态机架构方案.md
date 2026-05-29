单纯的“看见价差再吃单（Taker）”相比，双向挂单（Maker）能够吃满双侧的流动性价差（Spread），但核心挑战在于**异步撮合风险（Execution Asymmetry）**——即一端成交了，另一端却挂单未成交，导致无风险套利瞬间变成单边裸头寸风险。

以下是为您设计的跨平台双向挂单 AI Agent 核心算法、数学定价引擎及状态机架构方案：

## 一、 跨平台双向挂单的套利原理

在预测市场中，我们通过同时买入“互补合同”来锁定无风险利润。

假设某一事件（如：美联储6月是否加息），在两端市场的标的转化为标准的 $0.00 \sim 1.00$ 价格区间（Kalshi 的美分单位需除以 100 归一化）。

Agent 不直接挂单同一方向，而是交叉挂单：

- **组合 A（锁仓路径 1）：** 在 Polymarket 挂单买入 **YES** ($p_{\text{bid}}^P$)，同时在 Kalshi 挂单买入 **NO** ($p_{\text{bid}}^K$)。
    
- **组合 B（锁仓路径 2）：** 在 Polymarket 挂单买入 **NO** ($q_{\text{bid}}^P$)，同时在 Kalshi 挂单买入 **YES** ($q_{\text{bid}}^K$)。
    

当组合 A 的双端均成交时，总成本为 $p_{\text{bid}}^P + p_{\text{bid}}^K$。若其小于 $1 - \text{Frictions}$，则无论结果如何，到期结算必定获得 $1.00$，从而锁定无风险利润。

## 二、 核心定价引擎：引入库存衰减的微观结构模型

为了防止由于异步填充导致的单边敞口，Agent 的挂单价格不能是固定的，必须基于全局合成中间价（Synthetic Mid-Price）**和**当前库存净敞口（Net Inventory Exposure）进行动态微调。

### 1. 全局合成中间价计算

首先，计算两端订单簿（Order Book）的流动性加权中间价：

$$M_t = w \cdot Mid_{\text{poly}} + (1-w) \cdot Mid_{\text{kalshi}}$$

其中 $w$ 是基于两端顶单量（Depth）和更新频次（Heartbeat）计算的权重矩阵系数。

### 2. 引入库存惩罚的基准报价（Reservation Price）

令 Agent 的事件净敞口（Net Exposure）为 $I$：

$$I = (\text{Pos}_{\text{poly}}^Y - \text{Pos}_{\text{poly}}^N) - (\text{Pos}_{\text{kalshi}}^Y - \text{Pos}_{\text{kalshi}}^N)$$

当 $I > 0$ 时，说明 Agent 整体持有多头（赌事件发生）；当 $I < 0$ 时，持有空头。为了让风险中性，我们需要利用自适应多变量定价公式来计算 Agent 的**合意修正价 $R(I)$**：

$$R(I) = M_t - I \cdot \gamma \cdot \sigma^2 (T - t)$$

- $\gamma$：风险厌恶因子（Risk Aversion Coeff）。
    
- $\sigma^2$：该预测合同的瞬时波动率。
    
- $T - t$：距离事件结算的归一化剩余时间。
    

### 3. 双端挂单目标价（Target Quoting Prices）

结合预设的最小套利安全边际 $\alpha$ 和两端交易摩擦成本 $F$，Agent 在两端挂出的 **Bid 价格** 计算公式为：

$$\text{Polymarket 挂单 (YES):} \quad p_{\text{bid}}^P = R(I) - \frac{\alpha + F}{2}$$

$$\text{Kalshi 挂单 (NO):} \quad p_{\text{bid}}^K = (1 - R(I)) - \frac{\alpha + F}{2}$$

> **模型逻辑：** 当 Agent 的 Polymarket YES 被意外成交导致 $I$ 激增时，$R(I)$ 会迅速下降。这将导致下一次循环中，Polymarket 的 YES 挂单价被迫变低（极难再成交），而 Kalshi 的 NO 挂单价被迫变高（极易成交），算法通过这种价格倾斜（Skewing）自动靠 Maker 侧完成对冲。

## 三、 异步撮合状态机与对冲算法（Execution State Machine）

既然是同时挂 Bid 盘，就必须有一套严格的高频状态机来应对“单边成交（Partial Fill / Leg-In Risk）”。

```
                    ┌──────────────────┐
                    │  两端同时挂 Bid 盘 │
                    └─────────┬────────┘
                              │
                    ┌─────────▼────────┐
                    │ 触发任何一端成交? │
                    └─────────┬────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼ (YES)                       ▼ (NO)
      ┌─────────────────┐           ┌──────────────────┐
      │  A端 Full Fill  │           │   维持双端监听循环 │
      └────────┬────────┘           └──────────────────┘
               │
      ┌────────▼────────┐
      │  开启 B端对冲计时 │
      └────────┬────────┘
               │
      ┌────────┴─────────────────────────────────┐
      ▼ 状态 1：在 $T_{\text{wait}}$ 内            ▼ 状态 2：超时未成交
┌──────────────────────────────────────┐   ┌───────────────────────────────────┐
│ B端 Maker 挂单自动成交                │   │ B端 Maker 单撤单                    │
│ ──► [完全锁仓] 成功锁定无风险空间套利  │   │ ──► 改为 Taker 市价单强行吃掉差价   │
└──────────────────────────────────────┘   │ ──► [强制锁仓] 确保无敞口风险      │
                                           └───────────────────────────────────┘
```

### 状态机核心控制逻辑：

1. **挂单单流控制（Quoting Loop）：** Agent 每隔 $\Delta t$ 毫秒（或由 Websocket Orderbook 变更事件驱动）计算一次最新的 $p_{\text{bid}}^P$ 和 $p_{\text{bid}}^K$，并发送 `Edit Order` 请求。
    
2. **强制对冲时限（Hedge Expiry Timeout）：** 设定一个严格的阈值 $T_{\text{wait}}$（通常为 500ms - 2000ms）。
    
3. **主动越界止损（Cross-Spread Hedging）：** 如果超时后另一端仍未成交，说明市场价格正在发生急剧阶跃（Jump-Diffusion）。Agent 必须立即将未成交端的 **Maker 挂单撤销**，并转化为 **Taker 单（市价单）** 直接砸向对方的订单簿，即使此时 $\alpha$ 利润缩水甚至微亏，也必须保证 $I$ 回归到安全界限。
    

## 四、 核心策略伪代码架构 (Python Asyncio)

由于涉及 Web2（Rest/WS）与 Web3（Clob API）的并发交互，代码必须采用基于事件驱动的异步协程架构。

Python

```
import asyncio
import time

class SpatialArbitrageAgent:
    def __init__(self):
        self.inventory = 0  # 净敞口 I
        self.alpha = 0.01   # 预设净利润率 1%
        self.frictions = 0.005 # 预估综合摩擦成本
        self.t_wait = 1.5    # 强平等待上限 1.5秒
        self.active_orders = {"poly": None, "kalshi": None}

    async def update_pricing_engine(self):
        """核心定价引擎循环"""
        while True:
            # 1. 获取两端实时订单簿数据
            poly_book = await getattr(self, "get_poly_book")()
            kalshi_book = await getattr(self, "get_kalshi_book")()
            
            # 2. 计算合成中间价 M_t
            mid_price = (poly_book['mid'] + kalshi_book['mid']) / 2
            
            # 3. 计算结合库存惩罚的修正价 R(I)
            gamma, sigma_sq, time_to_expiry = 0.1, 0.2, 0.95
            reservation_price = mid_price - (self.inventory * gamma * sigma_sq * time_to_expiry)
            
            # 4. 计算目标挂单价
            total_cost_bracket = self.alpha + self.frictions
            target_poly_bid = reservation_price - (total_cost_bracket / 2)
            target_kalshi_bid = (1.0 - reservation_price) - (total_cost_bracket / 2)
            
            # 5. 异步发送批量更新订单指令 (Maker 挂单)
            await asyncio.gather(
                self.update_order("poly", "YES", target_poly_bid),
                self.update_order("kalshi", "NO", target_kalshi_bid)
            )
            await asyncio.sleep(0.1) # 100ms 刷新率

    async def on_order_fill(self, platform, side, amount, price):
        """任意一端成交后的回调事件 (状态机核心)"""
        print(f"检测到成交通知: {platform} 填单 {side} 于 价格 {price}")
        
        # 更新本地名义库存
        if platform == "poly":
            self.inventory += amount
            target_hedge_platform = "kalshi"
            hedge_contract = "NO"
        else:
            self.inventory -= amount
            target_hedge_platform = "poly"
            hedge_contract = "YES"
            
        # 等待对侧 Maker 自动撮合
        start_time = time.time()
        while time.time() - start_time < self.t_wait:
            if self.check_order_status(target_hedge_platform):
                print("【完美对冲】对侧 Maker 单顺利成交，空间套利利润锁死。")
                return
            await asyncio.sleep(0.05)
            
        # 超时未成交，执行主动强平
        print("【对冲超时触发】对侧未能在规定时间内成交，启动 Taker 强制对冲...")
        await self.cancel_order(target_hedge_platform)
        await self.execute_taker_order(target_hedge_platform, hedge_contract, amount)
        print("【强制锁仓】对冲单已通过 Taker 强制执行，风险归零。")

    async def run(self):
        await asyncio.gather(
            self.update_pricing_engine(),
            self.listen_websockets()
        )
```

## 五、 生产环境部署的极端风控防线

在 Polymarket 与 Kalshi 实际运行此类双向挂单 Agent 时，硬件和机制层面的风控由于跨网关原因至关重要：

1. **节点与网络时延优化（Colocation）：**
    
    - Kalshi 的服务器主要在美东（AWS ashburn 或纽约金融数据中心）。
        
    - Polymarket 的 CLOB 撮合引擎虽然在链下，但其主要的 API 节点也位于 AWS 环境中。
        
    - **部署策略：** 必须将 Agent 的 EC2 实例部署在与两个平台 API 物理时延最低的 AWS 区域（通常为 `us-east-1`），将两端的网络 Ping 值控制在 15ms 以内。
        
2. **Web2 账户的 Rate Limit 保护：**
    
    - Kalshi 拥有严格的 API 调用频率限制（Rate Limit）。频繁的 `Edit Order` 会导致触发 `HTTP 429` 拒绝服务。
        
    - **设计防线：** 定价引擎应设置**最小价格变动阈值（Min Price Move Threshold）**。只有当计算出的新目标挂单价与旧挂单价差异超过 $0.005$（即半美分）时，才真正发起 API 修改请求，杜绝无效的高频无用调用。
        
3. **单边极端仓位上限（Hard Inventory Ceiling）：**
    
    - 设置绝对风控水位锁。若因两端极端行情剧烈跳跃导致 `self.inventory` 超过最大承受上限（例如累计单边偏离达 5000 刀），Agent 必须**触发熔断机制**，暂停所有交易线段，向你的终端发出报警，等待资金划转和人工清算审查。