import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Sumaiyyah Fast Food | Bibi Titi Mohammed St, Posta, Dar es Salaam",
  description: "Authentic Swahili street food & casual dining restaurant on Bibi Titi Mohammed Street, Posta, Dar es Salaam — pilau, mishkaki, chips zege, nyama choma, bhajia, fresh juices, dine-in, takeaway, and corporate delivery.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className={`antialiased ${plusJakarta.className}`}>{children}</body>
    </html>
  );
}
