/**
 * Core Automation Engine
 *
 * Handles:
 * - syncUpcomingEvents: Pull upcoming matches from The Odds API and auto-create tournaments/matches/markets
 * - updateOdds: Update market option prices from API odds
 * - autoSettle: Auto-settle completed matches and pay out winning bets
 * - runAllAutomation: Run all three in sequence
 */

import { getDb } from './db';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// ─── Sport Definitions ───────────────────────────────────────────────────────

interface SportConfig {
  sportKey: string;
  tournamentName: string;
  tournamentSlug: string;
  icon: string;
  sport: string;         // DB sport column: football / basketball / tennis
  hasDraw: boolean;       // soccer has draw, basketball/tennis don't
  hasOu25: boolean;       // only soccer gets ou25 market
}

const SPORTS: SportConfig[] = [
  // Soccer
  { sportKey: 'soccer_fifa_world_cup', tournamentName: 'FIFA World Cup', tournamentSlug: 'fifa-world-cup', icon: '⚽', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_uefa_champs_league', tournamentName: 'UEFA Champions League', tournamentSlug: 'uefa-champions-league', icon: '🏅', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_euro_championship', tournamentName: 'Euro Championship', tournamentSlug: 'euro-championship', icon: '🇪🇺', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_epl', tournamentName: 'English Premier League', tournamentSlug: 'epl', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_la_liga', tournamentName: 'La Liga', tournamentSlug: 'la-liga', icon: '🇪🇸', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_serie_a', tournamentName: 'Serie A', tournamentSlug: 'serie-a', icon: '🇮🇹', sport: 'football', hasDraw: true, hasOu25: true },
  { sportKey: 'soccer_germany_bundesliga', tournamentName: 'Bundesliga', tournamentSlug: 'bundesliga', icon: '🇩🇪', sport: 'football', hasDraw: true, hasOu25: true },
  // Basketball
  { sportKey: 'basketball_nba', tournamentName: 'NBA', tournamentSlug: 'nba', icon: '🏀', sport: 'basketball', hasDraw: false, hasOu25: false },
  // Tennis
  { sportKey: 'tennis_atp_french_open', tournamentName: 'French Open (ATP)', tournamentSlug: 'french-open-atp', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
  { sportKey: 'tennis_wta_french_open', tournamentName: 'French Open (WTA)', tournamentSlug: 'french-open-wta', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
  { sportKey: 'tennis_atp_wimbledon', tournamentName: 'Wimbledon (ATP)', tournamentSlug: 'wimbledon-atp', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
  { sportKey: 'tennis_wta_wimbledon', tournamentName: 'Wimbledon (WTA)', tournamentSlug: 'wimbledon-wta', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
  { sportKey: 'tennis_atp_us_open', tournamentName: 'US Open (ATP)', tournamentSlug: 'us-open-atp', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
  { sportKey: 'tennis_atp_australian_open', tournamentName: 'Australian Open (ATP)', tournamentSlug: 'australian-open-atp', icon: '🎾', sport: 'tennis', hasDraw: false, hasOu25: false },
];

// ─── API Types ───────────────────────────────────────────────────────────────

interface ApiOutcome {
  name: string;
  price: number; // decimal odds when oddsFormat=decimal
}

interface ApiMarket {
  key: string;
  outcomes: ApiOutcome[];
}

interface ApiBookmaker {
  markets: ApiMarket[];
}

interface ApiMatch {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: ApiBookmaker[];
}

interface ApiScore {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  completed: boolean;
  scores: Array<{
    name: string;
    score: string;
  }> | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decimalToProbability(decimal: number): number {
  if (!decimal || decimal <= 1) return 0.5;
  return 1 / decimal;
}

function clampPrice(p: number): number {
  return Math.max(0.02, Math.min(0.98, Math.round(p * 1000) / 1000));
}

/** Normalize a team name for fuzzy matching */
function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Check if two team names likely refer to the same team */
function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

/** Check if a match already exists (same teams, kickoff within 1 hour) */
function matchExists(
  db: ReturnType<typeof getDb>,
  homeTeam: string,
  awayTeam: string,
  kickoffISO: string
): boolean {
  const kickoffTime = new Date(kickoffISO).getTime();
  const oneHour = 60 * 60 * 1000;

  // First try exact team name match with time window
  const rows = db
    .prepare(
      `SELECT kickoff_time FROM matches
       WHERE ((home_team = ? AND away_team = ?) OR (home_team = ? AND away_team = ?))`
    )
    .all(homeTeam, awayTeam, awayTeam, homeTeam) as Array<{ kickoff_time: string }>;

  for (const row of rows) {
    const rowTime = new Date(row.kickoff_time).getTime();
    if (Math.abs(rowTime - kickoffTime) < oneHour) {
      return true;
    }
  }

  return false;
}

// ─── a) syncUpcomingEvents ───────────────────────────────────────────────────

export async function syncUpcomingEvents(apiKey: string): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const db = getDb();
  const errors: string[] = [];
  let synced = 0;
  let skipped = 0;

  for (const sport of SPORTS) {
    try {
      const url = `${ODDS_API_BASE}/sports/${sport.sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

      if (!res.ok) {
        // 404 = sport not in season or no matches, skip silently
        if (res.status !== 404) {
          errors.push(`${sport.sportKey}: API returned ${res.status}`);
        }
        continue;
      }

      const remaining = res.headers.get('x-requests-remaining');
      console.log(`[automation] ${sport.sportKey}: requests remaining = ${remaining}`);

      const apiMatches = (await res.json()) as ApiMatch[];
      if (!Array.isArray(apiMatches) || apiMatches.length === 0) continue;

      // Ensure tournament exists
      let tournamentId: number | null = null;
      const existingTournament = db
        .prepare('SELECT id FROM tournaments WHERE slug = ?')
        .get(sport.tournamentSlug) as any;

      if (existingTournament) {
        tournamentId = existingTournament.id;
      } else {
        const result = db
          .prepare(
            `INSERT INTO tournaments (name, slug, icon, sport, status, sort_order)
             VALUES (?, ?, ?, ?, 'upcoming', 50)`
          )
          .run(sport.tournamentName, sport.tournamentSlug, sport.icon, sport.sport);
        tournamentId = result.lastInsertRowid as number;
      }

      for (const apiMatch of apiMatches) {
        const homeTeam = apiMatch.home_team;
        const awayTeam = apiMatch.away_team;
        const kickoffTime = apiMatch.commence_time;

        if (!homeTeam || !awayTeam || !kickoffTime) {
          skipped++;
          continue;
        }

        // Skip if match already exists
        if (matchExists(db, homeTeam, awayTeam, kickoffTime)) {
          skipped++;
          continue;
        }

        // Extract odds from first available bookmaker
        let h2hOdds: Map<string, number> = new Map();
        let totalsOver: number | null = null;
        let totalsUnder: number | null = null;

        for (const bookmaker of apiMatch.bookmakers || []) {
          for (const market of bookmaker.markets || []) {
            if (market.key === 'h2h' && h2hOdds.size === 0) {
              for (const outcome of market.outcomes) {
                h2hOdds.set(outcome.name, outcome.price);
              }
            }
            if (market.key === 'totals' && totalsOver === null) {
              const over = market.outcomes.find(o => o.name === 'Over');
              const under = market.outcomes.find(o => o.name === 'Under');
              if (over) totalsOver = over.price;
              if (under) totalsUnder = under.price;
            }
          }
          if (h2hOdds.size > 0) break;
        }

        // Compute default prices
        const homeOdds = h2hOdds.get(homeTeam);
        const awayOdds = h2hOdds.get(awayTeam);
        const drawOdds = h2hOdds.get('Draw');

        const homePrice = homeOdds ? clampPrice(decimalToProbability(homeOdds)) : 0.40;
        const awayPrice = awayOdds ? clampPrice(decimalToProbability(awayOdds)) : 0.35;
        const drawPrice = drawOdds ? clampPrice(decimalToProbability(drawOdds)) : 0.25;

        // Create match + markets in a transaction
        const createMatch = db.transaction(() => {
          const matchResult = db
            .prepare(
              `INSERT INTO matches (tournament_id, home_team, away_team, round_name, kickoff_time, status)
               VALUES (?, ?, ?, '', ?, 'upcoming')`
            )
            .run(tournamentId, homeTeam, awayTeam, kickoffTime);
          const matchId = matchResult.lastInsertRowid as number;

          // 1x2 market
          const x1x2Result = db
            .prepare(
              `INSERT INTO markets (match_id, market_type, description) VALUES (?, '1x2', '胜负')`
            )
            .run(matchId);
          const x1x2Id = x1x2Result.lastInsertRowid as number;

          if (sport.hasDraw) {
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '主胜', ?, 0)`
            ).run(x1x2Id, homePrice);
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '平局', ?, 1)`
            ).run(x1x2Id, drawPrice);
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '客胜', ?, 2)`
            ).run(x1x2Id, awayPrice);
          } else {
            // Basketball / Tennis — no draw
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '主胜', ?, 0)`
            ).run(x1x2Id, homePrice);
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '客胜', ?, 1)`
            ).run(x1x2Id, awayPrice);
          }

          // ou25 market (soccer only)
          if (sport.hasOu25) {
            const ou25Result = db
              .prepare(
                `INSERT INTO markets (match_id, market_type, description) VALUES (?, 'ou25', '大小球 2.5')`
              )
              .run(matchId);
            const ou25Id = ou25Result.lastInsertRowid as number;

            const overPrice = totalsOver ? clampPrice(decimalToProbability(totalsOver)) : 0.55;
            const underPrice = totalsUnder ? clampPrice(decimalToProbability(totalsUnder)) : 0.45;

            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '大于 2.5 球', ?, 0)`
            ).run(ou25Id, overPrice);
            db.prepare(
              `INSERT INTO market_options (market_id, label, price, sort_order) VALUES (?, '小于等于 2.5 球', ?, 1)`
            ).run(ou25Id, underPrice);
          }
        });

        createMatch();
        synced++;
      }
    } catch (err: any) {
      errors.push(`${sport.sportKey}: ${err.message || String(err)}`);
    }
  }

  return { synced, skipped, errors };
}

// ─── b) updateOdds ───────────────────────────────────────────────────────────

export async function updateOdds(apiKey: string): Promise<{
  updated: number;
  errors: string[];
}> {
  const db = getDb();
  const errors: string[] = [];
  let updated = 0;

  // Get all upcoming matches
  const upcomingMatches = db
    .prepare(
      `SELECT m.id, m.home_team, m.away_team, m.kickoff_time,
              t.sport, t.slug as tournament_slug
       FROM matches m
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status = 'upcoming'`
    )
    .all() as Array<{
    id: number;
    home_team: string;
    away_team: string;
    kickoff_time: string;
    sport: string | null;
    tournament_slug: string | null;
  }>;

  if (upcomingMatches.length === 0) {
    return { updated: 0, errors: ['No upcoming matches to update'] };
  }

  // Determine which sport keys to query based on existing matches
  const sportKeysToQuery = new Set<string>();
  for (const match of upcomingMatches) {
    const sport = match.sport || 'football';
    // Find matching sport configs
    for (const s of SPORTS) {
      if (s.sport === sport) {
        sportKeysToQuery.add(s.sportKey);
      }
    }
  }

  // Also add common fallbacks
  sportKeysToQuery.add('upcoming');

  // Fetch odds from all relevant sport keys
  const allApiMatches: ApiMatch[] = [];
  for (const sportKey of Array.from(sportKeysToQuery)) {
    try {
      const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          allApiMatches.push(...data);
        }
      }
    } catch {
      // skip
    }
  }

  if (allApiMatches.length === 0) {
    return { updated: 0, errors: ['No odds data available from API'] };
  }

  // Build lookup: normalized home+away → odds data
  const oddsLookup = new Map<string, {
    h2h: Map<string, number>;
    totalsOver: number | null;
    totalsUnder: number | null;
  }>();

  for (const apiMatch of allApiMatches) {
    const h2hOdds = new Map<string, number>();
    let totalsOver: number | null = null;
    let totalsUnder: number | null = null;

    for (const bookmaker of apiMatch.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key === 'h2h' && h2hOdds.size === 0) {
          for (const outcome of market.outcomes) {
            h2hOdds.set(outcome.name, outcome.price);
          }
        }
        if (market.key === 'totals' && totalsOver === null) {
          const over = market.outcomes.find(o => o.name === 'Over');
          const under = market.outcomes.find(o => o.name === 'Under');
          if (over) totalsOver = over.price;
          if (under) totalsUnder = under.price;
        }
      }
      if (h2hOdds.size > 0) break;
    }

    // Key by normalized home|away
    const key = `${normalizeTeam(apiMatch.home_team)}|${normalizeTeam(apiMatch.away_team)}`;
    oddsLookup.set(key, { h2h: h2hOdds, totalsOver, totalsUnder });

    // Also store reverse
    const revKey = `${normalizeTeam(apiMatch.away_team)}|${normalizeTeam(apiMatch.home_team)}`;
    if (!oddsLookup.has(revKey)) {
      oddsLookup.set(revKey, { h2h: h2hOdds, totalsOver, totalsUnder });
    }
  }

  // Update each match
  for (const match of upcomingMatches) {
    const key = `${normalizeTeam(match.home_team)}|${normalizeTeam(match.away_team)}`;
    let odds = oddsLookup.get(key);

    // Fallback: fuzzy search through all API matches
    if (!odds) {
      for (const [lookupKey, lookupData] of Array.from(oddsLookup.entries())) {
        const parts = lookupKey.split('|');
        if (parts.length === 2) {
          const [a, b] = parts;
          const na = normalizeTeam(match.home_team);
          const nb = normalizeTeam(match.away_team);
          if (
            (teamsMatch(match.home_team, a.replace(/[^a-z0-9]/g, '')) && teamsMatch(match.away_team, b.replace(/[^a-z0-9]/g, ''))) ||
            (teamsMatch(match.home_team, b.replace(/[^a-z0-9]/g, '')) && teamsMatch(match.away_team, a.replace(/[^a-z0-9]/g, '')))
          ) {
            odds = lookupData;
            break;
          }
        }
      }
    }

    if (!odds || odds.h2h.size === 0) {
      errors.push(`${match.home_team} vs ${match.away_team}: no odds found`);
      continue;
    }

    // Update 1x2 market
    const x1x2Market = db
      .prepare(`SELECT id FROM markets WHERE match_id = ? AND market_type = '1x2'`)
      .get(match.id) as any;

    if (x1x2Market) {
      const options = db
        .prepare(`SELECT id, label FROM market_options WHERE market_id = ?`)
        .all(x1x2Market.id) as Array<any>;

      for (const opt of options) {
        let decimalOdds: number | undefined;
        if (opt.label === '主胜') {
          decimalOdds = odds.h2h.get(match.home_team);
        } else if (opt.label === '客胜') {
          decimalOdds = odds.h2h.get(match.away_team);
        } else if (opt.label === '平局') {
          decimalOdds = odds.h2h.get('Draw');
        }

        if (decimalOdds !== undefined) {
          const price = clampPrice(decimalToProbability(decimalOdds));
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(price, opt.id);
          updated++;
        }
      }
    }

    // Update ou25 market
    const ou25Market = db
      .prepare(`SELECT id FROM markets WHERE match_id = ? AND market_type = 'ou25'`)
      .get(match.id) as any;

    if (ou25Market && (odds.totalsOver !== null || odds.totalsUnder !== null)) {
      const options = db
        .prepare(`SELECT id, label FROM market_options WHERE market_id = ?`)
        .all(ou25Market.id) as Array<any>;

      for (const opt of options) {
        let decimalOdds: number | null = null;
        if (opt.label === '大于 2.5 球') {
          decimalOdds = odds.totalsOver;
        } else if (opt.label === '小于等于 2.5 球') {
          decimalOdds = odds.totalsUnder;
        }

        if (decimalOdds !== null) {
          const price = clampPrice(decimalToProbability(decimalOdds));
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(price, opt.id);
          updated++;
        }
      }
    }
  }

  return { updated, errors };
}

// ─── c) autoSettle ───────────────────────────────────────────────────────────

export async function autoSettle(apiKey: string): Promise<{
  settled: number;
  skipped: number;
  errors: string[];
  details: Array<{
    matchId: number;
    home: string;
    away: string;
    resultHome: number;
    resultAway: number;
    payouts: number;
  }>;
}> {
  const db = getDb();
  const errors: string[] = [];
  const details: Array<{
    matchId: number;
    home: string;
    away: string;
    resultHome: number;
    resultAway: number;
    payouts: number;
  }> = [];
  let settled = 0;
  let skipped = 0;

  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;

  // Find matches that are upcoming/live and started at least 2 hours ago
  const candidates = db
    .prepare(
      `SELECT m.id, m.home_team, m.away_team, m.kickoff_time, m.tournament_id,
              t.sport
       FROM matches m
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status IN ('upcoming', 'live')`
    )
    .all() as Array<{
    id: number;
    home_team: string;
    away_team: string;
    kickoff_time: string;
    tournament_id: number | null;
    sport: string | null;
  }>;

  // Filter to those that started >2h ago
  const matchesToSettle = candidates.filter(m => {
    const kickoff = new Date(m.kickoff_time).getTime();
    return kickoff < twoHoursAgo;
  });

  if (matchesToSettle.length === 0) {
    return { settled: 0, skipped: 0, errors: ['No matches eligible for settlement'], details: [] };
  }

  // Determine which sport keys to check for scores
  const sportKeysForScores = new Set<string>();
  for (const match of matchesToSettle) {
    const sport = match.sport || 'football';
    for (const s of SPORTS) {
      if (s.sport === sport) {
        sportKeysForScores.add(s.sportKey);
      }
    }
  }

  // Fetch scores from API
  const allScores: ApiScore[] = [];
  for (const sportKey of Array.from(sportKeysForScores)) {
    try {
      const url = `${ODDS_API_BASE}/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=3`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          allScores.push(...data);
        }
      }
    } catch {
      // skip
    }
  }

  // Build score lookup
  const scoreLookup = new Map<string, ApiScore>();
  for (const score of allScores) {
    if (!score.completed) continue;
    const key = `${normalizeTeam(score.home_team)}|${normalizeTeam(score.away_team)}`;
    scoreLookup.set(key, score);
    // reverse
    const revKey = `${normalizeTeam(score.away_team)}|${normalizeTeam(score.home_team)}`;
    if (!scoreLookup.has(revKey)) {
      scoreLookup.set(revKey, score);
    }
  }

  for (const match of matchesToSettle) {
    try {
      const key = `${normalizeTeam(match.home_team)}|${normalizeTeam(match.away_team)}`;
      let scoreData = scoreLookup.get(key);

      // Fallback fuzzy match
      if (!scoreData) {
        for (const [sKey, sData] of scoreLookup.entries()) {
          const parts = sKey.split('|');
          if (parts.length === 2) {
            if (teamsMatch(match.home_team, parts[0]) && teamsMatch(match.away_team, parts[1])) {
              scoreData = sData;
              break;
            }
            if (teamsMatch(match.home_team, parts[1]) && teamsMatch(match.away_team, parts[0])) {
              scoreData = sData;
              break;
            }
          }
        }
      }

      if (!scoreData || !scoreData.completed) {
        skipped++;
        continue;
      }

      if (!scoreData.scores || scoreData.scores.length < 2) {
        skipped++;
        continue;
      }

      // Parse scores — API returns array of { name, score }
      const homeScoreEntry = scoreData.scores.find(
        (s) => teamsMatch(s.name, match.home_team)
      );
      const awayScoreEntry = scoreData.scores.find(
        (s) => teamsMatch(s.name, match.away_team)
      );

      if (!homeScoreEntry || !awayScoreEntry) {
        skipped++;
        continue;
      }

      const home = parseInt(homeScoreEntry.score, 10);
      const away = parseInt(awayScoreEntry.score, 10);

      if (isNaN(home) || isNaN(away)) {
        skipped++;
        continue;
      }

      // ─── Settle the match (mirrors admin settle logic exactly) ──────────

      const markets = db
        .prepare('SELECT * FROM markets WHERE match_id = ?')
        .all(match.id) as Array<any>;

      let totalPayouts = 0;

      const settleMatch = db.transaction(() => {
        // Update match status and result
        db.prepare(
          'UPDATE matches SET status = ?, result_home = ?, result_away = ? WHERE id = ?'
        ).run('finished', home, away, match.id);

        for (const market of markets) {
          let winningLabel: string;

          switch (market.market_type) {
            case '1x2':
              if (home > away) {
                winningLabel = '主胜';
              } else if (home < away) {
                winningLabel = '客胜';
              } else {
                winningLabel = '平局';
              }
              break;

            case 'ou25':
              if (home + away > 2.5) {
                winningLabel = '大于 2.5 球';
              } else {
                winningLabel = '小于等于 2.5 球';
              }
              break;

            case 'cs': {
              const scoreStr = `${home}:${away}`;
              const validScores = [
                '0:0', '1:0', '0:1', '1:1', '2:0', '0:2', '2:1', '1:2', '2:2',
              ];
              if (validScores.includes(scoreStr)) {
                winningLabel = scoreStr;
              } else {
                winningLabel = '其他';
              }
              break;
            }

            default:
              continue;
          }

          // Mark market as settled
          db.prepare(
            'UPDATE markets SET settled = 1, winning_option = ? WHERE id = ?'
          ).run(winningLabel, market.id);

          // Get the winning option
          const winningOption = db
            .prepare('SELECT id FROM market_options WHERE market_id = ? AND label = ?')
            .get(market.id, winningLabel) as any;

          if (winningOption) {
            // Get all bets on the winning option
            const winningBets = db
              .prepare('SELECT id, user_id, shares FROM bets WHERE market_option_id = ?')
              .all(winningOption.id) as Array<any>;

            for (const bet of winningBets) {
              const payout = bet.shares; // shares × $1
              db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
                payout,
                bet.user_id
              );
              db.prepare(
                `INSERT INTO transactions (user_id, type, amount, ref_id) VALUES (?, ?, ?, ?)`
              ).run(bet.user_id, 'payout', payout, bet.id);
              totalPayouts++;
            }
          }
        }
      });

      settleMatch();
      settled++;

      details.push({
        matchId: match.id,
        home: match.home_team,
        away: match.away_team,
        resultHome: home,
        resultAway: away,
        payouts: totalPayouts,
      });
    } catch (err: any) {
      errors.push(`Match ${match.id} (${match.home_team} vs ${match.away_team}): ${err.message || String(err)}`);
    }
  }

  return { settled, skipped, errors, details };
}

// ─── d) runAllAutomation ─────────────────────────────────────────────────────

export async function runAllAutomation(apiKey: string): Promise<{
  sync: { synced: number; skipped: number; errors: string[] };
  odds: { updated: number; errors: string[] };
  settle: { settled: number; skipped: number; errors: string[]; details: any[] };
  timestamp: string;
}> {
  console.log('[automation] Starting full automation run...');

  console.log('[automation] Step 1: syncUpcomingEvents');
  const syncResult = await syncUpcomingEvents(apiKey);
  console.log(`[automation]   synced=${syncResult.synced}, skipped=${syncResult.skipped}, errors=${syncResult.errors.length}`);

  console.log('[automation] Step 2: updateOdds');
  const oddsResult = await updateOdds(apiKey);
  console.log(`[automation]   updated=${oddsResult.updated}, errors=${oddsResult.errors.length}`);

  console.log('[automation] Step 3: autoSettle');
  const settleResult = await autoSettle(apiKey);
  console.log(`[automation]   settled=${settleResult.settled}, skipped=${settleResult.skipped}, errors=${settleResult.errors.length}`);

  console.log('[automation] All done.');

  return {
    sync: syncResult,
    odds: oddsResult,
    settle: settleResult,
    timestamp: new Date().toISOString(),
  };
}
