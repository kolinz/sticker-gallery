import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StickerIcon from '@/components/common/StickerIcon';
import { authFetch } from '@/App';
import type { Category } from '@/types';

const COLOR_PRESETS = [
  '#2563EB', '#059669', '#DB2777', '#DC2626',
  '#D97706', '#7C3AED', '#0891B2', '#65A30D',
  '#475569', '#1D4ED8',
];

interface CategoryEditorProps {
  cat:      Category | null;
  onSave:   (data: Partial<Category>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose?: () => void;
}

export default function CategoryEditor({
  cat, onSave, onDelete, onClose,
}: CategoryEditorProps) {
  const isNew = !cat?.id;

  const [id,             setId]            = useState(cat?.id ?? '');
  const [name,           setName]          = useState(cat?.name ?? '');
  const [nameEn,         setNameEn]        = useState(cat?.nameEn ?? '');
  const [areaCode,       setAreaCode]      = useState(cat?.areaCode ?? '');
  const [color,          setColor]         = useState(cat?.color ?? '#2563EB');
  const [emoji,          setEmoji]         = useState(cat?.emoji ?? '📌');
  const [imageKey,       setImageKey]      = useState<string | null>(cat?.imageKey ?? null);
  const [previewUrl,     setPreviewUrl]    = useState<string | null>(cat?.imageUrl ?? null);
  const [description,    setDescription]   = useState(cat?.description ?? '');
  const [targetRolesStr, setTargetRoles]   = useState((cat?.targetRoles ?? []).join(', '));
  const [recruitMessage, setRecruitMsg]    = useState(cat?.recruitMessage ?? '');
  const [saving,         setSaving]        = useState(false);
  const [deleting,       setDeleting]      = useState(false);
  const [error,          setError]         = useState<string | null>(null);
  const [uploading,      setUploading]     = useState(false);

  // cat が切り替わったらフォームをリセット
  useEffect(() => {
    setId(cat?.id ?? '');
    setName(cat?.name ?? '');
    setNameEn(cat?.nameEn ?? '');
    setAreaCode(cat?.areaCode ?? '');
    setColor(cat?.color ?? '#2563EB');
    setEmoji(cat?.emoji ?? '📌');
    setImageKey(cat?.imageKey ?? null);
    setPreviewUrl(cat?.imageUrl ?? null);
    setDescription(cat?.description ?? '');
    setTargetRoles((cat?.targetRoles ?? []).join(', '));
    setRecruitMsg(cat?.recruitMessage ?? '');
    setError(null);
  }, [cat]);

  // ── 画像アップロード ────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await authFetch('/api/upload?prefix=categories', {
        method:  'POST',
        headers: {},          // Content-Type は FormData に任せるため空
        body:    form,
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'アップロードに失敗しました' }));
        setError(msg);
        return;
      }
      const { key, url } = await res.json();
      setImageKey(key);
      setPreviewUrl(url);
    } finally {
      setUploading(false);
    }
  };

  // ── 保存 ────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim()) { setError('カテゴリー名は必須です'); return; }
    if (isNew && !id.trim()) { setError('id は必須です'); return; }
    if (isNew && !areaCode.trim()) { setError('areaCode は必須です'); return; }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id:            isNew ? id.trim() : cat!.id,
        name:          name.trim(),
        nameEn:        nameEn.trim() || undefined,
        areaCode:      isNew ? areaCode.trim().toUpperCase() : undefined,
        color,
        emoji:         emoji.trim() || '📌',
        imageKey,
        description:   description.trim(),
        targetRoles:   targetRolesStr.split(',').map(s => s.trim()).filter(Boolean),
        recruitMessage: recruitMessage.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // ── 削除 ────────────────────────────────────────────

  const handleDelete = async () => {
    if (!cat?.id || isNew) return;
    if (!confirm(`「${cat.name}」を削除しますか？`)) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(cat.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-xl">
      <h2 className="text-base font-semibold">
        {isNew ? 'カテゴリー 新規作成' : `カテゴリー編集：${cat?.name}`}
      </h2>

      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800 py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* 画像 */}
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

      {/* Emoji */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-emoji">Emoji（画像未登録時のフォールバック）</Label>
        <Input
          id="cat-emoji"
          value={emoji}
          onChange={e => setEmoji(e.target.value)}
          maxLength={4}
          className="w-24"
        />
      </div>

      {/* テーマカラー */}
      <div className="space-y-1.5">
        <Label>テーマカラー</Label>
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
              style={{
                background:   c,
                borderColor:  color === c ? '#000' : 'transparent',
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {/* カテゴリー ID（新規のみ） */}
      {isNew && (
        <div className="space-y-1.5">
          <Label htmlFor="cat-id">ID（英数字・ハイフン 50文字以下）<span className="text-red-500">*</span></Label>
          <Input
            id="cat-id"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="例: cat-webdev"
          />
        </div>
      )}

      {/* area_code（新規のみ編集可） */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-areacode">
          areaCode（スタンプ ID の AREA 部分）
          {isNew ? <span className="text-red-500">*</span> : <span className="text-xs text-muted-foreground ml-1">（変更不可）</span>}
        </Label>
        <Input
          id="cat-areacode"
          value={areaCode}
          onChange={e => setAreaCode(e.target.value.toUpperCase())}
          readOnly={!isNew}
          placeholder="例: WEB"
          className="w-32"
        />
      </div>

      {/* カテゴリー名 */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">カテゴリー名 <span className="text-red-500">*</span></Label>
        <Input
          id="cat-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例: Webアプリ開発"
        />
      </div>

      {/* 英語名 */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-nameen">英語名</Label>
        <Input
          id="cat-nameen"
          value={nameEn}
          onChange={e => setNameEn(e.target.value)}
          placeholder="例: Web App Development"
        />
      </div>

      {/* 説明文 */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-desc">説明文</Label>
        <Textarea
          id="cat-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="カテゴリーの説明"
        />
      </div>

      {/* 対象職種 */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-roles">対象職種（カンマ区切り）</Label>
        <Input
          id="cat-roles"
          value={targetRolesStr}
          onChange={e => setTargetRoles(e.target.value)}
          placeholder="例: Webエンジニア, フロントエンドエンジニア"
        />
      </div>

      {/* 採用担当者向けメッセージ */}
      <div className="space-y-1.5">
        <Label htmlFor="cat-recruit">採用担当者向けメッセージ</Label>
        <Textarea
          id="cat-recruit"
          value={recruitMessage}
          onChange={e => setRecruitMsg(e.target.value)}
          rows={4}
          placeholder="就職説明会のブース向けメッセージ"
        />
      </div>

      {/* ボタン群 */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {!isNew && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
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
