import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
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
          backgroundColor: "#FFF8EC",
          borderRadius: 6,
        }}
      >
        {/* Simplified logo - just the cards */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Blue card */}
          <div
            style={{
              width: 12,
              height: 18,
              backgroundColor: "#5B8BD4",
              borderRadius: 2,
              border: "1px solid #3B5998",
              transform: "rotate(-15deg)",
              position: "absolute",
              left: 4,
            }}
          />
          {/* Yellow card */}
          <div
            style={{
              width: 12,
              height: 18,
              backgroundColor: "#F5C542",
              borderRadius: 2,
              border: "1px solid #C49A2C",
              transform: "rotate(10deg)",
              position: "absolute",
              right: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#F96D3B",
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
