import { useState, useEffect, useCallback } from 'react';
import type { Category, Sticker, User, CurrentUser } from './types';
import Navbar from './components/Navbar';
import CategoryCard from './components/gallery/CategoryCard';
import CategoryModal from './components/gallery/CategoryModal';
import StickerModal from './components/gallery/StickerModal';
import LoginScreen from './components/admin/LoginScreen';
import AdminPanel from './components/admin/AdminPanel';

// ── authFetch ────────────────────────────────────────────

export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('auth_token');
  // FormData の場合は Content-Type を設定しない（ブラウザが boundary 付きで自動設定する）
  const isFormData = init.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
  return res;
}

// ── App ──────────────────────────────────────────────────

export default function App() {
  const [cats,        setCats]        = useState<Category[]>([]);
  const [stks,        setStks]        = useState<Sticker[]>([]);
  const [users,       setUsers]       = useState<User[]>([]);
  const [view,        setView]        = useState<'gallery' | 'admin'>('gallery');
  const [search,      setSearch]      = useState('');
  const [catModal,    setCatModal]    = useState<Category | null>(null);
  const [stkModal,    setStkModal]    = useState<Sticker | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading,     setLoading]     = useState(true);

  // 初期化：localStorage から currentUser を復元
  useEffect(() => {
    const saved = localStorage.getItem('auth_user');
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)); } catch { /* 破損データは無視 */ }
    }
  }, []);

  // データフェッチ
  const loadPublicData = useCallback(async () => {
    setLoading(true);
    try {
      const [catsRes, stksRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/stickers'),
      ]);
      if (catsRes.ok) setCats(await catsRes.json());
      if (stksRes.ok) setStks(await stksRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await authFetch('/api/users');
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => { loadPublicData(); }, [loadPublicData]);

  useEffect(() => {
    if (currentUser?.role === 'admin') loadUsers();
  }, [currentUser, loadUsers]);

  // 認証
  const handleLogin = (token: string, user: CurrentUser) => {
    setCurrentUser(user);
    setView('admin');
    if (user.role === 'admin') loadUsers();
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(null);
    setView('gallery');
    setUsers([]);
  };

  // 検索フィルタリング
  const filteredCats = cats.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nameEn?.toLowerCase().includes(q) ?? false) ||
      stks.some(s =>
        s.categories.some(sc => sc.id === c.id) &&
        (s.name.toLowerCase().includes(q) ||
         s.skills.some(sk => sk.toLowerCase().includes(q)))
      )
    );
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        view={view}
        search={search}
        currentUser={currentUser}
        onChangeView={setView}
        onSearch={setSearch}
        onLogout={handleLogout}
      />

      {view === 'gallery' && (
        <main className="w-full px-4 py-6 space-y-2">
          {filteredCats.length === 0 && (
            <p className="text-center text-muted-foreground py-16">
              一致する結果がありません
            </p>
          )}
          {filteredCats.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              stickers={stks}
              onCatClick={setCatModal}
              onStickerClick={setStkModal}
            />
          ))}
          <CategoryModal
            cat={catModal}
            stickers={stks}
            onClose={() => setCatModal(null)}
            onStickerClick={sticker => { setCatModal(null); setStkModal(sticker); }}
          />
          <StickerModal
            sticker={stkModal}
            cat={stkModal ? (cats.find(c => c.id === stkModal.primaryCategoryId) ?? null) : null}
            onClose={() => setStkModal(null)}
          />
        </main>
      )}

      {view === 'admin' && !currentUser && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {view === 'admin' && currentUser && (
        <AdminPanel
          cats={cats}
          stks={stks}
          currentUser={currentUser}
          onUpdateCats={cats => { setCats(cats); }}
          onUpdateStickers={stks => { setStks(stks); }}
        />
      )}
    </div>
  );
}
