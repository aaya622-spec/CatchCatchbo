import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "캐치캐치보 관리",

  manifest: "/admin/admin-manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "캐치캐치보 관리",
    statusBarStyle: "default",
  },

  icons: {
    apple: [
      {
        url: "/admin-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
