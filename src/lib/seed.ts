import { getDb } from './db';

interface TournamentSeed {
  name: string;
  slug: string;
  icon: string;
  sport: string;
  start_date: string;
  end_date: string;
  status: string;
  sort_order: number;
}

const TOURNAMENTS: TournamentSeed[] = [
  { name: '2026 FIFA 世界杯', slug: 'worldcup-2026', icon: '⚽', sport: 'football', start_date: '2026-06-11', end_date: '2026-07-19', status: 'upcoming', sort_order: 1 },
  { name: '欧冠决赛 2026', slug: 'ucl-final-2026', icon: '🏅', sport: 'football', start_date: '2026-05-30', end_date: '2026-05-30', status: 'upcoming', sort_order: 2 },
  { name: '法网 2026', slug: 'roland-garros-2026', icon: '🎾', sport: 'tennis', start_date: '2026-05-24', end_date: '2026-06-07', status: 'live', sort_order: 3 },
  { name: 'NBA 总决赛 2026', slug: 'nba-finals-2026', icon: '🏀', sport: 'basketball', start_date: '2026-06-04', end_date: '2026-06-22', status: 'upcoming', sort_order: 4 },
  { name: '欧冠决赛 2025', slug: 'ucl-final-2025', icon: '🏆', sport: 'football', start_date: '2025-05-31', end_date: '2025-05-31', status: 'finished', sort_order: 10 },
];

interface MatchSeed {
  home_team: string;
  away_team: string;
  round_name: string;
  kickoff_time: string;
  status: string;
  result_home: number | null;
  result_away: number | null;
  tournament_slug: string;
}

