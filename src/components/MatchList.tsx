'use client';

import { useState, useEffect, useCallback } from 'react';
import BetModal from './BetModal';

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

export default function MatchList({ balance, onBalanceChange }: { balance: number; onBalanceChange: (b: number) => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [betMarketIds, setBetMarketIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<BetModalState | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 拉取数据
  const fetchData = useCallback(async () => {
    try {
      const [matchRes, betRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/bets'),
      ]);

      if (matchRes.ok) {
        const data = await matchRes.json();
        setMatches(data.matches || []);
      }

      if (betRes.ok) {
        const data = await betRes.json();
        const ids = new Set<number>((data.bets || []).map((b: Bet) => b.market.id));
        setBetMarketIds(ids);
      }
      setLastRefresh(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // 初次加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 每 60 秒自动刷新价格（实时同步赔率）
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/matches')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.matches) {
            setMatches(data.matches);
            setLastRefresh(new Date());
          }
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const upcoming = matches.filter((m) => m.status === 'upcoming');
  const live = matches.filter((m) => m.status === 'live');
  const finished = matches.filter((m) => m.status === 'finished');

  const formatTime = (iso: string) => {
    const d = new Date(iso + 'Z');
    return d.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMarketLabel = (type: string) => {
    switch (type) {
      case '1x2': return '1x2 胜负';
      case 'ou25': return '大小球';
      case 'cs': return '正确比分';
      default: return type;
    }
  };

  const getMarketEmoji = (type: string) => {
    switch (type) {
      case '1x2': return '⚽';
      case 'ou25': return '📈';
      case 'cs': return '🎯';
      default: return '🎰';
    }
  };

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

  const renderSection = (title: string, emoji: string, matchList: Match[]) => {
    if (matchList.length === 0) return null;
    return (
      <div key={title} className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          {title}
          <span className="text-sm text-white/40 font-normal ml-1">({matchList.length})</span>
        </h2>
        <div className="space-y-4">
          {matchList.map((match) => renderMatchCard(match))}
        </div>
      </div>
    );
  };

  const renderMatchCard = (match: Match) => {
    const isExpanded = expandedMatch === match.id;
    const isFinished = match.status === 'finished';

    return (
      <div key={match.id} className="glass-card overflow-hidden transition-all duration-200">
        {/* Match header */}
        <button
          onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
          className="w-full px-4 py-3 sm:px-5 sm:py-4 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
              {/* Home team */}
              <div className="text-right flex-1 min-w-0">
                <p className="text-white font-bold text-sm sm:text-base truncate">{match.home_team}</p>
              </div>

              {/* VS / Score */}
              <div className="shrink-0 text-center px-2">
                {isFinished && match.result_home !== null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-white">{match.result_home}</span>
                    <span className="text-white/40 text-lg">:</span>
                    <span className="text-2xl sm:text-3xl font-black text-white">{match.result_away}</span>
                  </div>
                ) : (
                  <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                    match.status === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/50'
                  }`}>
                    {match.status === 'live' ? '● LIVE' : 'VS'}
                  </div>
                )}
              </div>

              {/* Away team */}
              <div className="text-left flex-1 min-w-0">
                <p className="text-white font-bold text-sm sm:text-base truncate">{match.away_team}</p>
              </div>
            </div>

            <div className="ml-3 shrink-0 flex flex-col items-end gap-1">
              {match.round_name && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-medium">
                  {match.round_name}
                </span>
              )}
              <span className="text-[10px] text-white/30">{formatTime(match.kickoff_time)}</span>
              <svg className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Expanded markets */}
        {isExpanded && (
          <div className="border-t border-white/10 animate-fade-in">
            {match.status !== 'upcoming' ? (
              <div className="p-4 text-center text-white/40 text-sm">
                {isFinished ? '比赛已结束' : '比赛进行中，投注已关闭'}
              </div>
            ) : (
              <div className="p-3 sm:p-4 space-y-3">
                {match.markets.map((market) => renderMarket(match, market))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMarket = (match: Match, market: Market) => {
    const hasBet = betMarketIds.has(market.id);

    return (
      <div key={market.id} className="bg-white/[0.03] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{getMarketEmoji(market.market_type)}</span>
            <span className="text-xs font-medium text-white/60">{getMarketLabel(market.market_type)}</span>
          </div>
          {hasBet ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold">已下注 ✓</span>
          ) : (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              实时赔率
            </span>
          )}
        </div>

        {/* Options grid */}
        {market.market_type === 'cs' ? (
          <div className="grid grid-cols-5 gap-1.5">
            {market.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => !hasBet && setModal({ match, market, option: opt })}
                disabled={hasBet}
                className={`btn-price py-2 px-1 ${hasBet ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[10px] text-gold">${opt.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className={`grid gap-1.5 ${market.options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {market.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => !hasBet && setModal({ match, market, option: opt })}
                disabled={hasBet}
                className={`btn-price py-2.5 ${hasBet ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-xs text-gold mt-0.5">${opt.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {renderSection('即将开始', '🕐', upcoming)}
      {renderSection('进行中', '🔴', live)}
      {renderSection('已结束', '✅', finished)}

      {matches.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏟️</div>
          <p className="text-white/40">暂无比赛数据</p>
          <p className="text-white/20 text-sm mt-1">等待管理员添加比赛</p>
        </div>
      )}

      {/* Price refresh indicator */}
      <div className="text-center text-white/20 text-[10px] mt-8">
        赔率每分钟自动刷新 · 上次更新 {lastRefresh.toLocaleTimeString('zh-CN')}
      </div>

      {/* Bet Modal */}
      {modal && (
        <BetModal
          matchInfo={{ home_team: modal.match.home_team, away_team: modal.match.away_team }}
          marketInfo={{ type: modal.market.market_type, description: modal.market.description }}
          option={modal.option}
          balance={balance}
          onClose={() => setModal(null)}
          onSuccess={(newBalance) => {
            onBalanceChange(newBalance);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
