import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Course, StickerType } from '@/types';

interface CourseRowProps {
  course:   Partial<Course> & { id: string };
  onChange: (updated: Partial<Course> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export default function CourseRow({ course, onChange, onDelete }: CourseRowProps) {
  const update = (patch: Partial<Course>) => onChange({ ...course, ...patch });

  return (
    <div className="border rounded-md p-3 space-y-2 bg-muted/30">
      {/* 行 1: 授業名 + 科目コード */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">授業名 <span className="text-red-500">*</span></Label>
          <Input
            value={course.name ?? ''}
            onChange={e => update({ name: e.target.value })}
            placeholder="例: Webアプリケーション開発演習"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">科目コード</Label>
          <Input
            value={course.code ?? ''}
            onChange={e => update({ code: e.target.value || undefined })}
            placeholder="例: WEB301"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 行 2: 種別 + カリキュラム年度 + 時間数 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">種別</Label>
          <Select
            value={course.type ?? ''}
            onValueChange={v => update({ type: v === 'none' ? undefined : (v as StickerType) })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="（未設定）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">（未設定）</SelectItem>
              <SelectItem value="practical">実習</SelectItem>
              <SelectItem value="lecture">講義</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">カリキュラム年度 <span className="text-red-500">*</span></Label>
          <Input
            type="number"
            value={course.curriculumYear ?? ''}
            onChange={e => update({ curriculumYear: parseInt(e.target.value, 10) || undefined as unknown as number })}
            placeholder="例: 2025"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">時間数</Label>
          <Input
            type="number"
            value={course.hours ?? ''}
            onChange={e => update({ hours: parseInt(e.target.value, 10) || undefined })}
            placeholder="例: 90"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* 行 3: 授業内容メモ */}
      <div className="space-y-1">
        <Label className="text-xs">授業内容メモ</Label>
        <Textarea
          value={course.contentNote ?? ''}
          onChange={e => update({ contentNote: e.target.value || undefined })}
          placeholder="授業内容の概要"
          className="text-sm min-h-[60px] resize-y"
          rows={2}
        />
      </div>

      {/* 削除ボタン */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(course.id)}
        >
          削除
        </Button>
      </div>
    </div>
  );
}
