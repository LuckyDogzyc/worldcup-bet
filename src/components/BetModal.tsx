'use client';

import { useState, useEffect, useRef } from 'react';
import { priceToOdds as calcOdds, getMarketLabel, formatTime } from '@/lib/utils';

interface BetModalProps {
  matchInfo: { home_team: string; away_team: string; kickoff_time?: string };
  marketInfo: { type: string; description: string };
  option: { id: number; label: string; price: number };
  balance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function BetModal({ matchInfo, marketInfo, option, balance, onClose, onSuccess }: BetModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isOutright = matchInfo.away_team === '其他';
  const safeOdds = option.price > 0 ? (1 / option.price) : 0;
  const estimatedReturn = amount * safeOdds;
  const estimatedProfit = estimatedReturn - amount;
  const isValid = amount > 0 && amount <= balance && safeOdds > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const quickAmounts = [5, 10, 25, 50];

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketOptionId: option.id, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '投注失败');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data.balance);
        onCloseRef.current();
      }, 1500);
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const oddsDisplay = calcOdds(option.price);

  // 冠军盘口选择描述
  const selectionLabel = isOutright
    ? `${matchInfo.home_team} ${option.label === '是' ? '赢' : '不赢'}`
    : option.label;

  const matchLabel = isOutright
    ? matchInfo.home_team
    : `${matchInfo.home_team} vs ${matchInfo.away_team}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-card border-gold/30 animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">🎯 下注确认</h3>
              <p className="text-white/50 text-sm mt-0.5">{matchLabel}</p>
            </div>
            <button onClick={onClose} aria-label="关闭" className="text-white/40 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-xl font-bold text-gold">投注成功！</p>
              <p className="text-white/60 text-sm mt-2">祝你好运！🏆</p>
            </div>
          ) : (
            <>
              {/* Selection summary */}
              <div className="bg-white/5 rounded-lg p-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">市场</span>
                  <span className="text-white font-medium">
                    {isOutright ? '冠军盘' : getMarketLabel(marketInfo.type)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">选择</span>
                  <span className="text-gold font-bold">{selectionLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">赔率</span>
                  <span className="text-gold font-bold text-base">{oddsDisplay} 倍</span>
                </div>
                {matchInfo.kickoff_time && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">⏱ 开赛时间</span>
                    <span className="text-white/70">{formatTime(matchInfo.kickoff_time)}</span>
                  </div>
                )}
                <div className="text-xs text-white/30 pt-1 border-t border-white/10">
                  💡 投 $1 → 赢了得 ${oddsDisplay} · 比赛结束后自动结算
                </div>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <label className="block text-sm text-white/60 mb-2">投入金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full pl-7 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-lg font-bold focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 placeholder-white/30"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => setAmount(Math.min(qa, balance))}
                      disabled={qa > balance}
                      className="flex-1 py-1.5 text-xs rounded-md bg-white/10 hover:bg-white/20 text-white/70 disabled:opacity-30 transition-all"
                    >
                      ${qa}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(Math.floor(balance))}
                    className="flex-1 py-1.5 text-xs rounded-md bg-gold/20 hover:bg-gold/30 text-gold font-medium transition-all"
                  >
                    全部
                  </button>
                </div>
              </div>

              {/* Calculation */}
              {amount > 0 && (
                <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm space-y-1.5 animate-fade-in">
                  <div className="flex justify-between">
                    <span className="text-white/50">投入</span>
                    <span className="text-white">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">赔率</span>
                    <span className="text-gold font-bold">{oddsDisplay} 倍</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">赢了收回</span>
                    <span className="text-white font-medium">${estimatedReturn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5">
                    <span className="text-white/50">净赚</span>
                    <span className="text-green-400 font-bold">+${estimatedProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">可用余额</span>
                    <span className={`${amount > balance ? 'text-red-400' : 'text-white/70'}`}>
                      ${balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="w-full btn-gold py-3 text-base disabled:opacity-40"
              >
                {loading ? '处理中...' : isValid ? `确认投注 $${amount.toFixed(2)}` : '请输入金额'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
