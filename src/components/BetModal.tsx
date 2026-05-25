'use client';

import { useState, useEffect } from 'react';

interface BetModalProps {
  matchInfo: { home_team: string; away_team: string };
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

  const shares = amount > 0 ? amount / option.price : 0;
  const estimatedReturn = shares; // Each share pays $1 if correct
  const isValid = amount > 0 && amount <= balance;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
        onClose();
      }, 1500);
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const getMarketLabel = (type: string) => {
    switch (type) {
      case '1x2': return '1x2 胜负';
      case 'ou25': return '大小球';
      case 'cs': return '正确比分';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md glass-card border-gold/30 animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent */}
        <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">🎯 下注确认</h3>
              <p className="text-white/50 text-sm mt-0.5">
                {matchInfo.home_team} vs {matchInfo.away_team}
              </p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
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
                  <span className="text-white font-medium">{getMarketLabel(marketInfo.type)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">选择</span>
                  <span className="text-gold font-bold">{option.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">当前价格</span>
                  <span className="text-white font-medium">${option.price.toFixed(2)} / 股</span>
                </div>
                <div className="text-xs text-white/40 pt-1 border-t border-white/10">
                  💡 如果「{option.label}」正确，每股结算 $1.00
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

                {/* Quick select buttons */}
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
                    onClick={() => setAmount(balance)}
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
                    <span className="text-white/50">投入金额</span>
                    <span className="text-white">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">当前价格</span>
                    <span className="text-white">${option.price.toFixed(2)} / 股</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">预计获得</span>
                    <span className="text-white font-medium">{shares.toFixed(2)} 股</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5">
                    <span className="text-white/50">预计收益</span>
                    <span className="text-gold font-bold">${estimatedReturn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">可用余额</span>
                    <span className={`${amount > balance ? 'text-red-400' : 'text-white/70'}`}>
                      ${balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Submit */}
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
