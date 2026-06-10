import { useState, useEffect, useCallback } from 'react';
import { randomUUID } from 'node:crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StickerIcon from '@/components/common/StickerIcon';
import CourseRow from './CourseRow';
import { authFetch } from '@/App';
import type { Sticker, Category, Course, StickerType, StickerLevel } from '@/types';

const COLOR_PRESETS = [
  '#2563EB', '#059669', '#DB2777', '#DC2626',
  '#D97706', '#7C3AED', '#0891B2', '#65A30D',
  '#475569', '#1D4ED8',
];

const VERSIONS = ['v01','v02','v03','v04','v05','v06','v07','v08','v09'];

// ブラウザ環境では crypto.randomUUID を使う
function newId() {
  return typeof window !== 'undefined'
    ? window.crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

interface StickerEditorProps {
  sticker:    Sticker | null;
  categories: Category[];
  onSave:     (data: Partial<Sticker> & { categoryIds: string[] }) => Promise<void>;
  onDelete:   (id: string) => Promise<void>;
  onClose?:   () => void;
  canEdit:    boolean;
}

export default function StickerEditor({
  sticker, categories, onSave, onDelete, onClose, canEdit,
}: StickerEditorProps) {
  const isNew = !sticker?.id;

  // ── State ────────────────────────────────────────────

  const [id,              setId]          = useState(sticker?.id ?? '');
  const [name,            setName]        = useState(sticker?.name ?? '');
  const [nameEn,          setNameEn]      = useState(sticker?.nameEn ?? '');
  const [type,            setType]        = useState<StickerType>(sticker?.type ?? 'practical');
  const [level,           setLevel]       = useState<StickerLevel>(sticker?.level ?? '実践');
  const [version,         setVersion]     = useState(sticker?.version ?? 'v01');
  const [color,           setColor]       = useState(sticker?.color ?? '#2563EB');
  const [emoji,           setEmoji]       = useState(sticker?.emoji ?? '⭐');
  const [imageKey,        setImageKey]    = useState<string | null>(sticker?.imageKey ?? null);
  const [previewUrl,      setPreviewUrl]  = useState<string | null>(sticker?.imageUrl ?? null);
  const [description,     setDesc]        = useState(sticker?.description ?? '');
  const [skillsStr,       setSkills]      = useState((sticker?.skills ?? []).join(', '));
  const [categoryIds,     setCategoryIds] = useState<string[]>(
    sticker?.categories.map(c => c.id) ?? []
  );
  const [primaryCatId,    setPrimaryId]   = useState(sticker?.primaryCategoryId ?? '');
  const [courses,         setCourses]     = useState<(Partial<Course> & { id: string })[]>(
    sticker?.courses.map(c => ({ ...c })) ?? []
  );
  const [saving,    setSaving]   = useState(false);
  const [deleting,  setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]    = useState<string | null>(null);

  // ── sticker 切り替え時にリセット ─────────────────────

  useEffect(() => {
    setId(sticker?.id ?? '');
    setName(sticker?.name ?? '');
    setNameEn(sticker?.nameEn ?? '');
    setType(sticker?.type ?? 'practical');
    setLevel(sticker?.level ?? '実践');
    setVersion(sticker?.version ?? 'v01');
    setColor(sticker?.color ?? '#2563EB');
    setEmoji(sticker?.emoji ?? '⭐');
    setImageKey(sticker?.imageKey ?? null);
    setPreviewUrl(sticker?.imageUrl ?? null);
    setDesc(sticker?.description ?? '');
    setSkills((sticker?.skills ?? []).join(', '));
    setCategoryIds(sticker?.categories.map(c => c.id) ?? []);
    setPrimaryId(sticker?.primaryCategoryId ?? '');
    setCourses(sticker?.courses.map(c => ({ ...c })) ?? []);
    setError(null);
  }, [sticker]);

  // ── 主カテゴリー変更 → テーマカラー自動更新 ──────────

  const handlePrimaryChange = useCallback((catId: string) => {
    setPrimaryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat) setColor(cat.color);
  }, [categories]);

  // ── カテゴリー選択チェックボックス ───────────────────

  const handleCategoryCheck = (catId: string, checked: boolean) => {
    setCategoryIds(prev => {
      const next = checked ? [...prev, catId] : prev.filter(id => id !== catId);
      // 主カテゴリーのチェックが外れたらリセット
      if (!checked && catId === primaryCatId) setPrimaryId('');
      return next;
    });
  };

  // ── 主カテゴリー area_code から ID プレビュー ─────────

  const primaryCat = categories.find(c => c.id === primaryCatId);
  const idPreview  = isNew && primaryCat
    ? `NSS-${primaryCat.areaCode}-${type === 'practical' ? 'K' : 'L'}___${version}`
    : null;

  // ── 画像アップロード ────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await authFetch('/api/upload?prefix=stickers', {
        method: 'POST', headers: {}, body: form,
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'アップロード失敗' }));
        setError(msg); return;
      }
      const { key, url } = await res.json();
      setImageKey(key);
      setPreviewUrl(url);
    } finally {
      setUploading(false);
    }
  };

  // ── 授業操作 ─────────────────────────────────────────

  const addCourse = () => {
    const latest = parseInt(
      import.meta.env?.VITE_LATEST_CURRICULUM_YEAR ?? String(new Date().getFullYear()),
      10
    );
    setCourses(prev => [
      ...prev,
      { id: newId(), name: '', curriculumYear: latest },
    ]);
  };

  const updateCourse = (updated: Partial<Course> & { id: string }) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const deleteCourse = (courseId: string) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };

  // ── 保存 ────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim())      { setError('スタンプ名は必須です'); return; }
    if (isNew && !id.trim()){ setError('スタンプ ID は必須です'); return; }
    if (categoryIds.length === 0) { setError('カテゴリーを 1 件以上選択してください'); return; }
    if (!primaryCatId)     { setError('主カテゴリーを設定してください'); return; }
    if (!categoryIds.includes(primaryCatId)) {
      setError('主カテゴリーはチェック済みのカテゴリーから選択してください'); return;
    }
    for (const c of courses) {
      if (!c.name?.trim())       { setError('授業名は必須です'); return; }
      if (!c.curriculumYear)     { setError('カリキュラム年度は必須です'); return; }
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id:                isNew ? id.trim() : sticker!.id,
        primaryCategoryId: primaryCatId,
        categoryIds,
        name:              name.trim(),
        nameEn:            nameEn.trim() || undefined,
        type,
        level,
        version,
        color,
        emoji:             emoji.trim() || '⭐',
        imageKey,
        description:       description.trim(),
        skills:            skillsStr.split(',').map(s => s.trim()).filter(Boolean),
        courses:           courses as Course[],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ── 削除 ────────────────────────────────────────────

  const handleDelete = async () => {
    if (!sticker?.id || isNew) return;
    if (!confirm(`「${sticker.name}」を削除しますか？`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(sticker.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  // ── レンダリング ──────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h2 className="text-base font-semibold">
        {isNew ? 'スタンプ 新規作成' : `スタンプ編集：${sticker?.name}`}
      </h2>

      {!canEdit && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900 py-2">
          <AlertDescription className="text-xs">自分のスタンプのみ編集できます</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800 py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* ── カテゴリー選択（多対多） ── */}
      <div className="space-y-1.5">
        <Label>所属カテゴリー <span className="text-red-500">*</span></Label>
        <div className="border rounded-md divide-y">
          {categories.map(cat => {
            const checked   = categoryIds.includes(cat.id);
            const isPrimary = primaryCatId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  id={`cat-check-${cat.id}`}
                  checked={checked}
                  onCheckedChange={v => handleCategoryCheck(cat.id, !!v)}
                />
                <Label
                  htmlFor={`cat-check-${cat.id}`}
                  className="flex-1 flex items-center gap-2 cursor-pointer text-sm font-normal"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span>{cat.emoji} {cat.name}</span>
                  {cat.nameEn && (
                    <span className="text-xs text-muted-foreground">{cat.nameEn}</span>
                  )}
                </Label>
                {checked && (
                  <Button
                    type="button"
                    variant={isPrimary ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 text-xs shrink-0"
                    onClick={() => handlePrimaryChange(cat.id)}
                  >
                    {isPrimary ? '★ 主カテゴリー' : '☆ 主に設定'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 画像 ── */}
      <div className="space-y-1.5">
        <Label>アイコン画像</Label>
        <div className="flex items-center gap-3">
          <StickerIcon imageUrl={previewUrl} emoji={emoji} color={color} size={48} />
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            onChange={handleFileChange}
            className="text-sm"
          />
        </div>
        {uploading && <p className="text-xs text-muted-foreground">アップロード中…</p>}
      </div>

      {/* ── Emoji ── */}
      <div className="space-y-1.5">
        <Label htmlFor="stk-emoji">Emoji</Label>
        <Input id="stk-emoji" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} className="w-24" />
      </div>

      {/* ── テーマカラー ── */}
      <div className="space-y-1.5">
        <Label>テーマカラー（主カテゴリー変更で自動更新）</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-input"
          />
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: color === c ? '#000' : 'transparent' }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {/* ── スタンプ ID ── */}
      <div className="space-y-1.5">
        <Label htmlFor="stk-id">
          スタンプ ID
          {isNew ? <span className="text-red-500">*</span> : <span className="text-xs text-muted-foreground ml-1">（変更不可）</span>}
        </Label>
        {isNew && idPreview && (
          <p className="text-xs text-muted-foreground">プレビュー: {idPreview}</p>
        )}
        <Input
          id="stk-id"
          value={id}
          onChange={e => setId(e.target.value)}
          readOnly={!isNew}
          placeholder="例: NSS-WEB-K001v01"
          className="font-mono"
        />
      </div>

      {/* ── バージョン / 種別 / レベル ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>バージョン</Label>
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>種別</Label>
          <Select value={type} onValueChange={v => setType(v as StickerType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="practical">実習</SelectItem>
              <SelectItem value="lecture">講義</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>レベル</Label>
          <Select value={level} onValueChange={v => setLevel(v as StickerLevel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="実践">実践</SelectItem>
              <SelectItem value="知識">知識</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── スタンプ名 / 英語名 ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="stk-name">スタンプ名 <span className="text-red-500">*</span></Label>
          <Input id="stk-name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stk-nameen">英語名</Label>
          <Input id="stk-nameen" value={nameEn} onChange={e => setNameEn(e.target.value)} />
        </div>
      </div>

      {/* ── Can-Do 記述 ── */}
      <div className="space-y-1.5">
        <Label htmlFor="stk-desc">Can-Do 記述</Label>
        <Textarea id="stk-desc" value={description} onChange={e => setDesc(e.target.value)} rows={3} />
      </div>

      {/* ── 習得スキル ── */}
      <div className="space-y-1.5">
        <Label htmlFor="stk-skills">習得スキル（カンマ区切り）</Label>
        <Input
          id="stk-skills"
          value={skillsStr}
          onChange={e => setSkills(e.target.value)}
          placeholder="例: HTMLによるレイアウト実装, JavaScriptによるDOM操作"
        />
      </div>

      {/* ── 関連授業 ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>関連授業</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCourse} className="h-7 text-xs">
            ＋ 授業を追加
          </Button>
        </div>
        {courses.map(c => (
          <CourseRow
            key={c.id}
            course={c}
            onChange={updateCourse}
            onDelete={deleteCourse}
          />
        ))}
        {courses.length === 0 && (
          <p className="text-xs text-muted-foreground">授業がありません</p>
        )}
      </div>

      {/* ── ボタン群 ── */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving || uploading || !canEdit}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {!isNew && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || !canEdit}
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
