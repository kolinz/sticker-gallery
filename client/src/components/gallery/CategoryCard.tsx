import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StickerIcon from '@/components/common/StickerIcon';
import SkillChip from './SkillChip';
import type { Category, Sticker } from '@/types';

interface CategoryCardProps {
  cat:           Category;
  stickers:      Sticker[];          // 全スタンプ（内部でフィルタする）
  onCatClick:    (c: Category) => void;
  onStickerClick:(s: Sticker)  => void;
}

export default function CategoryCard({
  cat, stickers, onCatClick, onStickerClick,
}: CategoryCardProps) {
  const { color } = cat;

  // 主カテゴリーとして所属するスタンプ
  const primaryStickers = stickers.filter(
    s => s.primaryCategoryId === cat.id
  );
  // 関連カテゴリー（主カテゴリー以外）として所属するスタンプ
  const relatedStickers = stickers.filter(
    s =>
      s.primaryCategoryId !== cat.id &&
      s.categories.some(c => c.id === cat.id)
  );

  const allChips = [
    ...primaryStickers.map(s => ({ sticker: s, faded: false })),
    ...relatedStickers.map(s => ({ sticker: s, faded: true })),
  ];

  // 実習・講義の件数（主カテゴリーのみ）
  const practicalCount = primaryStickers.filter(s => s.type === 'practical').length;
  const lectureCount   = primaryStickers.filter(s => s.type === 'lecture').length;

  return (
    <Card className="mb-6 overflow-hidden hover:shadow-lg transition-shadow duration-200">

      {/* ── ヘッダー ── */}
      <button
        type="button"
        className="w-full text-left relative overflow-hidden px-5 py-4"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
        onClick={() => onCatClick(cat)}
      >
        {/* 装飾円 */}
        <span
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none"
          aria-hidden
        />
        <span
          className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full bg-white/10 pointer-events-none"
          aria-hidden
        />

        <div className="relative flex items-start gap-3">
          <StickerIcon
            imageUrl={cat.imageUrl}
            emoji={cat.emoji}
            color="#ffffff"
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-white font-semibold text-base leading-tight">
                {cat.name}
              </h2>
              {cat.nameEn && (
                <span className="text-white/70 text-xs">{cat.nameEn}</span>
              )}
            </div>

            {cat.description && (
              <p className="text-white/80 text-xs mt-1 line-clamp-2">
                {cat.description}
              </p>
            )}

            {/* 対象職種タグ */}
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

            {/* スタンプ件数 */}
            <div className="flex gap-1.5 mt-2">
              {practicalCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-white/40 text-white/90 hover:bg-transparent"
                >
                  実習 {practicalCount}件
                </Badge>
              )}
              {lectureCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-white/40 text-white/90 hover:bg-transparent"
                >
                  講義 {lectureCount}件
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* ── スタンプチップ一覧 ── */}
      {allChips.length > 0 && (
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {allChips.map(({ sticker, faded }) => (
              <SkillChip
                key={`${cat.id}-${sticker.id}`}
                sticker={sticker}
                onClick={onStickerClick}
                faded={faded}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
