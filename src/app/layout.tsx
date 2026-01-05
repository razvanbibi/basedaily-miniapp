import type { Metadata } from "next";
import "@fontsource/geist";        // Regular Geist font
import "@fontsource/geist-mono";   // Geist Mono font
import "./globals.css";

export const metadata: Metadata = {
  title: "BaseDaily",
  description: "Daily check-ins on Base to grow your streak and earn rewards",
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://basedaily-miniapp.vercel.app/image-v2.png", // 3:2 image
      button: {
        title: "Launch BaseDaily",
        action: {
          type: "launch_frame",
          name: "BaseDaily",
          url: "https://basedaily-miniapp.vercel.app",
          splashImageUrl: "https://basedaily-miniapp.vercel.app/icon.png",
          splashBackgroundColor: "#020617",
        },
      },
    }),

    "base:app_id": "693871ce237206d0623c7a9f",

  },
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Geist, sans-serif",
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
