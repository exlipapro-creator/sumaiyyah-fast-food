import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sumaiyyah Fast Food POS",
  description: "Point of Sale System for Sumaiyyah Fast Food",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
