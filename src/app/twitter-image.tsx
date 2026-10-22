import { ImageResponse } from "next/og";

export const alt = "TradingCrew - Snap · Share · Swap";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF8EC",
          position: "relative",
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: "absolute",
            top: -50,
            left: -50,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "#F5C542",
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "#5B8BD4",
            opacity: 0.15,
          }}
        />

        {/* Logo cards */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {/* Blue card */}
          <div
            style={{
              width: 100,
              height: 140,
              backgroundColor: "#5B8BD4",
              borderRadius: 16,
              border: "4px solid #3B5998",
              transform: "rotate(-15deg)",
              marginRight: -30,
              zIndex: 1,
            }}
          />
          {/* Yellow card with swap icon */}
          <div
            style={{
              width: 100,
              height: 140,
              backgroundColor: "#F5C542",
              borderRadius: 16,
              border: "4px solid #C49A2C",
              transform: "rotate(10deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            {/* Swap circle */}
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                backgroundColor: "#2B3A67",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🔄
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            marginBottom: 20,
          }}
        >
          <span style={{ color: "#2B3A67" }}>Trading</span>
          <span style={{ color: "#F96D3B" }}>Crew</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#2B3A67",
            letterSpacing: 8,
            marginBottom: 30,
          }}
        >
          SNAP · SHARE · SWAP
        </div>

        {/* Domain */}
        <div
          style={{
            fontSize: 20,
            color: "#2B3A67",
            opacity: 0.6,
          }}
        >
          tradingcrew.ai
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
