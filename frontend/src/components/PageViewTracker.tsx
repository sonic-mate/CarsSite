"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CaptchaModal from "./CaptchaModal";

const TRIGGER_VIEWS = 75;
const PASS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const [showCaptcha, setShowCaptcha] = useState(false);

  useEffect(() => {
    const passedUntil = parseInt(localStorage.getItem("captcha_ok") || "0", 10);
    if (passedUntil > Date.now()) return;

    const today = todayStr();
    if (localStorage.getItem("pv_date") !== today) {
      localStorage.setItem("pv_date", today);
      localStorage.setItem("pv_count", "0");
    }

    const count = parseInt(localStorage.getItem("pv_count") || "0", 10) + 1;
    localStorage.setItem("pv_count", String(count));

    if (count >= TRIGGER_VIEWS) {
      setShowCaptcha(true);
    }
  }, [pathname]);

  function onPass() {
    localStorage.setItem("captcha_ok", String(Date.now() + PASS_MS));
    setShowCaptcha(false);
  }

  if (!showCaptcha) return null;
  return <CaptchaModal onPass={onPass} />;
}
