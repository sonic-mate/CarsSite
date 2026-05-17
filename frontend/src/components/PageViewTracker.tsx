"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CaptchaModal from "./CaptchaModal";

const TRIGGER_VIEWS = 50;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function midnightTonight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
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
    localStorage.setItem("captcha_ok", String(midnightTonight()));
    setShowCaptcha(false);
    fetch("/api/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1, b: 1, answer: 2 }),
    }).catch(() => {});
  }

  if (!showCaptcha) return null;
  return <CaptchaModal onPass={onPass} />;
}
