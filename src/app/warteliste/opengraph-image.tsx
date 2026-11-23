import { ImageResponse } from "next/og";

export const alt = "Sigma – Die Fitness-App, die wirklich alles zählt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview image when the waitlist link is shared on social media or in chats. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0a0b0d", color: "#eef0f2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg viewBox="0 0 64 64" width="96" height="96">
            <rect width="64" height="64" rx="18" fill="#121418" stroke="#262a31" />
            <path d="M20 17h24v7H30.5l9 8-9 8H44v7H20v-6.5L30 32l-10-8.5z" fill="#c8f560" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 600 }}>Sigma</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 48, fontSize: 72, fontWeight: 600, lineHeight: 1.1, letterSpacing: -2 }}>
          <span>Die Fitness-App, die&nbsp;</span>
          <span style={{ color: "#c8f560" }}>wirklich alles</span>
          <span>&nbsp;zählt.</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 32, color: "#8a909b" }}>Ballaststoffe · Vitamine · Training · Schlaf · KI-Coach</div>
        <div style={{ marginTop: 48, display: "flex" }}>
          <div style={{ background: "#c8f560", color: "#11140a", fontSize: 30, fontWeight: 600, padding: "14px 30px", borderRadius: 20 }}>Jetzt auf die Warteliste</div>
        </div>
      </div>
    ),
    size,
  );
}
