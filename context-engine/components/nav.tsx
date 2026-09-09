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
    <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-md bg-accent text-[11px] font-semibold tracking-wide text-white"
            >
              CC
            </span>
            <span className="text-[15px] font-semibold tracking-tight">{courseName}</span>
          </Link>
        </div>

        {/* Scrolls horizontally on a phone rather than wrapping into two rows. */}
        <nav
          aria-label="Main"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-line-soft hover:text-ink",
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
