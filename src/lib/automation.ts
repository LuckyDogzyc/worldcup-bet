/**
 * 核心自动化引擎 — Polymarket Gamma API
 *
 * 功能：
 * - syncUpcomingEvents：从 Polymarket 发现体育赛事，自动创建赛事/比赛/盘口
 * - updateOdds：从 Polymarket 更新盘口赔率
 * - autoSettle：自动结算已结束的比赛并派彩
 * - runAllAutomation：顺序执行以上三个步骤
 *
 * 数据源：Polymarket Gamma API（公开，无需 API Key）
 */

import { getDb } from './db';

const GAMMA_API = 'https://gamma-api.polymarket.com';

// ─── 赛事识别规则 ──────────────────────────────────────────────────────

interface EventPattern {
  /** Polymarket 事件标题中的关键词（小写匹配） */
  keywords: string[];
  /** 对应的赛事名（中文） */
  tournamentName: string;
  /** 赛事 slug（用于 URL 和 DB 唯一标识） */
  tournamentSlug: string;
  /** 图标 */
  icon: string;
  /** 运动类型 */
  sport: string;
}

const EVENT_PATTERNS: EventPattern[] = [
  { keywords: ['fifa world cup', 'world cup winner'], tournamentName: '2026 FIFA 世界杯', tournamentSlug: 'worldcup-2026', icon: '⚽', sport: 'football' },
  { keywords: ['champions league', 'ucl'], tournamentName: '欧冠', tournamentSlug: 'ucl-2026', icon: '🏅', sport: 'football' },
  { keywords: ['euro 2028', 'euro championship'], tournamentName: '欧洲杯', tournamentSlug: 'euro', icon: '🇪🇺', sport: 'football' },
  { keywords: ['premier league', 'epl'], tournamentName: '英超', tournamentSlug: 'epl', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', sport: 'football' },
  { keywords: ['nba'], tournamentName: 'NBA', tournamentSlug: 'nba-2026', icon: '🏀', sport: 'basketball' },
  { keywords: ['french open', 'roland garros'], tournamentName: '法网', tournamentSlug: 'roland-garros-2026', icon: '🎾', sport: 'tennis' },
  { keywords: ['wimbledon'], tournamentName: '温网', tournamentSlug: 'wimbledon', icon: '🎾', sport: 'tennis' },
  { keywords: ['us open tennis'], tournamentName: '美网', tournamentSlug: 'us-open-tennis', icon: '🎾', sport: 'tennis' },
  { keywords: ['australian open'], tournamentName: '澳网', tournamentSlug: 'australian-open', icon: '🎾', sport: 'tennis' },
  { keywords: ['la liga'], tournamentName: '西甲', tournamentSlug: 'la-liga', icon: '🇪🇸', sport: 'football' },
  { keywords: ['serie a'], tournamentName: '意甲', tournamentSlug: 'serie-a', icon: '🇮🇹', sport: 'football' },
  { keywords: ['bundesliga'], tournamentName: '德甲', tournamentSlug: 'bundesliga', icon: '🇩🇪', sport: 'football' },
];

// ─── 工具函数 ──────────────────────────────────────────────────────────

/** 从 Polymarket 问题中提取实体名称 */
function extractEntity(question: string): string {
  // "Will France win the 2026 FIFA World Cup?" → "France"
  const patterns = [
    /^Will\s+(.+?)\s+win\b/i,
    /^Will\s+(.+?)\s+(?:be|become|reach|make|advance|defeat|beat)\b/i,
    /^(.+?)\s+(?:to win|wins|win|champion|title)\b/i,
  ];
  for (const p of patterns) {
    const m = question.match(p);
    if (m) return m[1].trim();
  }
  // 兜底：取问号前、第一个逗号前的内容
  const cleaned = question.replace(/\?$/, '').split(',')[0].trim();
  if (cleaned.length > 60) return cleaned.substring(0, 60) + '…';
  return cleaned;
}

/** 英文队名/国名 → 中文（常见映射） */
const NAME_ZH: Record<string, string> = {
  'France': '法国', 'Spain': '西班牙', 'England': '英格兰', 'Portugal': '葡萄牙',
  'Brazil': '巴西', 'Argentina': '阿根廷', 'Germany': '德国', 'Netherlands': '荷兰',
  'Norway': '挪威', 'Japan': '日本', 'Colombia': '哥伦比亚', 'Belgium': '比利时',
  'Morocco': '摩洛哥', 'USA': '美国', 'Uruguay': '乌拉圭', 'Mexico': '墨西哥',
  'Italy': '意大利', 'Switzerland': '瑞士', 'Croatia': '克罗地亚', 'Denmark': '丹麦',
  'South Korea': '韩国', 'Australia': '澳大利亚', 'Canada': '加拿大', 'Iran': '伊朗',
  'Saudi Arabia': '沙特', 'Ecuador': '厄瓜多尔', 'Paraguay': '巴拉圭',
  'New Zealand': '新西兰', 'Tunisia': '突尼斯', 'Senegal': '塞内加尔',
  'South Africa': '南非', 'Uzbekistan': '乌兹别克斯坦', 'Jordan': '约旦',
  'Real Madrid': '皇家马德里', 'Arsenal': '阿森纳', 'Barcelona': '巴塞罗那',
  'Manchester City': '曼城', 'Bayern Munich': '拜仁慕尼黑', 'Inter Milan': '国际米兰',
  'Paris Saint-Germain': '巴黎圣日耳曼', 'PSG': '巴黎圣日耳曼',
  'Oklahoma City Thunder': '雷霆', 'Cleveland Cavaliers': '骑士',
  'New York Knicks': '尼克斯', 'Boston Celtics': '凯尔特人',
  'Denver Nuggets': '掘金', 'Houston Rockets': '火箭',
  'San Antonio Spurs': '马刺', 'Los Angeles Lakers': '湖人',
  'Golden State Warriors': '勇士', 'Miami Heat': '热火',
  'Alcaraz': '阿尔卡拉斯', 'Sinner': '辛纳', 'Djokovic': '德约科维奇',
  'Swiatek': '斯瓦泰克', 'Gauff': '高芙', 'Sabalenka': '萨巴伦卡',
};

function toZhName(enName: string): string {
  // 精确匹配
  if (NAME_ZH[enName]) return NAME_ZH[enName];
  // 部分匹配
  for (const [en, zh] of Object.entries(NAME_ZH)) {
    if (enName.includes(en) || en.includes(enName)) return zh;
  }
  return enName;
}

/** 解析 outcomePrices（可能是字符串数组或 JSON 字符串） */
function parseOutcomePrices(raw: unknown): [number, number] {
  let prices: string[];
  if (typeof raw === 'string') {
    try { prices = JSON.parse(raw); } catch { return [0.5, 0.5]; }
  } else if (Array.isArray(raw)) {
    prices = raw.map(String);
  } else {
    return [0.5, 0.5];
  }
  const yes = parseFloat(prices[0] || '0.5');
  const no = parseFloat(prices[1] || '0.5');
  if (isNaN(yes) || isNaN(no) || yes <= 0 || no <= 0) return [0.5, 0.5];
  return [yes, no];
}

/** 匹配事件到赛事规则 */
function matchEvent(title: string, slug: string): EventPattern | null {
  const lower = (title + ' ' + slug).toLowerCase();
  for (const p of EVENT_PATTERNS) {
    if (p.keywords.some(kw => lower.includes(kw))) return p;
  }
  return null;
}

/** 从问题中提取轮次/阶段描述 */
function extractRoundName(question: string, eventTitle: string): string {
  const lower = question.toLowerCase();
  if (lower.includes('world cup')) return '世界杯冠军';
  if (lower.includes('champions league')) return '欧冠冠军';
  if (lower.includes('nba finals') || lower.includes('nba champion')) return 'NBA总冠军';
  if (lower.includes('eastern conference')) return '东部冠军';
  if (lower.includes('western conference')) return '西部冠军';
  if (lower.includes('french open') || lower.includes('roland garros')) return '法网冠军';
  if (lower.includes('wimbledon')) return '温网冠军';
  // 兜底：用事件标题
  return eventTitle.length > 30 ? eventTitle.substring(0, 30) : eventTitle;
}

// ─── 核心同步逻辑 ──────────────────────────────────────────────────────

interface SyncStats {
  eventsScanned: number;
  tournamentsCreated: number;
  matchesCreated: number;
  matchesUpdated: number;
  oddsUpdated: number;
  settled: number;
  errors: string[];
}

export async function runAllAutomation(_apiKey?: string): Promise<SyncStats> {
  const stats: SyncStats = {
    eventsScanned: 0,
    tournamentsCreated: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    oddsUpdated: 0,
    settled: 0,
    errors: [],
  };

  try {
    await syncUpcomingEvents(stats);
    await updateOdds(stats);
    await autoSettle(stats);
  } catch (err) {
    stats.errors.push(String(err));
    console.error('[automation] 全局错误:', err);
  }

  console.log(`[automation] 完成: 扫描${stats.eventsScanned}事件 / 新建${stats.tournamentsCreated}赛事/${stats.matchesCreated}比赛 / 更新${stats.oddsUpdated}赔率 / 结算${stats.settled}场`);
  return stats;
}

// ─── 步骤1: 发现赛事 ────────────────────────────────────────────────────

async function syncUpcomingEvents(stats: SyncStats): Promise<void> {
  console.log('[automation] 步骤1: 从 Polymarket 发现赛事...');

  const db = getDb();
  let allEvents: any[] = [];

  // 分页拉取体育类事件
  for (let offset = 0; offset < 200; offset += 50) {
    try {
      const url = `${GAMMA_API}/events?active=true&closed=false&limit=50&offset=${offset}&tag=sports`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) break;
      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) break;
      allEvents = allEvents.concat(data);
      if (data.length < 50) break;
    } catch (err) {
      stats.errors.push(`拉取事件失败(offset=${offset}): ${String(err)}`);
      break;
    }
  }

  stats.eventsScanned = allEvents.length;
  console.log(`[automation] 拉取到 ${allEvents.length} 个活跃体育事件`);

  for (const event of allEvents) {
    try {
      const title = String(event.title || event.name || '');
      const slug = String(event.slug || '');
      const pattern = matchEvent(title, slug);
      if (!pattern) continue;

      // 确保赛事存在于 DB
      const existingTournament = db.prepare(
        'SELECT id FROM tournaments WHERE slug = ?'
      ).get(pattern.tournamentSlug);

      let tournamentId: number;
      if (existingTournament) {
        tournamentId = (existingTournament as any).id;
      } else {
        const endDate = event.endDate ? String(event.endDate).substring(0, 10) : null;
        const result = db.prepare(
          `INSERT INTO tournaments (name, slug, icon, sport, start_date, end_date, status, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 'upcoming', 5)`
        ).run(pattern.tournamentName, pattern.tournamentSlug, pattern.icon, pattern.sport, endDate, endDate);
        tournamentId = result.lastInsertRowid as number;
        stats.tournamentsCreated++;
        console.log(`[automation] 新建赛事: ${pattern.tournamentName} (id=${tournamentId})`);
      }

      // 处理该事件下的所有市场
      const markets = event.markets || [];
      for (const market of markets) {
        try {
          await syncMarket(db, tournamentId, market, title, stats);
        } catch (err) {
          stats.errors.push(`市场同步失败(${market.question?.substring(0, 40)}): ${String(err)}`);
        }
      }
    } catch (err) {
      stats.errors.push(`事件处理失败(${event.title?.substring(0, 30)}): ${String(err)}`);
    }
  }
}

