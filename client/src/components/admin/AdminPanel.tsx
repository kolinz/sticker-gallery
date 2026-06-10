import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { authFetch } from '@/App';
import type { Category, Sticker, User, CurrentUser } from '@/types';
import CategoryEditor from './CategoryEditor';
import StickerEditor from './StickerEditor';
import UserEditor from './UserEditor';

type Tab = 'stickers' | 'categories' | 'users';

interface AdminPanelProps {
  cats:             Category[];
  stks:             Sticker[];
  currentUser:      CurrentUser;
  onUpdateCats:     (cats: Category[]) => void;
  onUpdateStickers: (stks: Sticker[]) => void;
}

export default function AdminPanel({
  cats, stks, currentUser, onUpdateCats, onUpdateStickers,
}: AdminPanelProps) {
  const isAdmin = currentUser.role === 'admin';

  const [activeTab, setActiveTab] = useState<Tab>('stickers');
  const [selected,  setSelected]  = useState<Category | Sticker | User | null>(null);
  const [users,     setUsers]     = useState<User[]>([]);
  const [alertMsg,  setAlertMsg]  = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const res = await authFetch('/api/users');
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const handleSaveSticker = async (data: Partial<Sticker> & { categoryIds?: string[] }) => {
    const isNew = !data.id || !stks.find(s => s.id === data.id);
    const res   = isNew
      ? await authFetch('/api/stickers',            { method: 'POST', body: JSON.stringify(data) })
      : await authFetch(`/api/stickers/${data.id}`, { method: 'PUT',  body: JSON.stringify(data) });
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    const saved: Sticker = await res.json();
    onUpdateStickers(isNew ? [...stks, saved] : stks.map(s => s.id === saved.id ? saved : s));
    setSelected(saved);
    setAlertMsg(null);
  };

  const handleDeleteSticker = async (id: string) => {
    const res = await authFetch(`/api/stickers/${id}`, { method: 'DELETE' });
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    onUpdateStickers(stks.filter(s => s.id !== id));
    setSelected(null);
    setAlertMsg(null);
  };

  const handleSaveCategory = async (data: Partial<Category>) => {
    const isNew = !data.id || !cats.find(c => c.id === data.id);
    const res   = isNew
      ? await authFetch('/api/categories',            { method: 'POST', body: JSON.stringify(data) })
      : await authFetch(`/api/categories/${data.id}`, { method: 'PUT',  body: JSON.stringify(data) });
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    const saved: Category = await res.json();
    onUpdateCats(isNew ? [...cats, saved] : cats.map(c => c.id === saved.id ? saved : c));
    setSelected(saved);
    setAlertMsg(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (res.status === 409) { const { error } = await res.json().catch(() => ({ error: '配下のスタンプを先に削除してください' })); setAlertMsg(error); return; }
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    onUpdateCats(cats.filter(c => c.id !== id));
    setSelected(null);
    setAlertMsg(null);
  };

  const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
    const isNew = !data.id || !users.find(u => u.id === data.id);
    const res   = isNew
      ? await authFetch('/api/users',            { method: 'POST', body: JSON.stringify(data) })
      : await authFetch(`/api/users/${data.id}`, { method: 'PUT',  body: JSON.stringify(data) });
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    const saved: User = await res.json();
    setUsers(isNew ? [...users, saved] : users.map(u => u.id === saved.id ? saved : u));
    setSelected(saved);
    setAlertMsg(null);
  };

  const handleDeleteUser = async (id: string) => {
    const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) { const { error } = await res.json().catch(() => ({ error: 'エラーが発生しました' })); setAlertMsg(error); return; }
    setUsers(users.filter(u => u.id !== id));
    setSelected(null);
    setAlertMsg(null);
  };

  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: 'categories', label: '🗂 カテゴリー', adminOnly: true },
    { key: 'stickers',   label: '🏷 スタンプ',   adminOnly: false },
    { key: 'users',      label: '👥 ユーザー管理', adminOnly: true },
  ];

  function renderList() {
    if (activeTab === 'categories') {
      return (
        <div className="space-y-0.5">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
            onClick={() => setSelected({ id: '', name: '', areaCode: '', emoji: '📌', color: '#2563EB', imageKey: null, imageUrl: null, description: '', targetRoles: [] } as Category)}>
            ＋ 新規カテゴリー
          </Button>
          {cats.map(c => (
            <button key={c.id} type="button"
              className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left hover:bg-accent transition-colors',
                selected && 'id' in selected && selected.id === c.id && 'bg-accent')}
              onClick={() => { setSelected(c); setAlertMsg(null); }}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      );
    }
    if (activeTab === 'stickers') {
      return (
        <div className="space-y-0.5">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
            onClick={() => setSelected({ id: '', primaryCategoryId: '', categories: [], createdBy: null, name: '', type: 'practical', color: '#2563EB', emoji: '⭐', imageKey: null, imageUrl: null, description: '', skills: [], level: '実践', version: 'v01', courses: [] } as Sticker)}>
            ＋ 新規スタンプ
          </Button>
          {stks.map(s => {
            const isOwn = s.createdBy?.id === currentUser.id;
            const canEdit = isAdmin || isOwn;
            return (
              <button key={s.id} type="button"
                className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left hover:bg-accent transition-colors',
                  selected && 'id' in selected && selected.id === s.id && 'bg-accent',
                  !canEdit && 'opacity-60')}
                onClick={() => { setSelected(s); setAlertMsg(null); }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.id}</p>
                </div>
                {isOwn && <Badge className="text-[9px] px-1 py-0 bg-violet-100 text-violet-800 hover:bg-violet-100 shrink-0">あなた</Badge>}
              </button>
            );
          })}
        </div>
      );
    }
    if (activeTab === 'users') {
      return (
        <div className="space-y-0.5">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground"
            onClick={() => setSelected({ id: '', username: '', role: 'user' } as User)}>
            ＋ 新規ユーザー
          </Button>
          {users.map(u => (
            <button key={u.id} type="button"
              className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left hover:bg-accent transition-colors',
                selected && 'id' in selected && selected.id === u.id && 'bg-accent')}
              onClick={() => { setSelected(u); setAlertMsg(null); }}>
              <span className="flex-1 truncate">{u.displayName ?? u.username}</span>
              <Badge className={cn('text-[9px] px-1 py-0 shrink-0',
                u.role === 'admin' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100')}>
                {u.role}
              </Badge>
            </button>
          ))}
        </div>
      );
    }
  }

  function renderEditor() {
    if (!selected) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
          左のリストから項目を選択してください
        </div>
      );
    }

    const isSticker  = 'primaryCategoryId' in selected;
    const isCategory = 'areaCode' in selected && !('primaryCategoryId' in selected);
    const isUser     = 'username' in selected;

    if (isSticker) {
      const s = selected as Sticker;
      const canEdit = isAdmin || s.createdBy?.id === currentUser.id;
      return (
        <div className="overflow-auto h-full">
          <StickerEditor sticker={s} categories={cats} canEdit={canEdit}
            onSave={handleSaveSticker} onDelete={handleDeleteSticker} />
        </div>
      );
    }
    if (isCategory) {
      return (
        <div className="overflow-auto h-full">
          <CategoryEditor cat={selected as Category}
            onSave={handleSaveCategory} onDelete={handleDeleteCategory} />
        </div>
      );
    }
    if (isUser) {
      return (
        <div className="overflow-auto h-full">
          <UserEditor user={selected as User} currentUserId={currentUser.id}
            onSave={handleSaveUser} onDelete={handleDeleteUser} />
        </div>
      );
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-[340px] shrink-0 border-r flex flex-col">
        <div className="flex border-b px-2 pt-2 gap-1">
          {tabs.filter(t => !t.adminOnly || isAdmin).map(t => (
            <button key={t.key} type="button"
              className={cn('px-3 py-1.5 text-xs rounded-t-md transition-colors',
                activeTab === t.key ? 'bg-background border border-b-background -mb-px font-medium' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => { setActiveTab(t.key); setSelected(null); setAlertMsg(null); }}>
              {t.label}
            </button>
          ))}
        </div>
        {alertMsg && (
          <div className="px-3 pt-2">
            <Alert className="bg-red-50 border-red-200 text-red-800 py-2">
              <AlertDescription className="text-xs">{alertMsg}</AlertDescription>
            </Alert>
          </div>
        )}
        <ScrollArea className="flex-1 px-2 py-2">
          {renderList()}
        </ScrollArea>
      </div>
      <div className="flex-1 overflow-auto">
        {renderEditor()}
      </div>
    </div>
  );
}
