import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ALEYA Logo Creator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px",
          background:
            "linear-gradient(135deg, #12362f 0%, #1f4d45 45%, #2a3a32 100%)",
          color: "#f6f0e4",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 88, letterSpacing: -2 }}>ALEYA</div>
        <div style={{ marginTop: 12, fontSize: 42, fontFamily: "sans-serif", fontWeight: 500 }}>
          Logo Creator
        </div>
        <div
          style={{
            marginTop: 24,
            maxWidth: 720,
            fontSize: 28,
            lineHeight: 1.35,
            fontFamily: "sans-serif",
            color: "#efe7d8",
          }}
        >
          Generate distinct brand marks, refine concepts, and export reusable Brand Kits.
        </div>
      </div>
    ),
    { ...size },
  );
}