async function syncMarket(db: any, tournamentId: number, market: any, eventTitle: string, stats: SyncStats): Promise<void> {
  const question = String(market.question || '');
  const polymarketId = String(market.id || '');
  const outcomes = market.outcomes;
  const prices = parseOutcomePrices(market.outcomePrices);

  // 只处理 Yes/No 类型盘口
  if (!Array.isArray(outcomes) || outcomes.length < 2) return;
  const yesPrice = prices[0];
  if (yesPrice < 0.001) return; // 忽略已确定的市场

  // 提取实体名称
  const entityEn = extractEntity(question);
  const entityZh = toZhName(entityEn);
  const roundName = extractRoundName(question, eventTitle);

  // 去重：用 home_team + tournament_id + round_name 检查是否已存在
  const existing = db.prepare(
    `SELECT m.id, m.status FROM matches m
     WHERE m.home_team = ? AND m.tournament_id = ? AND m.round_name = ?`
  ).get(entityZh, tournamentId, roundName);

  if (existing) {
    // 已存在 — 更新 Polymarket ID 到盘口描述（如果是首次同步真实ID）
    const existingMarket = db.prepare(
      `SELECT id, description FROM markets WHERE match_id = ? AND market_type = '1x2'`
    ).get((existing as any).id);
    if (existingMarket && !(existingMarket as any).description.startsWith('pm:')) {
      db.prepare('UPDATE markets SET description = ? WHERE id = ?').run(`pm:${polymarketId}`, (existingMarket as any).id);
    }
    stats.matchesUpdated++;
    return;
  }

  // 创建新比赛
  const endDate = market.endDate ? String(market.endDate) : null;
  const result = db.prepare(
    `INSERT INTO matches (tournament_id, home_team, away_team, round_name, kickoff_time, status)
     VALUES (?, ?, '其他', ?, ?, 'upcoming')`
  ).run(tournamentId, entityZh, roundName, endDate);

  const matchId = result.lastInsertRowid as number;

  // 创建盘口（胜负盘，Yes/No）
  const marketResult = db.prepare(
    `INSERT INTO markets (match_id, market_type, description)
     VALUES (?, '1x2', ?)`
  ).run(matchId, `pm:${polymarketId}`);

  const marketId = marketResult.lastInsertRowid as number;

  // 创建选项
  db.prepare(
    `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, ?, ?, 0)`
  ).run(marketId, '是', yesPrice);

  db.prepare(
    `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, ?, ?, 1)`
  ).run(marketId, '否', prices[1]);

  stats.matchesCreated++;
}

