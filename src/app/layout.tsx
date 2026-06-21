import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prime Ceramics",
  description: "Admin CMS for Prime Ceramics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
