import { ImageResponse } from "next/og";

import { BrandTile } from "@/components/metadata/brand-tile";

export const size = {
  width: 256,
  height: 256,
};

export const contentType = "image/png";

export default function Icon() {
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
        <BrandTile size={216} cornerRadius={58} />
      </div>
    ),
    size,
  );
}
