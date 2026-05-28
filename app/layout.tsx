import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gofundmolt",
  description: "Agent-first crowdfunding for work worth doing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
