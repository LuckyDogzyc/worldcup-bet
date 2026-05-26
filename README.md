# ⚽ 世界杯同事竞猜模拟器

一个面向小团队的 Polymarket 风格体育竞猜小游戏。每位玩家注册后获得 **$100 虚拟货币**，可以在比赛开始前选择赛果、让球或大小球盘口下注，比赛结束后按结果自动结算。

> ⚠️ 本项目仅用于办公室/朋友之间的虚拟娱乐和产品演示。所有金额均为虚拟货币，没有任何真实价值；不支持充值、提现、兑换、转账、抽头或任何真实交易。

## 功能概览

- **账号系统**：玩家自行注册、登录；新账号获得 $100 虚拟资金。
- **真实赛事数据**：赛事和赔率来自 Polymarket 公开数据，只保留单场比赛盘口。
- **三类常规盘口**：
  - 胜负（1X2）：主胜 / 平局 / 客胜
  - 让球：例如主队 -1.5、客队 +1.5
  - 大小 2.5 球：总进球大于 2.5 / 小于等于 2.5
- **Polymarket 风格下注**：用当前价格买入份额，猜中后每份额结算为 $1。
- **自动同步与结算**：cron 触发 Polymarket 数据同步、赔率更新和比赛结算。
- **排行榜**：按余额 + 未结算持仓市值展示总资产排名。
- **玩家公开档案**：排行榜玩家可点击查看下注记录和资金变化曲线。
- **我的投注**：查看自己的历史下注、未结算持仓和已结算盈亏。
- **合规提示**：登录/注册页、页脚和免责声明页面均强调纯虚拟模拟器。
- **深色足球风格 UI**：面向手机和桌面端的赛事卡片、赔率按钮、足球新闻感背景。
- **球队视觉标识**：国家队显示国旗，俱乐部显示队徽，帮助快速识别对阵双方。

## 玩法说明

### 1. 注册与初始资金

1. 打开网站。
2. 点击注册，输入用户名和密码。
3. 阅读并勾选免责声明。
4. 注册成功后自动获得 **$100 虚拟货币**。

### 2. 浏览比赛

首页按赛事展示当前可下注比赛。比赛卡片中：

- 左侧标记为 **主场**，队名旁会显示国旗或俱乐部队徽。
- 右侧标记为 **客场**，队名旁会显示国旗或俱乐部队徽。
- 开赛时间以北京时间展示。
- 比赛开始后不应再下注。
- 已结束比赛会进入「比赛结果」区域，而不是混在投注区。

### 3. 查看规则说明

每个盘口标题旁有 `ⓘ`：

- 点击或鼠标悬停可以看到该盘口的结算规则。
- 页面顶部也有「玩法说明」面板，适合第一次玩的同事快速理解。

### 4. 下单流程

1. 在比赛卡片中选择一个赔率按钮。
2. 弹窗会再次显示主场/客场、选择项、赔率和预计收益。
3. 输入下注金额或选择快捷金额。
4. 确认下注后，余额会扣除投入金额。
5. 下注后同一盘口会显示已下注状态，避免重复误点。

### 5. 赔率与收益怎么算

项目内部按 Polymarket 的价格模型计算：

| 概念 | 说明 |
| --- | --- |
| 价格 | 代表该结果的隐含概率，例如 0.40 表示约 40% |
| 倍数 | 页面显示为 `1 / 价格`，例如 0.40 显示为 2.50 倍 |
| 份额 | 投入金额 ÷ 当前价格 |
| 猜中 | 每 1 份额结算为 $1 |
| 猜错 | 该下注结算为 $0 |

示例：投入 $10，当前价格 0.40：

- 获得份额：$10 / 0.40 = 25 份
- 猜中后返还：25 × $1 = $25
- 净盈利：$25 - $10 = $15

### 6. 三种盘口怎么赢

> ⚠️ 足球盘口统一按 **常规 90 分钟 + 伤停补时** 的官方比分结算，**不包含加时赛和点球大战**。例如欧冠决赛或世界杯淘汰赛如果 90 分钟打平、加时后分出胜负，胜负盘仍按「平局」结算；让球和大小 2.5 球也只看加时前的比分。

#### 胜负（1X2）

- **主胜**：左侧主场球队在常规时间赢球。
- **平局**：常规 90 分钟 + 伤停补时结束时双方打平。
- **客胜**：右侧客场球队在常规时间赢球。

#### 让球

按钮直接用口语化文字说明，只计算常规 90 分钟 + 伤停补时内的比分：

- **"某队需赢2球以上"**：该队必须赢 2 球或以上才算赢（如 2:0、3:1）。只赢 1 球（如 2:1）、打平或输球都不算赢。
- **"某队不输2球就赢"**：该队赢球、打平、或只输 1 球都算赢。输 2 球或以上才算输。

