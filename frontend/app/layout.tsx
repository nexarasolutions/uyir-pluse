import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
export const metadata: Metadata = {
  title: "UYIR PLUS | Smart Healthcare for Brighter Tomorrows",
  description: "Advanced clinical AI telemetry, real-time patient monitoring, and predictive health platform.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={jakarta.variable}><body>{children}</body></html>;
}
