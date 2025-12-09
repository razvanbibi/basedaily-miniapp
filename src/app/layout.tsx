import type { Metadata } from "next";
import "@fontsource/geist";        // Regular Geist font
import "@fontsource/geist-mono";   // Geist Mono font
import "./globals.css";

export const metadata: Metadata = {
  title: "BaseDaily",
  description: "Daily check-ins, streak rewards, badges and leaderboards on Base.",
  other: {
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
