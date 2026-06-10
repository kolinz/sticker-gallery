import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CurrentUser } from '@/types';

interface LoginScreenProps {
  onLogin: (token: string, user: CurrentUser) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'ログインに失敗しました');
        return;
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLogin(data.token, data.user as CurrentUser);
    } catch {
      setError('サーバーに接続できませんでした');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* タイトル */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold">管理画面ログイン</h1>
          <p className="text-sm text-muted-foreground">
            🏷️ スキルスタンプ・ギャラリー
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <Alert className="bg-red-50 border-red-200 text-red-800">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* フォーム */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">ユーザー名</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                ログイン中…
              </span>
            ) : (
              'ログイン'
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
