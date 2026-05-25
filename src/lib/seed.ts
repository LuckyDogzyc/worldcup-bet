import { getDb, initDB } from './db';

interface MatchSeed {
  home_team: string;
  away_team: string;
  round_name: string;
  kickoff_time: string;
  status: string;
  result_home: number | null;
  result_away: number | null;
}

const MATCHES: MatchSeed[] = [
  { home_team: 'Switzerland', away_team: 'Italy', round_name: 'Round of 16', kickoff_time: '2024-06-29T18:00:00Z', status: 'finished', result_home: 2, result_away: 0 },
  { home_team: 'Germany', away_team: 'Denmark', round_name: 'Round of 16', kickoff_time: '2024-06-29T21:00:00Z', status: 'finished', result_home: 2, result_away: 0 },
  { home_team: 'England', away_team: 'Slovakia', round_name: 'Round of 16', kickoff_time: '2024-06-30T18:00:00Z', status: 'finished', result_home: 2, result_away: 1 },
  { home_team: 'Spain', away_team: 'Georgia', round_name: 'Round of 16', kickoff_time: '2024-06-30T21:00:00Z', status: 'finished', result_home: 4, result_away: 1 },
  { home_team: 'France', away_team: 'Belgium', round_name: 'Round of 16', kickoff_time: '2024-07-01T18:00:00Z', status: 'finished', result_home: 1, result_away: 0 },
  { home_team: 'Portugal', away_team: 'Slovenia', round_name: 'Round of 16', kickoff_time: '2024-07-01T21:00:00Z', status: 'finished', result_home: 0, result_away: 0 },
  { home_team: 'Romania', away_team: 'Netherlands', round_name: 'Round of 16', kickoff_time: '2024-07-02T18:00:00Z', status: 'finished', result_home: 0, result_away: 3 },
  { home_team: 'Austria', away_team: 'Turkey', round_name: 'Round of 16', kickoff_time: '2024-07-02T21:00:00Z', status: 'finished', result_home: 1, result_away: 2 },
  { home_team: 'Spain', away_team: 'Germany', round_name: 'Quarter-final', kickoff_time: '2024-07-05T18:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'Portugal', away_team: 'France', round_name: 'Quarter-final', kickoff_time: '2024-07-05T21:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'Netherlands', away_team: 'Turkey', round_name: 'Quarter-final', kickoff_time: '2024-07-06T18:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'England', away_team: 'Switzerland', round_name: 'Quarter-final', kickoff_time: '2024-07-06T21:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'Spain', away_team: 'France', round_name: 'Semi-final', kickoff_time: '2024-07-09T21:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'England', away_team: 'Netherlands', round_name: 'Semi-final', kickoff_time: '2024-07-10T21:00:00Z', status: 'upcoming', result_home: null, result_away: null },
  { home_team: 'Spain', away_team: 'England', round_name: 'Final', kickoff_time: '2024-07-14T21:00:00Z', status: 'upcoming', result_home: null, result_away: null },
];

// 每种盘口的选项和默认价格
interface OptionDef { label: string; price: number }

const MARKET_DEFS: Record<string, { description: string; options: OptionDef[] }> = {
  '1x2': {
    description: '胜负平',
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
  cs: {
    description: '精确比分',
    options: [
      { label: '1:0', price: 0.14 },
      { label: '0:0', price: 0.12 },
      { label: '1:1', price: 0.12 },
      { label: '2:0', price: 0.10 },
      { label: '2:1', price: 0.10 },
      { label: '0:1', price: 0.08 },
      { label: '0:2', price: 0.06 },
      { label: '1:2', price: 0.06 },
      { label: '2:2', price: 0.05 },
      { label: '其他', price: 0.17 },
    ],
  },
};

// 部分比赛有自定义赔率（强队 vs 弱队）
const CUSTOM_PRICES: Record<string, Record<string, OptionDef[]>> = {
  // Spain vs Georgia — Spain 大热
  'Spain vs Georgia': {
    '1x2': [
      { label: '主胜', price: 0.85 },
      { label: '平局', price: 0.08 },
      { label: '客胜', price: 0.07 },
    ],
  },
  // Spain vs England (Final) — 均势
  'Spain vs England': {
    '1x2': [
      { label: '主胜', price: 0.40 },
      { label: '平局', price: 0.28 },
      { label: '客胜', price: 0.32 },
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

  console.log('Seeding database...');

  const insertMatch = db.prepare(`
    INSERT INTO matches (home_team, away_team, round_name, kickoff_time, status, result_home, result_away)
    VALUES (@home_team, @away_team, @round_name, @kickoff_time, @status, @result_home, @result_away)
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
      const result = insertMatch.run(match);
      const matchId = result.lastInsertRowid as number;
      const matchKey = `${match.home_team} vs ${match.away_team}`;
      const customPrices = CUSTOM_PRICES[matchKey] || {};

      for (const [marketType, marketDef] of Object.entries(MARKET_DEFS)) {
        const marketResult = insertMarket.run({
          match_id: matchId,
          market_type: marketType,
          description: marketDef.description,
        });
        const marketId = marketResult.lastInsertRowid as number;

        // Use custom prices if available, otherwise defaults
        const options = customPrices[marketType] || marketDef.options;

        options.forEach((opt, index) => {
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

    console.log('Seed data inserted successfully.');
  });

  seedTransaction();
}

// Allow running directly
if (require.main === module) {
  initDB();
  seedData();
}
