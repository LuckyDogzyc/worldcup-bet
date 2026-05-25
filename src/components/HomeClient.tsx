'use client';

import { useState } from 'react';
import MatchList from './MatchList';

export default function HomeClient({ username, balance: initialBalance }: { username: string; balance: number }) {
  const [balance, setBalance] = useState(initialBalance);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Welcome banner */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            ⚽ 世界杯竞猜
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            欢迎，<span className="text-white/70">{username}</span>
          </p>
        </div>
        <div className="glass-card px-4 py-2 text-right">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">余额</div>
          <div className="text-lg font-black text-gold">${balance.toFixed(2)}</div>
        </div>
      </div>

      <MatchList balance={balance} onBalanceChange={setBalance} />
    </div>
  );
}
