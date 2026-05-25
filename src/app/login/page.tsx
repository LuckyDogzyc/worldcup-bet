'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pitch-pattern">
      <div className="glass-card border-gold/20 p-8 w-full max-w-md mx-4 animate-slide-up">
        {/* Decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light rounded-t-xl -mt-8 -mx-8 mb-6" />

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏟️ 体育竞猜</h1>
          <p className="text-gold/60 text-sm">世界杯 · 欧冠 · NBA · 网球 · 更多</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/50 text-sm font-medium mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
              placeholder="输入用户名"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-white/50 text-sm font-medium mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
              placeholder="输入密码"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold py-3.5 text-base"
          >
            {loading ? '处理中...' : isRegister ? '注册账号' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-white/40 hover:text-gold text-sm transition-colors"
          >
            {isRegister ? '已有账号？点击登录' : '没有账号？点击注册'}
          </button>
        </div>


      </div>
    </div>
  );
}
