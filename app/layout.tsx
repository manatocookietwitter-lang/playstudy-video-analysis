import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return {
    title: "PlayStudy - 動画を開く、見る、メモする",
    description: "スポーツ動画をすぐに開き、横画面で確認しながら気づきを残せる動画学習ツール。",
    metadataBase: new URL(`${protocol}://${host}`),
    manifest: "/manifest.webmanifest",
    applicationName: "PlayStudy",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "PlayStudy",
      startupImage: [],
    },
    icons: {
      icon: [{ url: "/playstudy/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/playstudy/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "screen-orientation": "landscape",
    },
    openGraph: {
      title: "PlayStudy - 動画を開く、見る、メモする",
      description: "スポーツ動画を開いて、見る・メモする。迷わず使える動画学習ツール。",
      images: [{ url: "/og.png", width: 1536, height: 1024 }],
    },
    twitter: { card: "summary_large_image", images: ["/og.png"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f6df6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
