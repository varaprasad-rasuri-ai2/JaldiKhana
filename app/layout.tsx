import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JaldiKhana - Easy Indian Recipes in Minutes",
  description: "Get easy Indian recipes from your ingredients. Kid-friendly, 10-30 minutes.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ea751a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