const MATCHES: MatchSeed[] = [
  // === 欧冠决赛 2025 (已结束 - 巴黎圣日耳曼 5-0 国际米兰) ===
  { home_team: '巴黎圣日耳曼', away_team: '国际米兰', round_name: '决赛 · 慕尼黑', kickoff_time: '2025-05-31T21:00:00+02:00', status: 'finished', result_home: 5, result_away: 0, tournament_slug: 'ucl-final-2025' },

  // === 欧冠 2026 (半决赛已结束，决赛即将开始) ===
  { home_team: '皇家马德里', away_team: '拜仁慕尼黑', round_name: '半决赛首回合', kickoff_time: '2026-04-28T21:00:00+02:00', status: 'finished', result_home: 2, result_away: 1, tournament_slug: 'ucl-final-2026' },
  { home_team: '拜仁慕尼黑', away_team: '皇家马德里', round_name: '半决赛次回合', kickoff_time: '2026-05-05T21:00:00+02:00', status: 'finished', result_home: 1, result_away: 3, tournament_slug: 'ucl-final-2026' },
  { home_team: '曼城', away_team: '巴塞罗那', round_name: '半决赛首回合', kickoff_time: '2026-04-29T21:00:00+02:00', status: 'finished', result_home: 3, result_away: 1, tournament_slug: 'ucl-final-2026' },
  { home_team: '巴塞罗那', away_team: '曼城', round_name: '半决赛次回合', kickoff_time: '2026-05-06T21:00:00+02:00', status: 'finished', result_home: 2, result_away: 1, tournament_slug: 'ucl-final-2026' },
  { home_team: '皇家马德里', away_team: '曼城', round_name: '决赛 · 布达佩斯', kickoff_time: '2026-05-30T21:00:00+02:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'ucl-final-2026' },

  // === 法网决赛 (June 6-7, Paris) ===
  { home_team: '阿尔卡拉斯', away_team: '辛纳', round_name: '男单决赛', kickoff_time: '2026-06-07T15:00:00+02:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'roland-garros-2026' },
  { home_team: '斯瓦泰克', away_team: '高芙', round_name: '女单决赛', kickoff_time: '2026-06-06T15:00:00+02:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'roland-garros-2026' },

  // === NBA 总决赛 ===
  { home_team: '雷霆', away_team: '凯尔特人', round_name: 'G1', kickoff_time: '2026-06-05T20:30:00-04:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'nba-finals-2026' },
  { home_team: '雷霆', away_team: '凯尔特人', round_name: 'G2', kickoff_time: '2026-06-08T20:30:00-04:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'nba-finals-2026' },
  { home_team: '凯尔特人', away_team: '雷霆', round_name: 'G3', kickoff_time: '2026-06-11T20:30:00-04:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'nba-finals-2026' },

  // === 2026 FIFA 世界杯小组赛 ===
  { home_team: '墨西哥', away_team: '待抽签', round_name: '开幕战 · A组', kickoff_time: '2026-06-11T18:00:00-06:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '加拿大', away_team: '待抽签', round_name: 'B组 · 第1轮', kickoff_time: '2026-06-12T19:30:00-04:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '美国', away_team: '待抽签', round_name: 'C组 · 第1轮', kickoff_time: '2026-06-12T19:30:00-07:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '阿根廷', away_team: '待抽签', round_name: 'D组 · 第1轮', kickoff_time: '2026-06-13T19:30:00-05:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '巴西', away_team: '待抽签', round_name: 'E组 · 第1轮', kickoff_time: '2026-06-14T15:00:00-03:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '法国', away_team: '待抽签', round_name: 'F组 · 第1轮', kickoff_time: '2026-06-14T21:00:00+02:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '英格兰', away_team: '待抽签', round_name: 'G组 · 第1轮', kickoff_time: '2026-06-15T17:00:00+01:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
  { home_team: '德国', away_team: '待抽签', round_name: 'H组 · 第1轮', kickoff_time: '2026-06-15T21:00:00+02:00', status: 'upcoming', result_home: null, result_away: null, tournament_slug: 'worldcup-2026' },
];

interface OptionDef { label: string; price: number }

const MARKET_DEFS: Record<string, { description: string; options: OptionDef[] }> = {
  '1x2': {
    description: '胜负',
    options: [
      { label: '主胜', price: 0.45 },
      { label: '平局', price: 0.25 },
      { label: '客胜', price: 0.30 },
    ],
  },
  ou25: {
    description: '大小球 2.5',
    options: [
      { label: '大于 2.5 球', price: 0.55 },
      { label: '小于等于 2.5 球', price: 0.45 },
    ],
  },
};

// Tennis/Basketball don't have ou25 - only 1x2 (or win/lose)
const MARKET_DEFS_TENNIS: Record<string, { description: string; options: OptionDef[] }> = {
  '1x2': {
    description: '胜负',
    options: [
      { label: '主胜', price: 0.50 },
      { label: '客胜', price: 0.50 },
    ],
  },
};

const MARKET_DEFS_BASKETBALL: Record<string, { description: string; options: OptionDef[] }> = {
  '1x2': {
    description: '胜负',
    options: [
      { label: '主胜', price: 0.55 },
      { label: '客胜', price: 0.45 },
    ],
  },
};

// Custom prices for specific matches
const CUSTOM_PRICES: Record<string, Record<string, OptionDef[]>> = {
  '巴黎圣日耳曼 vs 国际米兰': {
    '1x2': [
      { label: '主胜', price: 0.55 },
      { label: '平局', price: 0.22 },
      { label: '客胜', price: 0.23 },
    ],
    ou25: [
      { label: '大于 2.5 球', price: 0.50 },
      { label: '小于等于 2.5 球', price: 0.50 },
    ],
  },
  '皇家马德里 vs 曼城': {
    '1x2': [
      { label: '主胜', price: 0.42 },
      { label: '平局', price: 0.24 },
      { label: '客胜', price: 0.34 },
    ],
  },
  '阿尔卡拉斯 vs 辛纳': {
    '1x2': [
      { label: '主胜', price: 0.55 },
      { label: '客胜', price: 0.45 },
    ],
  },
  '斯瓦泰克 vs 高芙': {
    '1x2': [
      { label: '主胜', price: 0.60 },
      { label: '客胜', price: 0.40 },
    ],
  },
  '阿根廷 vs 待抽签': {
    '1x2': [
      { label: '主胜', price: 0.65 },
      { label: '平局', price: 0.20 },
      { label: '客胜', price: 0.15 },
    ],
  },
  '巴西 vs 待抽签': {
    '1x2': [
      { label: '主胜', price: 0.60 },
      { label: '平局', price: 0.22 },
      { label: '客胜', price: 0.18 },
    ],
  },
  '法国 vs 待抽签': {
    '1x2': [
      { label: '主胜', price: 0.58 },
      { label: '平局', price: 0.22 },
      { label: '客胜', price: 0.20 },
    ],
  },
  '英格兰 vs 待抽签': {
    '1x2': [
      { label: '主胜', price: 0.52 },
      { label: '平局', price: 0.25 },
      { label: '客胜', price: 0.23 },
    ],
  },
  '德国 vs 待抽签': {
    '1x2': [
      { label: '主胜', price: 0.50 },
      { label: '平局', price: 0.25 },
      { label: '客胜', price: 0.25 },
    ],
  },
};

export function seedData(): void {
  const db = getDb();

  const matchCount = (db.prepare('SELECT COUNT(*) as count FROM matches').get() as { count: number }).count;
  if (matchCount > 0) {
    console.log('Data already seeded, skipping...');
    return;
  }

  console.log('Seeding database with 2026 real events...');

  // Insert tournaments
  const tournamentMap: Record<string, number> = {};
  const insertTournament = db.prepare(`
    INSERT INTO tournaments (name, slug, icon, sport, start_date, end_date, status, sort_order)
    VALUES (@name, @slug, @icon, @sport, @start_date, @end_date, @status, @sort_order)
  `);

  for (const t of TOURNAMENTS) {
    const result = insertTournament.run(t);
    tournamentMap[t.slug] = result.lastInsertRowid as number;
  }

  const insertMatch = db.prepare(`
    INSERT INTO matches (tournament_id, home_team, away_team, round_name, kickoff_time, status, result_home, result_away)
    VALUES (@tournament_id, @home_team, @away_team, @round_name, @kickoff_time, @status, @result_home, @result_away)
  `);

  const insertMarket = db.prepare(`
    INSERT INTO markets (match_id, market_type, description)
    VALUES (@match_id, @market_type, @description)
  `);

  const insertOption = db.prepare(`
    INSERT INTO market_options (market_id, label, price, sort_order)
    VALUES (@market_id, @label, @price, @sort_order)
  `);

  const seedTransaction = db.transaction(() => {
    for (const match of MATCHES) {
      const tournamentId = tournamentMap[match.tournament_slug];
      const result = insertMatch.run({
        tournament_id: tournamentId,
        home_team: match.home_team,
        away_team: match.away_team,
        round_name: match.round_name,
        kickoff_time: match.kickoff_time,
        status: match.status,
        result_home: match.result_home,
        result_away: match.result_away,
      });
      const matchId = result.lastInsertRowid as number;
      const matchKey = `${match.home_team} vs ${match.away_team}`;

      // Pick market defs based on sport
      let marketDefs: Record<string, { description: string; options: OptionDef[] }>;
      if (match.tournament_slug === 'roland-garros-2026') {
        marketDefs = MARKET_DEFS_TENNIS;
      } else if (match.tournament_slug === 'nba-finals-2026') {
        marketDefs = MARKET_DEFS_BASKETBALL;
      } else {
        marketDefs = MARKET_DEFS;
      }

      const customPrices = CUSTOM_PRICES[matchKey] || {};

      for (const [marketType, marketDef] of Object.entries(marketDefs)) {
        const marketResult = insertMarket.run({
          match_id: matchId,
          market_type: marketType,
          description: marketDef.description,
        });
        const marketId = marketResult.lastInsertRowid as number;

        const options = customPrices[marketType] || marketDef.options;

        options.forEach((opt: OptionDef, index: number) => {
          insertOption.run({
            market_id: marketId,
            label: opt.label,
            price: opt.price,
            sort_order: index,
          });
        });
      }
    }

    // Create admin user
    const bcrypt = require('bcryptjs');
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (username, password_hash, balance, is_admin) VALUES (?, ?, ?, ?)'
    ).run('admin', adminHash, 100.0, 1);

    console.log('Seed data inserted successfully - 2026 real events!');
  });

  seedTransaction();
}
