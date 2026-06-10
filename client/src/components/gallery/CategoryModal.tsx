import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StickerIcon from '@/components/common/StickerIcon';
import type { Category, Sticker } from '@/types';

interface CategoryModalProps {
  cat:            Category | null;
  stickers:       Sticker[];
  onClose:        () => void;
  onStickerClick: (s: Sticker) => void;
}

export default function CategoryModal({
  cat, stickers, onClose, onStickerClick,
}: CategoryModalProps) {
  if (!cat) return null;

  const { color } = cat;

  // このカテゴリーに所属する全スタンプ（主・関連問わず）
  const relatedStickers = stickers.filter(s =>
    s.categories.some(c => c.id === cat.id)
  );

  return (
    <Dialog open={!!cat} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">

        {/* ── ヘッダー ── */}
        <div
          className="px-6 py-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        >
          {/* 装飾円 */}
          <span className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" aria-hidden />
          <span className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full bg-white/10 pointer-events-none" aria-hidden />

          <DialogHeader className="relative">
            <div className="flex items-start gap-3">
              <StickerIcon
                imageUrl={cat.imageUrl}
                emoji={cat.emoji}
                color="#ffffff"
                size={44}
              />
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-white text-lg font-semibold leading-tight">
                  {cat.name}
                </DialogTitle>
                {cat.nameEn && (
                  <p className="text-white/70 text-xs mt-0.5">{cat.nameEn}</p>
                )}
                {cat.description && (
                  <p className="text-white/80 text-sm mt-1.5">{cat.description}</p>
                )}
                {cat.targetRoles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {cat.targetRoles.map(role => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0 hover:bg-white/20"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── 本文 ── */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* 採用担当者向けメッセージ */}
          {cat.recruitMessage && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
              <AlertDescription className="text-sm whitespace-pre-wrap">
                {cat.recruitMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* スタンプ一覧 */}
          {relatedStickers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">
                関連スタンプ（{relatedStickers.length}件）
              </p>
              <div className="space-y-1">
                {relatedStickers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left transition-colors"
                    onClick={() => { onStickerClick(s); }}
                  >
                    <StickerIcon
                      imageUrl={s.imageUrl}
                      emoji={s.emoji}
                      color={s.color}
                      size={28}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
