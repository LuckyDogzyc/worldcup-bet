import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function GET() {
  ensureInitialized();
  try {
    const db = getDb();

    const matches = db
      .prepare(
        `SELECT id, home_team, away_team, round_name, kickoff_time, status, result_home, result_away
         FROM matches ORDER BY kickoff_time ASC`
      )
      .all() as Array<{
      id: number;
      home_team: string;
      away_team: string;
      round_name: string;
      kickoff_time: string;
      status: string;
      result_home: number | null;
      result_away: number | null;
    }>;

    const result = matches.map((match) => {
      const markets = db
        .prepare(
          `SELECT id, match_id, market_type, description, settled, winning_option
           FROM markets WHERE match_id = ?`
        )
        .all(match.id) as Array<{
        id: number;
        match_id: number;
        market_type: string;
        description: string;
        settled: number;
        winning_option: string | null;
      }>;

      const marketsWithOptions = markets.map((market) => {
        const options = db
          .prepare(
            `SELECT id, market_id, label, price, sort_order FROM market_options WHERE market_id = ? ORDER BY sort_order`
          )
          .all(market.id) as Array<{
          id: number;
          market_id: number;
          label: string;
          price: number;
          sort_order: number;
        }>;

        return {
          ...market,
          options,
        };
      });

      return {
        ...match,
        markets: marketsWithOptions,
      };
    });

    return NextResponse.json({ matches: result });
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: '获取比赛数据失败' },
      { status: 500 }
    );
  }
}
