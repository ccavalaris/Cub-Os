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
