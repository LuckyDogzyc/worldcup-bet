'use client';

import { useState, useEffect, useCallback } from 'react';
import BetModal from './BetModal';
import { priceToOdds, oddsColor, formatTime, getMarketLabel } from '@/lib/utils';

interface Tournament {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sport: string;
}

interface Option {
  id: number;
  label: string;
  price: number;
}

interface Market {
  id: number;
  market_type: string;
  description: string;
  settled: number;
  winning_option: string | null;
  options: Option[];
}

interface Match {
  id: number;
  tournament_id: number;
  home_team: string;
  away_team: string;
  round_name: string;
  kickoff_time: string;
  status: string;
  result_home: number | null;
  result_away: number | null;
  markets: Market[];
}

interface Bet {
  id: number;
  market: { id: number };
}

interface BetModalState {
  match: Match;
  market: Market;
  option: Option;
}

export default function HomeClient({ username, balance: initialBalance }: { username: string; balance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [betMarketIds, setBetMarketIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<BetModalState | null>(null);
  const [activeTournament, setActiveTournament] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [matchRes, betRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/bets'),
      ]);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setTournaments(data.tournaments || []);
        setMatches(data.matches || []);
      }
      if (betRes.ok) {
        const data = await betRes.json();
        const ids = new Set<number>((data.bets || []).map((b: Bet) => b.market.id));
        setBetMarketIds(ids);
      }
      setLastRefresh(new Date());
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/matches')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.matches) {
            setMatches(data.matches);
            if (data.tournaments) setTournaments(data.tournaments);
            setLastRefresh(new Date());
          }
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Filter by tournament
  const filtered = activeTournament
    ? matches.filter(m => m.tournament_id === activeTournament)
    : matches;

  // Separate into categories
  const matchBets = filtered.filter(m => m.away_team !== '其他' && m.status !== 'finished');
  const outrightBets = filtered.filter(m => m.away_team === '其他' && m.status !== 'finished');
  const finished = filtered.filter(m => m.status === 'finished');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">⚽</div>
          <p className="text-white/50">加载比赛中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetchData} className="btn-primary">重新加载</button>
      </div>
    );
  }

  // ─── 对阵盘：卡片直接显示赔率 ────────────────────────────────────────

  const renderMatchCard = (match: Match) => {
    const isFinished = match.status === 'finished';
    const tournament = tournaments.find(t => t.id === match.tournament_id);
    // 取第一个1x2盘口
    const mainMarket = match.markets.find(mk => mk.market_type === '1x2');
    const spreadMarket = match.markets.find(mk => mk.market_type === 'spread');
    const ouMarket = match.markets.find(mk => mk.market_type === 'ou25');

    return (
      <div key={match.id} className="glass-card overflow-hidden">
        {/* 顶部赛事信息栏 */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <span className="text-[11px] text-white/40">
            {tournament?.icon} {tournament?.name}
            {match.round_name && ` · ${match.round_name}`}
          </span>
          <span className="text-[11px] text-white/30">{formatTime(match.kickoff_time)}</span>
        </div>

        {/* 队伍 + 赔率 */}
        <div className="p-3 sm:p-4">
          {isFinished && match.result_home !== null ? (
            <div className="flex items-center justify-center gap-4 py-2">
              <span className="text-white font-bold text-sm">{match.home_team}</span>
              <span className="text-2xl font-black text-white">{match.result_home} : {match.result_away}</span>
              <span className="text-white font-bold text-sm">{match.away_team}</span>
            </div>
          ) : (
            <>
              {/* 主盘口：3列赔率 */}
              {mainMarket && (
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-2">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm sm:text-base">{match.home_team}</p>
                  </div>
                  <div className="text-center px-2">
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gold/15 text-gold/70 border border-gold/20">VS</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm sm:text-base">{match.away_team}</p>
                  </div>
                </div>
              )}

              {/* 赔率按钮行 */}
              <div className="space-y-2">
                {mainMarket && renderOddsRow('胜负', mainMarket, match)}
                {spreadMarket && renderOddsRow('让球', spreadMarket, match)}
                {ouMarket && renderOddsRow('大小2.5', ouMarket, match)}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderOddsRow = (label: string, market: Market, match: Match) => {
    const hasBet = betMarketIds.has(market.id);
    const cols = market.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-white/30 font-medium">{label}</span>
          {hasBet && <span className="text-[9px] text-gold/60">已下注✓</span>}
        </div>
        <div className={`grid ${cols} gap-1.5`}>
          {market.options.map(opt => {
            const odds = priceToOdds(opt.price);
            return (
              <button
                key={opt.id}
                onClick={() => !hasBet && setModal({ match, market, option: opt })}
                disabled={hasBet}
                className={`btn-price py-1.5 px-2 ${hasBet ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-[11px] text-white/50 leading-tight">{opt.label}</div>
                <div className={`text-sm font-bold ${oddsColor(opt.price)}`}>{odds}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── 冠军盘：赔率表格（Polymarket 风格） ────────────────────────────────

  const renderOutrightSection = () => {
    if (outrightBets.length === 0) return null;

    // 按 round_name 分组（同一冠军盘口归为一组）
    const groups: Record<string, { roundName: string; tournament: Tournament | undefined; items: Match[] }> = {};
    for (const m of outrightBets) {
      const key = `${m.tournament_id}_${m.round_name}`;
      if (!groups[key]) {
        const tournament = tournaments.find(t => t.id === m.tournament_id);
        groups[key] = { roundName: m.round_name, tournament, items: [] };
      }
      groups[key].items.push(m);
    }

    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-xl">🏆</span>
          冠军盘口
          <span className="text-xs text-white/30 font-normal ml-1">实时赔率来自 Polymarket</span>
        </h2>
        <div className="space-y-4">
          {Object.values(groups).map(group => renderOutrightGroup(group))}
        </div>
      </div>
    );
  };

  const renderOutrightGroup = (group: { roundName: string; tournament: Tournament | undefined; items: Match[] }) => {
    // 按价格排序（热门在前）
    const sorted = [...group.items].sort((a, b) => {
      const priceA = a.markets[0]?.options[0]?.price ?? 0;
      const priceB = b.markets[0]?.options[0]?.price ?? 0;
      return priceB - priceA;
    });

    return (
      <div key={group.roundName} className="glass-card overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2">
            {group.tournament && <span className="text-sm">{group.tournament.icon}</span>}
            <span className="text-sm font-bold text-white">{group.roundName}</span>
          </div>
          <span className="text-[10px] text-white/30">
            {sorted.length} 支队伍
          </span>
        </div>

        {/* 赔率列表 */}
        <div className="divide-y divide-white/5">
          {sorted.map(match => {
            const market = match.markets[0];
            if (!market) return null;
            const yesOpt = market.options.find(o => o.label === '是');
            const noOpt = market.options.find(o => o.label === '否');
            if (!yesOpt) return null;

            const hasBet = betMarketIds.has(market.id);
            const yesOdds = priceToOdds(yesOpt.price);
            const noOdds = noOpt ? priceToOdds(noOpt.price) : '-';

            return (
              <div
                key={match.id}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                {/* 队伍名 */}
                <span className="text-white font-medium text-sm min-w-[60px]">{match.home_team}</span>

                {/* 赔率按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => !hasBet && setModal({
                      match,
                      market,
                      option: yesOpt
                    })}
                    disabled={hasBet}
                    className={`btn-price py-1 px-3 min-w-[56px] ${hasBet ? 'opacity-50' : ''}`}
                  >
                    <div className="text-[10px] text-white/40">赢</div>
                    <div className={`text-sm font-bold ${oddsColor(yesOpt.price)}`}>{yesOdds}</div>
                  </button>
                  <button
                    onClick={() => !hasBet && noOpt && setModal({
                      match,
                      market,
                      option: noOpt
                    })}
                    disabled={hasBet}
                    className={`btn-price py-1 px-3 min-w-[56px] ${hasBet ? 'opacity-50' : ''}`}
                  >
                    <div className="text-[10px] text-white/40">不赢</div>
                    <div className={`text-xs font-bold text-white/40`}>{noOdds}</div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── 已结束比赛 ──────────────────────────────────────────────────────────

  const renderFinishedSection = () => {
    if (finished.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white/50 mb-4 flex items-center gap-2">
          <span className="text-xl">✅</span>
          已结束
          <span className="text-sm text-white/30 font-normal ml-1">({finished.length})</span>
        </h2>
        <div className="space-y-2">
          {finished.map(match => {
            const tournament = tournaments.find(t => t.id === match.tournament_id);
            return (
              <div key={match.id} className="glass-card px-4 py-2.5 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`font-semibold ${(match.result_home ?? 0) > (match.result_away ?? 0) ? 'text-gold' : 'text-white/60'}`}>
                      {match.home_team}
                    </span>
                    <span className="text-white/80 font-black text-base px-1">
                      {match.result_home ?? '-'} - {match.result_away ?? '-'}
                    </span>
                    <span className={`font-semibold ${(match.result_away ?? 0) > (match.result_home ?? 0) ? 'text-gold' : 'text-white/60'}`}>
                      {match.away_team}
                    </span>
                    {match.result_home === match.result_away && match.result_home !== null && (
                      <span className="text-[10px] text-white/30 ml-1">平局</span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0 ml-2">
                    {tournament?.icon} {match.round_name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tab 栏 ────────────────────────────────────────────────────────────

  const tournamentCounts: Record<number, { total: number }> = {};
  for (const m of matches) {
    if (!tournamentCounts[m.tournament_id]) tournamentCounts[m.tournament_id] = { total: 0 };
    tournamentCounts[m.tournament_id].total++;
  }

  const tabBase = 'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap';
  const tabActive = 'bg-gold/20 text-gold border border-gold/30';
  const tabInactive = 'bg-white/5 text-white/50 hover:bg-white/10';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Welcome banner - compact */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            🏟️ 体育竞猜
          </h1>
          <p className="text-white/30 text-xs mt-0.5">
            欢迎，<span className="text-white/60">{username}</span> · 赔率来自 Polymarket
          </p>
        </div>
        <div className="glass-card px-4 py-2 text-right">
          <div className="text-[10px] text-white/30 uppercase tracking-wider">余额</div>
          <div className="text-lg font-black text-gold">${balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Tournament tabs */}
      {tournaments.length > 0 && (
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveTournament(null)}
            className={`${tabBase} ${activeTournament === null ? tabActive : tabInactive}`}
          >
            全部 <span className="opacity-60">({matches.length})</span>
          </button>
          {tournaments.map(t => {
            const counts = tournamentCounts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setActiveTournament(activeTournament === t.id ? null : t.id)}
                className={`${tabBase} ${activeTournament === t.id ? tabActive : tabInactive}`}
              >
                {t.icon} {t.name} <span className="opacity-60">({counts?.total ?? 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 冠军盘口（赔率表） */}
      {renderOutrightSection()}

      {/* 对阵盘（卡片） */}
      {matchBets.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-xl">⚽</span>
            比赛投注
            <span className="text-sm text-white/30 font-normal ml-1">({matchBets.length})</span>
          </h2>
          <div className="space-y-3">
            {matchBets.map(match => renderMatchCard(match))}
          </div>
        </div>
      )}

      {/* 已结束 */}
      {renderFinishedSection()}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏟️</div>
          <p className="text-white/40">暂无比赛数据</p>
          <p className="text-white/20 text-sm mt-1">赔率同步启动后将自动拉取赛事</p>
        </div>
      )}

      <div className="text-center text-white/20 text-[10px] mt-6 pb-4">
        赔率每分钟自动刷新 · 上次更新 {lastRefresh.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
      </div>

      {modal && (
        <BetModal
          matchInfo={{ home_team: modal.match.home_team, away_team: modal.match.away_team, kickoff_time: modal.match.kickoff_time }}
          marketInfo={{ type: modal.market.market_type, description: modal.market.description }}
          option={modal.option}
          balance={balance}
          onClose={() => setModal(null)}
          onSuccess={(newBalance) => {
            setBalance(newBalance);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
