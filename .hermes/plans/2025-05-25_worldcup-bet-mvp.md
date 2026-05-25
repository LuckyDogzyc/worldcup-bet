# 2026 世界杯竞猜游戏 — MVP 实施计划

> **For Hermes:** 使用 subagent-driven-development 逐任务执行此计划。

**Goal:** 搭建一个 Polymarket 风格的 2026 世界杯虚拟竞猜游戏，支持注册、下注、结算、排行榜。

**Architecture:** Next.js 14 App Router 全栈应用，SQLite 数据库，JWT 认证，Tailwind 足球主题 UI。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, better-sqlite3, bcryptjs, jose

---

## Phase 1: 项目脚手架与基础架构

### Task 1: 初始化 Next.js 项目
**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

**步骤:**
1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"`
2. 配置 Tailwind 足球主题色（深绿 #0d4a1c, 金色 #d4af37, 草地绿 #1a6b2c）
3. 写全局 layout 带导航栏（首页/排行榜/个人中心/管理）
4. 确认 `npm run dev` 可启动

**验证:** `npm run build` 成功，`/` 页面可见导航栏

---

### Task 2: SQLite 数据库初始化
**Files:**
- Create: `src/lib/db.ts` — 数据库连接与建表
- Create: `src/lib/seed.ts` — 模拟数据种子

**步骤:**
1. 安装 `better-sqlite3` 和类型 `@types/better-sqlite3`
2. 创建 `src/lib/db.ts`：
   - `initDB()`: 建表（users, matches, bets, transactions）
   - 单例连接模式
3. 创建 `src/lib/seed.ts`：插入 8 场模拟小组赛数据
4. 在 `src/app/layout.tsx` 服务端初始化 DB

