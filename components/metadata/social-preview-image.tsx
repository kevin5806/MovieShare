import { BrandTile } from "@/components/metadata/brand-tile";
import { siteConfig } from "@/server/site-config";

const previewRows = [
  ["Arrival", "Added by Kevin"],
  ["Perfect Days", "Interested by 3 members"],
  ["Decision to Leave", "Top pick tonight"],
] as const;

export function SocialPreviewImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(244,239,228,1) 52%, rgba(228,236,255,1) 100%)",
        color: "#111827",
        fontFamily:
          'Manrope, "SF Pro Display", "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(148,163,184,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(99,102,241,0.12), transparent 30%)",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          padding: "64px 72px",
          display: "flex",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 650,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <BrandTile size={84} cornerRadius={24} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 34, fontWeight: 700 }}>{siteConfig.name}</div>
                <div style={{ fontSize: 18, color: "#475569" }}>
                  Collaborative movie rooms
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid rgba(15,23,42,0.12)",
                padding: "10px 16px",
                fontSize: 16,
                fontWeight: 600,
                color: "#334155",
                background: "rgba(255,255,255,0.72)",
              }}
            >
              Self-hosted workspace for real group decisions
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  fontSize: 62,
                  lineHeight: 1.04,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                }}
              >
                {siteConfig.marketingTitle}
              </div>
              <div
                style={{
                  maxWidth: 580,
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: "#475569",
                }}
              >
                {siteConfig.marketingDescription}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            {["shared lists", "feedback", "watch progress"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 999,
                  background: "#111827",
                  color: "#F8FAFC",
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: 360,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              borderRadius: 34,
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 32px 90px rgba(15,23,42,0.12)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 16, letterSpacing: "0.22em", color: "#64748B" }}>
                  FRIDAY ROOM
                </div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>Weekend watchlist</div>
              </div>
              <div
                style={{
                  borderRadius: 999,
                  background: "#E2E8F0",
                  color: "#111827",
                  padding: "8px 14px",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                3 online
              </div>
            </div>

            {previewRows.map(([title, meta]) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  borderRadius: 24,
                  padding: "16px 18px",
                  background: "#F8FAFC",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#111827",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 16, color: "#64748B" }}>{meta}</div>
                </div>
              </div>
            ))}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: 24,
                background: "#EEF2FF",
                padding: "16px 18px",
                color: "#312E81",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex" }}>Shared decisions without the chaos</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: "#4F46E5",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: "#818CF8",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background: "#C7D2FE",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
