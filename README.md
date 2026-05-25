# ⚽ 2026 FIFA World Cup 竞猜游戏

一个 Polymarket 风格的虚拟世界杯竞猜游戏。和同事们一起玩，注册送 $100 虚拟货币！

## ✨ 功能

- 🎮 注册送 $100 虚拟货币
- 📊 三种盘口：**1X2 胜负** / **大小球 2.5** / **正确比分**
- 🔄 实时赔率同步（每分钟从 The Odds API 更新）
- 💰 Polymarket 风格：买股下注，正确结算 $1/股
- 🏆 排行榜 + 个人中心
- 📱 手机友好，足球主题 UI

## 🚀 快速开始

### 方式 1: 直接运行

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动（端口 3000）
npm start
```

### 方式 2: Docker

```bash
# 构建并启动
docker compose up -d

# 访问 http://localhost:3100
```

## 🔑 配置实时赔率（可选）

1. 去 [the-odds-api.com](https://the-odds-api.com) 注册（免费）
2. 获取 API Key
3. 设置环境变量：

```bash
# 直接运行
export ODDS_API_KEY=your_key_here

# Docker: 创建 .env 文件
echo "ODDS_API_KEY=your_key_here" > .env
```

不设置 API Key 也完全可以使用 — 会使用默认赔率。

## 👤 默认账号

- **管理员**: admin / admin123
- 注册新用户即送 $100 虚拟货币

## 🎯 下注规则

| 概念 | 说明 |
|------|------|
| 价格 | 每个选项的价格代表概率（$0.02 ~ $0.98） |
| 股数 | 投入金额 ÷ 当前价格 |
| 结算 | 正确选项每股 = $1，错误 = $0 |
| 示例 | 花 $10 买 $0.40 的选项 → 得 25 股 → 正确赚 $25 |

## 🏗️ 技术栈

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4（足球主题）
- SQLite (better-sqlite3)
- JWT 认证
- The Odds API（实时赔率）
- Docker 部署

## ⚠️ 免责声明

这是一个**虚拟游戏**，不涉及任何真实交易。
