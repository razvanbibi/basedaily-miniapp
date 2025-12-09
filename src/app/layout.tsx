import "@fontsource/geist";        // Regular Geist font
import "@fontsource/geist-mono";   // Geist Mono font
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BaseDaily",
  description:
    "Daily check-ins, streak rewards, badges and leaderboards on Base.",
  other: {
    // 🔵 Base MiniApp এর জন্য দরকারি মেটা ট্যাগ
    "base:app_id": "basedaily",
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
