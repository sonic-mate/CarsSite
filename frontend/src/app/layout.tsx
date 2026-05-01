import type { Metadata } from "next";
import "./globals.css";
import "./layout.css";
import Header from "@/components/Header";
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
    <html lang="ru">
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
