import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import CookieBanner from "@/components/CookieBanner";
import ScrollToTop from "@/components/ScrollToTop";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header/>
      {children}
      <Footer/>
      <MobileCta/>
      <CookieBanner/>
      <ScrollToTop/>
    </>
  );
}
