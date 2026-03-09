import Image, { type ImageProps } from "next/image";

export function MediaImage({ alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} unoptimized />;
}
