type BrandTileProps = {
  size: number;
  cornerRadius?: number;
};

export function BrandTile({ size, cornerRadius = Math.round(size * 0.22) }: BrandTileProps) {
  const shellInset = Math.round(size * 0.14);
  const shellRadius = Math.round(size * 0.1);
  const innerInset = Math.round(size * 0.21);
  const innerRadius = Math.round(size * 0.07);
  const barLeft = Math.round(size * 0.33);
  const barRight = Math.round(size * 0.3);
  const barWidth = size - barLeft - barRight;
  const barHeight = Math.max(12, Math.round(size * 0.08));
  const firstBarTop = Math.round(size * 0.31);
  const secondBarTop = Math.round(size * 0.45);
  const circleSize = Math.max(16, Math.round(size * 0.1));
  const circleTop = Math.round(size * 0.63);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: cornerRadius,
        background: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: shellInset,
          borderRadius: shellRadius,
          background: "#F8FAFC",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: innerInset,
          borderRadius: innerRadius,
          background: "#E2E8F0",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: barLeft,
          top: firstBarTop,
          width: barWidth,
          height: barHeight,
          borderRadius: Math.round(barHeight / 2),
          background: "#111827",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: barLeft,
          top: secondBarTop,
          width: barWidth,
          height: barHeight,
          borderRadius: Math.round(barHeight / 2),
          background: "#111827",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: Math.round(size * 0.34),
          top: circleTop,
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize,
          background: "#111827",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: Math.round(size * 0.34),
          top: circleTop,
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize,
          background: "#111827",
        }}
      />
    </div>
  );
}
