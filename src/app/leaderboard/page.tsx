'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: number;
  username: string;
  balance: number;
  unsettled_bets_value: number;
  total_assets: number;
}

export default function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null),
    ]).then(([lbData, userData]) => {
      setData(lbData.leaderboard || []);
      if (userData?.user?.id) setCurrentUserId(userData.user.id);
    }).catch(() => {
      setError('加载失败，请刷新重试');
    }).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const rowColors = [
    'bg-gold/15 border-gold/30',
    'bg-gray-400/10 border-gray-400/20',
    'bg-amber-700/10 border-amber-700/20',
  ];

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-bounce">🏆</div>
        <p className="text-white/50">加载排行榜...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-2">
          🏆 排行榜
        </h1>
        <p className="text-white/40 text-sm mt-1">谁是竞猜之王？</p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-white/40">暂无数据</p>
          <p className="text-white/20 text-sm mt-1">等待玩家加入</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {data.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-8">
              {/* 2nd place */}
              <div className="text-center">
                <div className="text-3xl mb-1">🥈</div>
                <Link href={'/players/' + data[1].id} className="glass-card block px-4 pt-3 pb-4 border-gray-400/20 w-28 hover:border-gray-300/40 hover:bg-white/10 transition-all">
                  <p className="text-white font-bold text-sm truncate">{data[1].username}</p>
                  <p className="text-white/50 text-xs mt-1">${data[1].total_assets.toFixed(0)}</p>
                  <p className="text-white/25 text-[10px] mt-1">查看档案</p>
                </Link>
              </div>
              {/* 1st place */}
              <div className="text-center">
                <div className="text-4xl mb-1">🥇</div>
                <Link href={'/players/' + data[0].id} className="glass-card block px-5 pt-4 pb-5 border-gold/30 w-32 hover:border-gold/50 hover:bg-gold/10 transition-all">
                  <p className="text-gold font-bold text-base truncate">{data[0].username}</p>
                  <p className="text-gold/70 text-sm mt-1 font-bold">${data[0].total_assets.toFixed(0)}</p>
                  <p className="text-gold/35 text-[10px] mt-1">查看档案</p>
                </Link>
              </div>
              {/* 3rd place */}
              <div className="text-center">
                <div className="text-3xl mb-1">🥉</div>
                <Link href={'/players/' + data[2].id} className="glass-card block px-4 pt-2 pb-3 border-amber-700/20 w-28 hover:border-amber-500/40 hover:bg-white/10 transition-all">
                  <p className="text-white font-bold text-sm truncate">{data[2].username}</p>
                  <p className="text-white/50 text-xs mt-1">${data[2].total_assets.toFixed(0)}</p>
                  <p className="text-white/25 text-[10px] mt-1">查看档案</p>
                </Link>
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/40 font-medium px-4 py-3 w-16">排名</th>
                    <th className="text-left text-white/40 font-medium px-4 py-3">用户名</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3">余额</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3 hidden sm:table-cell">持仓市值</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3">总资产</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, idx) => {
                    const isMe = entry.id === currentUserId;
                    const topStyle = idx < 3 ? rowColors[idx] : '';
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                          isMe ? 'bg-blue-500/15 border-blue-500/30' : topStyle
                        }`}
                      >
                        <td className="px-4 py-3">
                          {idx < 3 ? (
                            <span className="text-lg">{medals[idx]}</span>
                          ) : (
                            <span className="text-white/40">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={'/players/' + entry.id} className={`font-medium hover:underline underline-offset-4 ${isMe ? 'text-gold' : 'text-white'}`}>
                            {entry.username}
                            {isMe && <span className="text-xs text-gold/60 ml-1">(我)</span>}
                            <span className="text-[10px] text-white/25 ml-2">查看</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-white/70">${entry.balance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-white/50 hidden sm:table-cell">
                          ${entry.unsettled_bets_value.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          ${entry.total_assets.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
