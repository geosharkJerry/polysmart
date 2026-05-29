在 Polymarket（Web3）与 Kalshi / PredictIt（Web2）之间进行跨平台空间套利（Spatial Arbitrage）或统计套利，AI Agent 的核心任务是**在“不同结算通道、不同用户群体”造成的瞬时定价差（Information Diffusion Gap）中寻找正期望值，并精确计算跨网关的摩擦成本**。

因为预测市场的标的最终结算非黑即白（0 或 1），它们本质上是**有限到期时间的二元期权（Binary Options）**。要实现永续套利，AI Agent 的算法架构需要建立在以下四大核心数学模型与理论基础之上：

## 一、 核心数学模型与理论基础

### 1. 考虑多维摩擦的静态无套利边界模型（无风险空间套利）

这是 Agent 最基础的“滤波”模型。假设某一事件在 Polymarket 的 YES 价格为 $P_{\text{poly}}(Y)$，在 Kalshi 的 NO 价格为 $P_{\text{kalshi}}(N)$。在理想状态下，二者相加应等于 $1$。

在实际交易中，Agent 必须引入摩擦矩阵（Friction Matrix）来修正无套利条件：

$$\Delta = 1 - \left[ P_{\text{poly}}(Y) \cdot (1 + f_{\text{poly\_swap}}) + P_{\text{kalshi}}(N) \cdot (1 + f_{\text{kalshi\_fee}}) \right] - C_{\text{opportunity}} - C_{\text{gas}}$$

- **$f_{\text{poly\_swap}}$**：Polymarket（CLOB）的吃单滑点与流动性池手续费。
    
- **$f_{\text{kalshi\_fee}}$**：Kalshi 的交易费及出金摩擦（注：PredictIt 还包含 $10\%$ 的利润提成费和 $5\%$ 的提现费，摩擦极高）。
    
- **$C_{\text{opportunity}}$**：资金锁定机会成本。Web2（ACH/FedNow）与 Web3（Polygon 链上 USDC）之间无法实时跨盘划转，两端资金池相互独立。
    

**Agent 执行策略：** 只有当计算出的价差 $\Delta > \alpha$（$\alpha$ 为设定的硬性利润阈值）时，Agent 才会触发双向市价单（Market Order）对冲锁仓。

### 2. 标的价差的奥恩斯坦-乌伦贝克过程（Ornstein-Uhlenbeck Process）

当两端订单簿较薄、无法直接用市价单吃掉价差时，Agent 需要转为**统计套利（Pairs Trading）**。我们假设两个平台对同一事件的定价差 $X_t = P_{\text{poly}, t} - P_{\text{kalshi}, t}$ 满足均值回归特性，可用 OU 过程建模：

$$dX_t = \theta (\mu - X_t) dt + \sigma(p) dW_t$$

- **$\theta$**：均值回归速度（代表市场纠错效率）。
    
- **$\mu$**：长期均值项（通常不为 0，因为 Web2 和 Web3 用户群体的政治/经济立场存在结构性偏差）。
    
- **$dW_t$**：标准布朗运动。
    

> **预测市场特有修正：** 这里的波动率 $\sigma(p)$ 不是常数，而是与合同当前价格 $p$ 相关的函数。由于二元合同的特性，当价格接近 $0.5$ 时波动率最大，接近 $0$ 或 $1$ 时波动率收敛于 $0$。其演化通常满足： $\sigma(p) = \sigma_0 \sqrt{p(1-p)}$。

**Agent 执行策略：** Agent 线程利用卡尔曼滤波（Kalman Filter）在线实时更新 $\theta$ 和 $\mu$。当价差 $X_t$ 偏离 $\mu$ 超过 $k$ 倍标准差时挂限价单（Limit Order）入场，等待均值回归时平仓。

### 3. 微观结构下的自适应高频做市模型（Adapted Avellaneda-Stoikov）

为了最大化利润，Agent 往往扮演做市商，在 Polymarket 和 Kalshi 同时挂 Bid/Ask 盘。这就需要参考传统高频交易的 **Avellaneda-Stoikov 模型**，并针对预测市场的“有限到期时间 $T$”进行修正。

