import { aiEnabled } from "@/lib/anthropic";
import { AskPanel } from "@/components/ask-panel";

export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <h1 className="display pt-2 text-[34px] leading-[1.1]">Ask the Course</h1>
      <p className="mb-7 mt-1 text-[13.5px] text-muted">
        Answers come only from what the course has recorded. If it isn&rsquo;t in there, it
        says so.
      </p>
      <AskPanel aiEnabled={aiEnabled()} />
    </>
  );
}
