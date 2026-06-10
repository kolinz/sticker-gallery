import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { User, UserRole } from '@/types';

interface UserEditorProps {
  user:          User | null;
  onSave:        (data: Partial<User> & { password?: string }) => Promise<void>;
  onDelete:      (id: string) => Promise<void>;
  onClose?:      () => void;
  currentUserId: string;
}

export default function UserEditor({
  user, onSave, onDelete, onClose, currentUserId,
}: UserEditorProps) {
  const isNew   = !user?.id;
  const isSelf  = !isNew && user?.id === currentUserId;

  const [username,    setUsername]  = useState(user?.username    ?? '');
  const [displayName, setDisplay]   = useState(user?.displayName ?? '');
  const [role,        setRole]      = useState<UserRole>(user?.role ?? 'user');
  const [password,    setPassword]  = useState('');
  const [passwordConf, setPassConf] = useState('');
  const [saving,      setSaving]    = useState(false);
  const [deleting,    setDeleting]  = useState(false);
  const [error,       setError]     = useState<string | null>(null);

  // user が切り替わったらフォームをリセット
  useEffect(() => {
    setUsername(user?.username    ?? '');
    setDisplay(user?.displayName  ?? '');
    setRole(user?.role            ?? 'user');
    setPassword('');
    setPassConf('');
    setError(null);
  }, [user]);

  // ── 保存 ────────────────────────────────────────────

  const handleSave = async () => {
    if (!username.trim()) { setError('ユーザー名は必須です'); return; }
    if (username.length < 3 || username.length > 50) {
      setError('ユーザー名は 3〜50 文字にしてください');
      return;
    }
    if (isNew && !password) { setError('新規作成時はパスワードが必須です'); return; }
    if (password && password !== passwordConf) {
      setError('パスワードと確認が一致しません');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id:          isNew ? undefined : user!.id,
        username:    username.trim(),
        displayName: displayName.trim() || undefined,
        role,
        ...(password ? { password } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ── 削除 ────────────────────────────────────────────

  const handleDelete = async () => {
    if (!user?.id || isNew) return;
    if (!confirm(`「${user.displayName ?? user.username}」を削除しますか？`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-md">
      <h2 className="text-base font-semibold">
        {isNew ? 'ユーザー 新規作成' : `ユーザー編集：${user?.displayName ?? user?.username}`}
      </h2>

      {isSelf && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900 py-2">
          <AlertDescription className="text-xs">
            自分自身はロール変更・削除できません
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800 py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ユーザー名（新規のみ編集可） */}
      <div className="space-y-1.5">
        <Label htmlFor="user-username">
          ユーザー名 <span className="text-red-500">*</span>
          {!isNew && <span className="text-xs text-muted-foreground ml-1">（変更不可）</span>}
        </Label>
        <Input
          id="user-username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          readOnly={!isNew}
          autoComplete="off"
          placeholder="例: teacher01"
        />
      </div>

      {/* 表示名 */}
      <div className="space-y-1.5">
        <Label htmlFor="user-displayname">表示名</Label>
        <Input
          id="user-displayname"
          value={displayName}
          onChange={e => setDisplay(e.target.value)}
          placeholder="例: 山田 太郎"
        />
      </div>

      {/* ロール */}
      <div className="space-y-1.5">
        <Label htmlFor="user-role">ロール</Label>
        <Select
          value={role}
          onValueChange={v => setRole(v as UserRole)}
          disabled={isSelf}
        >
          <SelectTrigger id="user-role" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="user">user</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* パスワード */}
      <div className="space-y-1.5">
        <Label htmlFor="user-password">
          パスワード
          {isNew
            ? <span className="text-red-500">*</span>
            : <span className="text-xs text-muted-foreground ml-1">（空欄で変更なし）</span>}
        </Label>
        <Input
          id="user-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={isNew ? '' : '変更する場合のみ入力'}
        />
      </div>

      {/* パスワード確認 */}
      <div className="space-y-1.5">
        <Label htmlFor="user-password-confirm">
          パスワード確認
          {isNew && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="user-password-confirm"
          type="password"
          value={passwordConf}
          onChange={e => setPassConf(e.target.value)}
          autoComplete="new-password"
          placeholder={isNew ? '' : '変更する場合のみ入力'}
        />
      </div>

      {/* ボタン群 */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {!isNew && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || isSelf}
          >
            {deleting ? '削除中…' : '削除'}
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
        )}
      </div>
    </div>
  );
}
