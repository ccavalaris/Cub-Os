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

/// Club monograms are the initials of the whole name — Exmoor Country Club is
/// ECC, not E — so every significant word contributes a letter. Joining words
/// are dropped because no crest has ever engraved "of".
const SKIP = new Set(["the", "of", "and", "at", "on"]);

function monogram(courseName: string): string {
  const letters = courseName
    .split(/[\s-]+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters.slice(0, 3) || "C";
}

export function Nav({ courseName }: { courseName: string }) {
  const pathname = usePathname();
  const mark = monogram(courseName);

  return (
    <header>
      {/* The masthead scrolls away and the tabs stay. On a phone, between
          groups, the thing worth 40 fixed pixels is the navigation. */}
      <div className="bg-accent-deep">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brass text-brass ring-1 ring-inset ring-brass/25"
            >
              <span
                className={`font-mono font-medium ${
                  mark.length > 2 ? "text-[9px] tracking-[0.06em]" : "text-[11px] tracking-[0.08em]"
                }`}
              >
                {mark}
              </span>
            </span>
            <span className="display text-[21px] leading-none text-ground">{courseName}</span>
          </Link>

          <span className="label hidden shrink-0 text-brass-light sm:block">
            Course Context Engine
          </span>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-line bg-ground/92 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-5">
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
                    "-mb-px whitespace-nowrap border-b-2 pb-2.5 pt-2.5 text-[13.5px] transition-colors",
                    active
                      ? "border-brass font-medium text-accent"
                      : "border-transparent text-muted hover:border-line hover:text-ink",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
