import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      name: "캐치캐치보 관리",
      short_name: "캐치캐치보 관리",
      description: "캐치캐치보 관리자",

      start_url: "/admin",
      scope: "/admin",

      display: "standalone",

      background_color: "#FFF9F3",
      theme_color: "#FFF9F3",

      orientation: "portrait",

      icons: [
        {
          src: "/admin-icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/admin-icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
      },
    }
  );
}