Agent 的最优合意价差（Optimal Spread） $\delta^+ + \delta^-$ 计算公式为：

$$\delta^+ + \delta^- = \gamma \sigma^2 (T - t) + \frac{2}{\gamma} \ln \left( 1 + \frac{\gamma}{\kappa} \right)$$

- **$\gamma$**：Agent 的风险厌恶系数（取决于当前两端库存的平衡度）。
    
- **$T - t$**：距离事件截止结算的剩余时间。随着截止日临近，时间价值加速流逝。
    
- **$\kappa$**：订单簿的流动性密度强度。
    

**Agent 执行策略：** 当 Agent 在 Polymarket 被吃单（例如持有了过多的 YES），它会根据该模型迅速调整 Kalshi 端的报价（降低 NO 的卖价或提高 NO 的买价），利用订单簿不平衡度（Order Book Imbalance, OBI）引导风险对冲。

## 二、 AI Agent 的算法架构与风控引擎

要实现“永续”套利，Agent 的核心代码逻辑必须包含一个**受约束的资金分配引擎**。

### 资金池隔离下的约束凯利公式（Constrained Kelly Criterion）

传统凯利公式假设资金完全自由流动，但跨 Web2/Web3 套利面临最大的敌人是“断流风险”（即 Polymarket 的钱赚翻了，但 Kalshi 仓位爆破了，且资金无法秒级互转）。

Agent 的目标函数是在两端库存约束下的对数收益最大化：

$$\max_{f_{\text{poly}}, f_{\text{kalshi}}} \mathbb{E} \left[ \ln \left( 1 + f_{\text{poly}} R_{\text{poly}} + f_{\text{kalshi}} R_{\text{kalshi}} \right) \right]$$

$$\text{s.t.} \quad f_{\text{poly}} \le \frac{V_{\text{poly}}}{W_{\text{total}}}, \quad f_{\text{kalshi}} \le \frac{V_{\text{kalshi}}}{W_{\text{total}}}$$

- **$V_{\text{poly}}, V_{\text{kalshi}}$**：当前两端可用的各自法币/USDC 净值。
    
- **$W_{\text{total}}$**：总资产。
    

**影子价格（Shadow Price）动态调整：** 当某一边资金流接近枯竭时，Agent 的算法必须自动调高那一侧资金的“影子成本”，从而在策略上**压低该侧的下单规模，或通过阶段性扩大价差阈值 $\alpha$ 来变相拒绝单边执行**，直到人工或定时任务完成跨网关资金划转。

## 三、 目前可参考的工程级工具与业务应用

虽然大部分高盈利的预测市场套利 Agent 都是闭源的私募策略，但以下生态提供了成熟的底层脚手架：

1. **工程接入层：`pyclob-client` (Polymarket 官方) & Kalshi API**
    
    - 不要试图自己封装网关。直接用官方的 Python SDK 实现 Websocket 订阅。Agent 的核心循环（Event Loop）应由 Asyncio 驱动，一边监听 Polygon 链上的组件事件（Order Bounds），一边监听 Kalshi 的基于 FIX/Websocket 的订单流。
        
2. **开源 Agent 框架：Autonolas (OLAS) 的 `prediction-market-agent`**
    
    - **极具参考价值的开源项目。** 它是目前行业内少有的、完整展示了如何让一个 AI Agent 自主运行在 Gnosis/Polygon 上进行预测市场下注的开源代码库。其架构利用了联邦学习和多签钱包（Safe），虽然默认是执行单边预测，但其“信息采集-概率更新-智能合约交互”的闭环逻辑是很好的套利底座。
        
3. **商业对标实体：业界暗流的 Arbitrage Desks**
    
    - 目前市场上如 **Wintermute**、**Presto Labs** 等顶尖的 Web3 算法做市商，其内部均设有特定的 Prediction Market 交易台。它们利用全球低延迟服务器，将 Web2 传统合规预测市场（如 Kalshi）的价格变化，作为阿尔法（Alpha）信号去清洗 Polymarket 上的散户订单。