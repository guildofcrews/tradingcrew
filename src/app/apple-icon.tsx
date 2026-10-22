import { ImageResponse } from "next/og";

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
          backgroundColor: "#FFF8EC",
          borderRadius: 32,
        }}
      >
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
              width: 60,
              height: 85,
              backgroundColor: "#5B8BD4",
              borderRadius: 10,
              border: "3px solid #3B5998",
              transform: "rotate(-15deg)",
              position: "absolute",
              left: 20,
            }}
          />
          {/* Yellow card with swap */}
          <div
            style={{
              width: 60,
              height: 85,
              backgroundColor: "#F5C542",
              borderRadius: 10,
              border: "3px solid #C49A2C",
              transform: "rotate(10deg)",
              position: "absolute",
              right: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: "#2B3A67",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: "#F96D3B",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
