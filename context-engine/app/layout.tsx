import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { currentCourse } from "@/lib/course";

export const metadata: Metadata = {
  title: "Course Command Center",
  description: "Operational context for a golf course, in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const course = await currentCourse();

  return (
    <html lang="en">
      <body>
        <Nav courseName={course.name} />
        <main className="mx-auto max-w-5xl px-4 py-6 pb-20">{children}</main>
      </body>
    </html>
  );
}