**数据模型:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance REAL DEFAULT 100.0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  group_name TEXT,
  kickoff_time TEXT NOT NULL,
  status TEXT DEFAULT 'upcoming',  -- upcoming/live/finished
  result TEXT,  -- home/draw/away
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE bets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  side TEXT NOT NULL,  -- home/draw/away
  shares REAL NOT NULL,
  amount REAL NOT NULL,
  price_at_bet REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (match_id) REFERENCES matches(id),
  UNIQUE(user_id, match_id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- bet/win/deposit
  amount REAL NOT NULL,
  ref_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**验证:** 启动后 `data/worldcup.db` 文件存在，`matches` 表有 8 条模拟数据

---

### Task 3: JWT 认证工具
**Files:**
- Create: `src/lib/auth.ts` — JWT 签发/验证 + 密码哈希
- Create: `src/lib/middleware.ts` — Next.js 中间件保护路由

**步骤:**
1. 安装 `bcryptjs`, `jose`
2. `src/lib/auth.ts`：
   - `hashPassword(password)` / `verifyPassword(password, hash)`
   - `signToken({userId, username})` / `verifyToken(token)` — HS256
   - `SESSION_SECRET` 从环境变量或 fallback
3. `src/middleware.ts`：
   - `/login`, `/register`, `/api/auth/*` 放行
   - 其余路由检查 `token` cookie
   - 未认证重定向 `/login`

**验证:** 受保护路由未登录时跳转到 `/login`

---

## Phase 2: 用户系统

### Task 4: 注册与登录 API
**Files:**
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/me/route.ts`

**步骤:**
1. `POST /api/auth/register`：验证用户名唯一 → 哈希密码 → 插入 users（balance=100）→ 签 JWT → set cookie
2. `POST /api/auth/login`：查找用户 → 验证密码 → 签 JWT → set cookie
3. `GET /api/auth/me`：验证 token → 返回 `{id, username, balance, is_admin}`
4. 错误处理：409 用户已存在、401 密码错误

**验证:** curl 注册 + 登录 + /me 返回用户信息

---

### Task 5: 登录/注册页面
**Files:**
- Create: `src/app/login/page.tsx`

**步骤:**
1. 一个页面，两个 Tab：「登录」和「注册」
2. 表单：用户名 + 密码 + 提交按钮
3. 提交调用对应 API，成功后跳转首页
4. 足球主题样式（绿色卡片 + 足球图标）

**验证:** 注册新用户 → 登录 → 跳转首页

---

## Phase 3: 赛程与下注核心

### Task 6: 赛程列表 API
**Files:**
- Create: `src/app/api/matches/route.ts`

**步骤:**
1. `GET /api/matches`：返回所有比赛，附带每场下注统计
2. 每场比赛包含：
   - `id, homeTeam, awayTeam, groupName, kickoffTime, status, result`
   - `pool`: `{home: 总金额, draw: 总金额, away: 总金额}`
   - `prices`: `{home: 当前价, draw: 当前价, away: 当前价}`
3. 价格计算：`price(side) = pool[side] / pool_total`（最小 $0.01，最大 $0.99）

**验证:** GET 返回模拟比赛及价格数据

---

### Task 7: 首页赛程卡片
**Files:**
- Create: `src/app/page.tsx` — 首页赛程列表
- Create: `src/components/MatchCard.tsx` — 单场比赛卡片组件

**步骤:**
1. `MatchCard` 组件：
   - 显示：两队名称 vs、分组、开赛时间、状态标签
   - 三个下注按钮（主胜/平/客胜）带当前价格
   - 已下注的显示"已下注"标记
   - `upcoming` 可下注，`live` 显示进行中，`finished` 显示结果
2. 首页：
   - 按 kickoff_time 排序
   - 分组展示：进行中 / 即将开始 / 已结束
   - 足球草地背景 + 白色卡片

**验证:** 首页展示 8 场模拟比赛，每张卡片有三个价格按钮

---

### Task 8: 下注 API
**Files:**
- Create: `src/app/api/bets/route.ts` — 下注
- Create: `src/app/api/bets/[matchId]/route.ts` — 查询某场下注

**步骤:**
1. `POST /api/bets`：
   - 验证：用户已登录、比赛状态=upcoming、余额充足、未下注过该场
   - 计算当前价格 → 股数 = amount / price
   - 事务操作：扣余额 + 插入 bet + 插入 transaction
   - 返回下注详情
2. `GET /api/bets?matchId=X`：返回当前用户在该场的下注
3. `GET /api/bets`：返回当前用户所有下注

**验证:** 下注成功 → 余额减少 → 再次下注同场被拒

---

### Task 9: 下注弹窗组件
**Files:**
- Create: `src/components/BetModal.tsx`

**步骤:**
1. 点击 MatchCard 的价格按钮弹出 Modal
2. 显示：比赛信息 + 选择的选项 + 当前价格
3. 输入框：投入金额（显示可用余额）
4. 实时计算：预计获得股数 + 潜在收益
5. 确认按钮 → 调用 POST /api/bets → 成功后刷新列表
6. 足球主题弹窗（金色边框 + 绿色底色）

**验证:** 完整下注流程：选比赛 → 选选项 → 输金额 → 确认 → 余额更新

---

## Phase 4: 结算与管理

### Task 10: 结算 API
**Files:**
- Create: `src/app/api/admin/settle/route.ts`

**步骤:**
1. `POST /api/admin/settle`：
   - 仅 admin 可调用
   - 参数：`matchId, result (home/draw/away)`
   - 更新 match.status = finished, match.result
   - 遍历该场所有 bets：
     - 正确方：收益 = shares × $1 → 加回余额 + 插入 win transaction
     - 错误方：无操作（钱已扣除）
   - 返回结算汇总

**验证:** 结算后赢家余额增加，输家不变

---

### Task 11: 管理后台页面
**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/api/admin/matches/route.ts` — 添加比赛 API

**步骤:**
1. 管理页面（仅 admin 可访问）：
   - 添加比赛表单：主队、客队、分组、开赛时间
   - 比赛列表：每场可"开始"(upcoming→live) 和"结算"(live→finished + 选结果)
2. `POST /api/admin/matches`：创建新比赛
3. `PATCH /api/admin/matches/[id]`：更新状态

**验证:** 创建比赛 → 开始 → 结算 → 首页显示结果

---

## Phase 5: 排行榜与个人中心

### Task 12: 排行榜
**Files:**
- Create: `src/app/leaderboard/page.tsx`
- Create: `src/app/api/leaderboard/route.ts`

**步骤:**
1. `GET /api/leaderboard`：
   - 每个用户：余额 + 未结算持仓市值（按当前价格计算）
   - 总资产 = balance + Σ(bet.shares × current_price_of_that_side)
   - 按总资产降序
2. 排行榜页面：
   - 前三名金/银/铜色高亮
   - 表格：排名、用户名、余额、持仓市值、总资产
   - 足球奖杯主题

**验证:** 下注后排行榜持仓市值变化，结算后总资产更新

---

### Task 13: 个人中心
**Files:**
- Create: `src/app/profile/page.tsx`

**步骤:**
1. 显示：
   - 用户名、当前余额
   - 未结算下注列表（比赛 + 选项 + 股数 + 投入）
   - 已结算下注历史（含盈亏）
   - 总盈亏统计
2. 退出登录按钮

**验证:** 个人中心展示完整下注记录

---

## Phase 6: 打磨与部署

### Task 14: UI 打磨
**Files:**
- Modify: 全局样式和各组件

**步骤:**
1. 统一足球主题：
   - 背景渐变（深绿到黑）
   - 卡片：半透明白色 + 绿色边框
   - 按钮：金色 + hover 放大
   - 字体：粗体 sans-serif
2. 足球图标/emoji 装饰
3. 移动端响应式适配
4. Loading 状态与空状态提示

**验证:** 手机浏览器访问 UI 正常

---

### Task 15: 部署配置
**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `package.json` scripts

**步骤:**
1. Dockerfile：node:20-alpine，多阶段构建
2. docker-compose：端口 3000，SQLite volume 挂载
3. `.env.example`：SESSION_SECRET
4. README.md：部署说明

**验证:** `docker compose up` → 访问 :3000 正常

---

## 文件结构预览

```
worldcup-bet/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 全局 layout + 导航
│   │   ├── page.tsx            # 首页赛程
│   │   ├── globals.css         # 足球主题样式
│   │   ├── login/page.tsx      # 登录注册
│   │   ├── leaderboard/page.tsx# 排行榜
│   │   ├── profile/page.tsx    # 个人中心
│   │   ├── admin/page.tsx      # 管理后台
│   │   └── api/
│   │       ├── auth/{register,login,me}/route.ts
│   │       ├── matches/route.ts
│   │       ├── bets/route.ts
│   │       ├── leaderboard/route.ts
│   │       └── admin/{matches,settle}/route.ts
│   ├── components/
│   │   ├── MatchCard.tsx
│   │   ├── BetModal.tsx
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── db.ts              # SQLite 连接与建表
│   │   ├── seed.ts            # 模拟数据
│   │   └── auth.ts            # JWT + 密码工具
│   └── middleware.ts           # 路由保护
├── data/                       # SQLite 数据文件
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 风险与注意事项

1. **SQLite 并发**：better-sqlite3 是同步的，适合小团队。如需更高并发，后续可迁移 PostgreSQL。
2. **价格精度**：使用浮点数，小团队规模下精度足够。
3. **赛程数据**：MVP 使用模拟数据，2026 年赛程公布后需要手动录入或编写导入脚本。
4. **安全性**：MVP 使用 HTTP-only cookie + JWT，非生产级别但足够内部使用。
