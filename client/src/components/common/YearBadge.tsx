import { Badge } from '@/components/ui/badge';

interface YearBadgeProps {
  year:     number;
  isLatest: boolean;
}

export default function YearBadge({ year, isLatest }: YearBadgeProps) {
  if (isLatest) {
    return (
      <Badge className="bg-slate-900 text-slate-50 rounded-full hover:bg-slate-900">
        {year} ★
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-muted-foreground rounded-full">
      {year}
    </Badge>
  );
}
