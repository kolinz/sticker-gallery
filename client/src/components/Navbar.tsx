import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CurrentUser } from '@/types';

interface NavbarProps {
  view:          'gallery' | 'admin';
  search:        string;
  currentUser:   CurrentUser | null;
  onChangeView:  (v: 'gallery' | 'admin') => void;
  onSearch:      (q: string) => void;
  onLogout:      () => void;
}

export default function Navbar({
  view, search, currentUser, onChangeView, onSearch, onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 min-h-[3.5rem]">

        {/* ブランド */}
        <span className="font-semibold text-sm select-none shrink-0">
          🏷️ スキルスタンプ
        </span>

        {/* ビュー切り替え */}
        <nav className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeView('gallery')}
            className={cn(
              'text-xs px-2 h-7',
              view === 'gallery' ? 'bg-muted font-medium' : 'text-muted-foreground'
            )}
          >
            🖼 ギャラリー
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChangeView('admin')}
            className={cn(
              'text-xs px-2 h-7',
              view === 'admin' ? 'bg-muted font-medium' : 'text-muted-foreground'
            )}
          >
            ⚙️ 管理画面
          </Button>
        </nav>

        {/* 検索フォーム（ギャラリービューのみ） */}
        {view === 'gallery' && (
          <div className="flex-1 min-w-[120px]">
            <Input
              type="search"
              placeholder="スタンプ・授業名…"
              value={search}
              onChange={e => onSearch(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        )}

        {/* スペーサー */}
        <div className="flex-1" />

        {/* ユーザー情報・ログアウト */}
        {currentUser && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[80px]">
              {currentUser.displayName ?? currentUser.username}
            </span>
            <Badge
              className={cn(
                'text-[10px] px-1.5 py-0 rounded-full',
                currentUser.role === 'admin'
                  ? 'bg-red-100 text-red-800 hover:bg-red-100'
                  : 'bg-violet-100 text-violet-800 hover:bg-violet-100'
              )}
            >
              {currentUser.role}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="h-6 text-[10px] px-2"
            >
              ログアウト
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
