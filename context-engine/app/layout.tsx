import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { courseState } from "@/lib/course";
import { SetupScreen } from "@/components/setup-screen";

export const metadata: Metadata = {
  title: "Course Command Center",
  description: "Operational context for a golf course, in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await courseState();

  return (
    <html lang="en">
      <head>
        {/* Loaded by link rather than next/font: a build-time font fetch is one
            more thing that can fail a deploy, and this degrades to the fallback
            stack instead. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {state.status === "ok" ? (
          <>
            <Nav courseName={state.course.name} />
            <main className="mx-auto max-w-5xl px-4 py-6 pb-20">{children}</main>
          </>
        ) : (
          <SetupScreen state={state} />
        )}
      </body>
    </html>
  );
}
