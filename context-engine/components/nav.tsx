"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Command Center" },
  { href: "/members", label: "Members" },
  { href: "/events", label: "Events" },
  { href: "/tasks", label: "Tasks" },
  { href: "/ask", label: "Ask the Course" },
];

export function Nav({ courseName }: { courseName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ground/92 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex h-[52px] items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-[26px] w-[26px] place-items-center rounded-full border border-accent text-[10px] font-semibold tracking-wide text-accent"
            >
              CC
            </span>
            <span className="display text-[17px] leading-none">{courseName}</span>
          </Link>
        </div>

        {/* Scrolls sideways on a phone rather than wrapping into a second row. */}
        <nav
          aria-label="Main"
          className="-mx-5 flex gap-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {LINKS.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "-mb-px whitespace-nowrap border-b-2 pb-2.5 pt-0.5 text-[13.5px] transition-colors",
                  active
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-muted hover:border-line hover:text-ink",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
