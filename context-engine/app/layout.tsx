import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { getCourse } from "@/lib/course";
import { SetupNeeded } from "@/components/setup-needed";

export const metadata: Metadata = {
  title: "Course Command Center",
  description: "Operational context for a golf course, in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const course = await getCourse();

  return (
    <html lang="en">
      <body>
        {course ? (
          <>
            <Nav courseName={course.name} />
            <main className="mx-auto max-w-5xl px-4 py-6 pb-20">{children}</main>
          </>
        ) : (
          <SetupNeeded />
        )}
      </body>
    </html>
  );
}
