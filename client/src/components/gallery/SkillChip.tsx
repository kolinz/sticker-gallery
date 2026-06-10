import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import StickerIcon from '@/components/common/StickerIcon';
import type { Sticker } from '@/types';

interface SkillChipProps {
  sticker:  Sticker;
  onClick:  (s: Sticker) => void;
  faded?:   boolean;
}

export default function SkillChip({ sticker, onClick, faded = false }: SkillChipProps) {
  const isPractical = sticker.type === 'practical';

  return (
    <button
      type="button"
      className={cn(
        'skill-chip',
        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left',
        'bg-background transition-shadow duration-200',
        'hover:shadow-md hover:-translate-y-0.5 transition-transform',
        faded
          ? 'border border-transparent'
          : 'border'
      )}
      style={{
        opacity:      faded ? 0.55 : 1,
        borderColor:  faded ? undefined : sticker.color,
      }}
      onClick={() => onClick(sticker)}
    >
      <StickerIcon
        imageUrl={sticker.imageUrl}
        emoji={sticker.emoji}
        color={sticker.color}
        size={28}
      />

      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium leading-tight truncate">
          {sticker.name}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {sticker.id}
        </span>
        <div>
          {isPractical ? (
            <Badge className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-800 border border-yellow-200 hover:bg-yellow-50">
              実習
            </Badge>
          ) : (
            <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100">
              講義
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
