import Image from "next/image";

/** Ícone quadrado do Data Dragon; mostra um quadrado vazio quando não há imagem (ex.: slot de item vazio). */
export function GameIcon({
  src,
  alt,
  size,
  className = "",
}: {
  src: string | null;
  alt: string;
  size: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className={`inline-block bg-divider ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      title={alt}
      width={size}
      height={size}
      className={className}
    />
  );
}
