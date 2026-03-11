import { ImageResponse } from "next/og";

import { SocialPreviewImage } from "@/components/metadata/social-preview-image";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<SocialPreviewImage />, size);
}
