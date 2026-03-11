import { ImageResponse } from "next/og";

import { BrandTile } from "@/components/metadata/brand-tile";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
        }}
      >
        <BrandTile size={150} cornerRadius={40} />
      </div>
    ),
    size,
  );
}
