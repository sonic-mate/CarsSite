"use client";

import React from "react";

const paths: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16" y2="16"/></>,
  phone: <path d="M22 16.92V19a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h2.08a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L7.6 9.6a16 16 0 0 0 6 6l1-1a2 2 0 0 1 2.1-.45c.91.36 1.85.6 2.8.72a2 2 0 0 1 1.72 2z"/>,
  arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  layers: <><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></>,
  filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  chevronDown: <polyline points="6 9 12 15 18 9"/>,
};

interface IconProps {
  name: keyof typeof paths;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function Icon({ name, size = 20, style, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
