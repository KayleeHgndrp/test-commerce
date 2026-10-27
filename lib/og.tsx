import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

const fontDir = path.join(process.cwd(), "assets/fonts");

// Shared social-share image: brand mark, large title and a subtitle.
export async function ogImage(title: string, subtitle: string) {
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontDir, "NotoSans-Regular.ttf")),
    readFile(path.join(fontDir, "NotoSans-Bold.ttf")),
  ]);
  const square = (opacity: number) => ({ width: 34, height: 34, borderRadius: 10, background: "#6246ea", opacity });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f7f6f2", fontFamily: "Noto Sans" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", width: 76, gap: 8 }}>
            <div style={square(1)} />
            <div style={square(0.3)} />
            <div style={square(0.55)} />
            <div style={square(0.8)} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#14121f" }}>{site.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 700, color: "#14121f", lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#5f5b6e", lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", height: 12, width: 240, borderRadius: 6, background: "#6246ea" }} />
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Noto Sans", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
