"use client";

import Link from "next/link";
import Icon from "./Icon";
import { PHONE, SOCIALS } from "@/lib/types";

export default function MobileCta() {
  return (
    <div className="mobile-cta">
      <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="btn btn-primary btn-lg">
        <Icon name="phone" size={18}/>
        Позвонить
      </a>
      <a href={SOCIALS.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-lg" style={{ borderColor: "var(--gold)", color: "var(--gold)", background: "transparent", border: "1px solid var(--gold)" }}>
        WhatsApp
      </a>
    </div>
  );
}
