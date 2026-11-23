import { ImageResponse } from "next/og";

export const alt = "Personal Blueprint — Know Your Patterns. Own Your Life.";
export const size = {
  width: 1200,
  height: 630,
};
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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0D0907",
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(255, 107, 43, 0.28), transparent 48%), radial-gradient(circle at 18% 82%, rgba(200, 66, 14, 0.22), transparent 50%)",
          color: "#FDF6EE",
          padding: "60px 80px",
          textAlign: "center",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 35% 35%, #FDF6EE 0%, #F5A65B 45%, #FF6B2B 85%, #C8420E 100%)",
            boxShadow: "0 0 60px rgba(255, 107, 43, 0.55)",
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#F5A65B",
            fontFamily: "sans-serif",
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Personal Blueprint
        </div>
        <div
          style={{
            fontSize: 58,
            lineHeight: 1.12,
            color: "#FDF6EE",
            maxWidth: 920,
          }}
        >
          Know your patterns. Own your life.
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#B8A99E",
            fontFamily: "sans-serif",
            marginTop: 22,
            maxWidth: 820,
          }}
        >
          Ancient pattern intelligence meets modern self-reflection—pinpoint your
          hard reset window, 3 eras, career fit, and blind spots in 45 seconds.
        </div>
      </div>
    ),
    size
  );
}