// ─── 步骤2: 更新赔率 ────────────────────────────────────────────────────

async function updateOdds(stats: SyncStats): Promise<void> {
  console.log('[automation] 步骤2: 更新 Polymarket 赔率...');

  const db = getDb();

  // 找出所有带有 pm: 前缀的盘口（来自 Polymarket 的）
  const polymarketMarkets = db.prepare(`
    SELECT mk.id, mk.description, mo.id as option_id, mo.label, mo.price
    FROM markets mk
    JOIN market_options mo ON mo.market_id = mk.id
    WHERE mk.description LIKE 'pm:%' AND mk.settled = 0
  `).all() as any[];

  if (polymarketMarkets.length === 0) return;

  // 按 polymarket ID 分组
  const byPolymarketId: Record<string, { marketId: number; options: any[] }> = {};
  for (const row of polymarketMarkets) {
    const pmId = row.description.replace('pm:', '');
    if (!byPolymarketId[pmId]) byPolymarketId[pmId] = { marketId: row.id, options: [] };
    byPolymarketId[pmId].options.push(row);
  }

  console.log(`[automation] 需更新 ${Object.keys(byPolymarketId).length} 个市场赔率`);

  // 批量查询当前价格
  const pmIds = Object.keys(byPolymarketId);
  for (let i = 0; i < pmIds.length; i += 20) {
    const batch = pmIds.slice(i, i + 20);
    try {
      // 用 markets API 批量查询
      const idsQuery = batch.join('&id=');
      const url = `${GAMMA_API}/markets?id=${idsQuery}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!Array.isArray(data)) continue;

      for (const m of data) {
        const pmId = String(m.id);
        const entry = byPolymarketId[pmId];
        if (!entry) continue;

        const prices = parseOutcomePrices(m.outcomePrices);
        const yesLabel = '是';
        const noLabel = '否';

        // 更新 Yes 选项
        const yesOption = entry.options.find((o: any) => o.label === yesLabel);
        if (yesOption && Math.abs(yesOption.price - prices[0]) > 0.001) {
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(prices[0], yesOption.id);
          stats.oddsUpdated++;
        }

        // 更新 No 选项
        const noOption = entry.options.find((o: any) => o.label === noLabel);
        if (noOption && Math.abs(noOption.price - prices[1]) > 0.001) {
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(prices[1], noOption.id);
          stats.oddsUpdated++;
        }
      }
    } catch (err) {
      stats.errors.push(`赔率更新失败(batch ${i}): ${String(err)}`);
    }
  }
}

// ─── 步骤3: 自动结算 ────────────────────────────────────────────────────

async function autoSettle(stats: SyncStats): Promise<void> {
  console.log('[automation] 步骤3: 检查已结束的比赛...');

  const db = getDb();

  // 找出所有未结算的 Polymarket 盘口
  const unsettled = db.prepare(`
    SELECT mk.id as market_id, mk.description, mk.match_id,
           mo.id as option_id, mo.label, mo.price
    FROM markets mk
    JOIN market_options mo ON mo.market_id = mk.id
    WHERE mk.description LIKE 'pm:%' AND mk.settled = 0
  `).all() as any[];

  if (unsettled.length === 0) return;

  // 按 polymarket ID 分组
  const byPmId: Record<string, { marketId: number; matchId: number; options: any[] }> = {};
  for (const row of unsettled) {
    const pmId = row.description.replace('pm:', '');
    if (!byPmId[pmId]) byPmId[pmId] = { marketId: row.marketId, matchId: row.match_id, options: [] };
    byPmId[pmId].options.push(row);
  }

  const pmIds = Object.keys(byPmId);
  let settledCount = 0;

  for (let i = 0; i < pmIds.length; i += 20) {
    const batch = pmIds.slice(i, i + 20);
    try {
      const idsQuery = batch.join('&id=');
      const url = `${GAMMA_API}/markets?id=${idsQuery}&closed=true`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!Array.isArray(data)) continue;

      for (const m of data) {
        const pmId = String(m.id);
        const entry = byPmId[pmId];
        if (!entry) continue;

        // 检查是否已关闭且已解析
        const closed = m.closed;
        const resolved = m.resolved;
        if (!closed && !resolved) continue;

        // 判断赢的选项
        const prices = parseOutcomePrices(m.outcomePrices);
        const winningLabel = prices[0] >= 0.99 ? '是' : (prices[1] >= 0.99 ? '否' : null);

        if (!winningLabel) {
          // 赔率还没收敛到0/1，可能还在等待最终确认
          // 用 resolutionSource 判断
          const resolution = m.resolution;
          if (resolution === 'Yes' || resolution === '1') {
            settleMarket(db, entry, '是', stats);
            settledCount++;
          } else if (resolution === 'No' || resolution === '0') {
            settleMarket(db, entry, '否', stats);
            settledCount++;
          }
          continue;
        }

        settleMarket(db, entry, winningLabel, stats);
        settledCount++;
      }
    } catch (err) {
      stats.errors.push(`结算检查失败(batch ${i}): ${String(err)}`);
    }
  }

  stats.settled = settledCount;
}

function settleMarket(db: any, entry: { marketId: number; matchId: number; options: any[] }, winningLabel: string, stats: SyncStats): void {
  const winningOption = entry.options.find((o: any) => o.label === winningLabel);

  // 标记账口已结算
  db.prepare('UPDATE markets SET settled = 1, winning_option = ? WHERE id = ?')
    .run(winningLabel, entry.marketId);

  // 标记比赛已结束
  db.prepare("UPDATE matches SET status = 'finished', result_home = ?, result_away = ? WHERE id = ?")
    .run(winningLabel === '是' ? 1 : 0, winningLabel === '否' ? 1 : 0, entry.matchId);

  // 派彩：找出所有投注了该市场的注单
  if (winningOption) {
    const bets = db.prepare(`
      SELECT b.id, b.user_id, b.amount, b.market_option_id
      FROM bets b
      WHERE b.market_option_id IN (
        SELECT mo.id FROM market_options mo WHERE mo.market_id = ?
      )
    `).all(entry.marketId) as any[];

    const updateBalance = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
    const updateBet = db.prepare("UPDATE bets SET status = 'settled' WHERE id = ?");

    const transaction = db.transaction(() => {
      for (const bet of bets) {
        if (bet.market_option_id === winningOption.id) {
          // 赢了：返还投入 + 利润
          const payout = bet.amount * (1 / winningOption.price);
          updateBalance.run(payout, bet.user_id);
          updateBet.run(bet.id);
        } else {
          // 输了
          const updateLostBet = db.prepare("UPDATE bets SET status = 'lost' WHERE id = ?");
          updateLostBet.run(bet.id);
        }
      }
    });

    transaction();
    console.log(`[automation] 结算市场 ${entry.marketId}，赢家=${winningLabel}，处理${bets.length}注`);
  }
}
