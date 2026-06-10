import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import StickerIcon from '@/components/common/StickerIcon';
import YearBadge from '@/components/common/YearBadge';
import type { Category, Sticker, Course } from '@/types';

interface StickerModalProps {
  sticker: Sticker | null;
  cat:     Category | null;
  onClose: () => void;
}

const LATEST_YEAR = parseInt(
  (import.meta as Record<string, unknown>).env?.VITE_LATEST_CURRICULUM_YEAR as string
    ?? String(new Date().getFullYear()),
  10
);

/** courses を curriculum_year でグループ化して年度降順に返す */
function groupByYear(courses: Course[]): Map<number, Course[]> {
  const map = new Map<number, Course[]>();
  for (const c of courses) {
    const list = map.get(c.curriculumYear) ?? [];
    list.push(c);
    map.set(c.curriculumYear, list);
  }
  // 年度降順にソートした新しい Map を返す
  return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
}

export default function StickerModal({ sticker, cat, onClose }: StickerModalProps) {
  if (!sticker) return null;

  const { color } = sticker;
  const isPractical = sticker.type === 'practical';
  const coursesByYear = groupByYear(sticker.courses);

  return (
    <Dialog open={!!sticker} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">

        {/* ── パンくず ── */}
        {cat && (
          <div className="px-6 pt-4 pb-0">
            <p className="text-xs text-muted-foreground">
              {cat.name}
              <span className="mx-1">›</span>
              {sticker.name}
            </p>
          </div>
        )}

        {/* ── ヘッダー ── */}
        <div
          className="px-6 py-4"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              <StickerIcon
                imageUrl={sticker.imageUrl}
                emoji={sticker.emoji}
                color={color}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-semibold leading-tight">
                  {sticker.name}
                </DialogTitle>
                {sticker.nameEn && (
                  <p className="text-xs text-muted-foreground mt-0.5">{sticker.nameEn}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {isPractical ? (
                    <Badge className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-50">
                      実習
                    </Badge>
                  ) : (
                    <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">
                      講義
                    </Badge>
                  )}
                  {sticker.level && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {sticker.level}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {sticker.id}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── 本文 ── */}
        <div className="px-6 py-4 space-y-4 max-h-[55vh] overflow-y-auto">

          {/* Can-Do 記述 */}
          {sticker.description && (
            <div
              className="bg-muted rounded-md p-3 text-sm"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              {sticker.description}
            </div>
          )}

          {/* 習得スキル */}
          {sticker.skills.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">習得スキル</p>
              <div className="flex flex-wrap gap-1.5">
                {sticker.skills.map((sk, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs"
                    style={{
                      background:   `${color}15`,
                      borderColor:  `${color}44`,
                      color,
                    }}
                  >
                    {sk}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 関連授業（年度別） */}
          {coursesByYear.size > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">関連授業</p>
              <div className="space-y-3">
                {[...coursesByYear.entries()].map(([year, courses]) => {
                  const isLatest = year === LATEST_YEAR;
                  return (
                    <div
                      key={year}
                      className={[
                        'rounded-md border p-3 space-y-1.5',
                        isLatest ? 'border' : 'border-dashed opacity-85',
                      ].join(' ')}
                      style={{ borderColor: `${color}44` }}
                    >
                      <div className="flex items-center gap-2">
                        <YearBadge year={year} isLatest={isLatest} />
                      </div>
                      {courses.map(c => (
                        <div key={c.id} className="text-sm">
                          <p className="font-medium">{c.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            {c.code  && <span>{c.code}</span>}
                            {c.hours && <span>{c.hours}時間</span>}
                            {c.type  && (
                              <span>
                                {c.type === 'practical' ? '実習' : '講義'}
                              </span>
                            )}
                          </div>
                          {c.contentNote && (
                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                              {c.contentNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
