"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavTab } from "@/lib/roles";

export default function Sidebar({
  crest,
  markLine,
  clubName,
  footLine,
  tabs,
  userName,
  roleLabel,
  signOutAction,
}: {
  crest: string;
  markLine: string;
  clubName: string;
  footLine: string;
  tabs: NavTab[];
  userName: string;
  roleLabel: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0 });

  const activeHref =
    tabs
      .filter((t) => t.href === "/" ? pathname === "/" : pathname.startsWith(t.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/";

  // The brass rail that slides to the active item, as in the prototype.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(".nav-item.active");
    if (el) setIndicator({ top: el.offsetTop, height: el.offsetHeight });
  }, [activeHref, tabs.length]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="crest">{crest}</div>
        <div className="brand-mark">{markLine}</div>
        <div className="brand-name">{clubName}</div>
      </div>

      <div className="role-switcher">
        <label>Signed in as</label>
        <div className="who">
          <div className="who-name">{userName}</div>
          <div className="who-role">{roleLabel}</div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="sign-out">
            Sign out
          </button>
        </form>
      </div>

      <div className="nav-wrap">
        <div
          className="nav-indicator"
          style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
        />
        <ul className="nav" ref={navRef}>
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className={`nav-item ${t.href === activeHref ? "active" : ""}`}
              >
                <span className="num">{t.num}</span>
                <span>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {footLine ? <div className="sidebar-foot">{footLine}</div> : null}
    </aside>
  );
}
