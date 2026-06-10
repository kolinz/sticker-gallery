interface StickerIconProps {
  imageUrl?: string | null;
  emoji:     string;
  color:     string;
  size?:     number;
}

export default function StickerIcon({
  imageUrl,
  emoji,
  color,
  size = 40,
}: StickerIconProps) {
  const style = { width: size, height: size };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={emoji}
        className="rounded-full object-cover shrink-0"
        style={style}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 select-none"
      style={{ ...style, background: `${color}22` }}
    >
      <span style={{ fontSize: size * 0.5 }}>{emoji}</span>
    </div>
  );
}
