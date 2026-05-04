import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./layout.css";
import Header from "@/components/Header";

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700", "800"], variable: "--font-display", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import CookieBanner from "@/components/CookieBanner";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "Восток Авто Импорт — Авто из Японии, Китая, Кореи",
  description: "Подбираем, выкупаем и доставляем автомобили с аукционов. Доставка 35–55 дней. Звонок бесплатный: 8 800 101 29 18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Header/>
        {children}
        <Footer/>
        <MobileCta/>
        <CookieBanner/>
        <ScrollToTop/>
      </body>
    </html>
  );
}