#### 大小 2.5 球

只计算常规 90 分钟 + 伤停补时内双方总进球：

- **大于 2.5 球**：两队总进球数 ≥ 3。
- **小于等于 2.5 球**：两队总进球数 ≤ 2。

### 7. 排行榜和玩家页面

排行榜按「总资产」排序：

```text
总资产 = 当前余额 + 未结算下注的投入金额
```

> 未结算期间按投入资金计算，不按假设胜利回报计算。

点击玩家名称可以进入玩家公开档案页，查看：

- 余额、总资产、总下注、胜率、总投入、净盈亏
- 下注记录
- 总资产变化曲线（余额 + 未结算投入）

公开档案只展示竞猜相关信息，不展示密码、会话、内部权限等敏感数据。

## 数据来源与同步

- 数据源：Polymarket 公开页面和 Gamma API。
- 同步内容：单场比赛、盘口、赔率、比赛状态和结算结果。
- 项目过滤掉冠军/总冠军类 outright 盘口，只保留可按单场比分理解的常规比赛。
- cron 定时调用 `/api/cron/run` 执行：
  1. 发现并同步最新比赛
  2. 更新赔率
  3. 检查可结算比赛
  4. 派发虚拟收益

### 赔率检查

赔率按钮显示的是倍数：

```text
倍数 = 1 / Polymarket 当前价格
```

例如 Polymarket price 为 0.50，页面显示约 2.00 倍。

## 数据库与生产数据安全

项目使用 SQLite + WAL：

- 主库：`data/worldcup.db` 或 standalone 运行目录下的 `data/worldcup.db`
- WAL：`worldcup.db-wal`
- SHM：`worldcup.db-shm`

重要原则：

1. **有真实用户后，运行库就是生产数据源。**
2. 不要用本地 seed/source DB 覆盖运行时 DB。
3. 不要重置 `users`、`bets`、`transactions`。
4. 部署或迁移前先 checkpoint WAL，再备份 DB。
5. 结构变更优先使用非破坏性迁移，例如 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ADD COLUMN`、`CREATE INDEX IF NOT EXISTS`。
6. 清理赛事数据时必须限定范围，不能影响用户、下注和流水。

推荐备份流程：

```bash
mkdir -p backups
node - <<'JS'
const Database = require('better-sqlite3');
const db = new Database('.next/standalone/data/worldcup.db');
db.pragma('wal_checkpoint(FULL)');
db.close();
JS
cp .next/standalone/data/worldcup.db "backups/worldcup-$(date +%Y%m%d-%H%M%S).db"
```

检查数据规模：

```bash
node - <<'JS'
const Database = require('better-sqlite3');
const db = new Database('.next/standalone/data/worldcup.db');
for (const t of ['users', 'bets', 'transactions', 'tournaments', 'matches', 'markets', 'market_options']) {
  console.log(t, db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c);
}
console.log('page_count', db.pragma('page_count', { simple: true }));
console.log('freelist', db.pragma('freelist_count', { simple: true }));
db.close();
JS
```

当前设计不会保存赔率历史快照；cron 只更新当前盘口价格。因此 DB 增长主要来自：

- 新注册用户
- 玩家下注记录
- 结算流水
- Polymarket 新增的真实比赛/盘口

WAL 已启用自动 checkpoint，避免 WAL 文件长期无限增长；做备份/部署前仍建议手动 checkpoint。

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 构建

```bash
npm run build
```

### 启动生产模式

```bash
npm start
```

如果使用 standalone 部署，需要手动复制静态资源：

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

> 注意：不要在已有真实用户后把旧的 `data/worldcup.db` 复制覆盖到 `.next/standalone/data/worldcup.db`。

## 部署建议

1. checkpoint + 备份运行时 DB。
2. 拉取最新代码。
3. 构建项目。
4. 复制 `.next/static` 和 `public` 到 standalone。
5. 保留并恢复运行时 DB。
6. 重启服务。
7. 验证首页、排行榜、玩家页和 DB 行数。

常用健康检查：

```bash
curl -I http://localhost:3100/leaderboard
curl -I http://localhost:3100/disclaimer
```

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite + better-sqlite3
- jose JWT cookie 会话
- Polymarket Gamma API / Sports 页面数据

## 合规与免责声明

本项目是纯虚拟竞猜模拟器：

- 不涉及真实金钱。
- 不提供充值、提现或兑换。
- 不提供真实交易撮合。
- 不抽水、不营利。
- 虚拟货币仅用于游戏内娱乐和排行榜展示。

完整说明见站内 `/disclaimer` 页面。
