import { aiEnabled } from "@/lib/anthropic";
import { AskPanel } from "@/components/ask-panel";

export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <h1 className="mb-1 text-[22px] font-semibold tracking-tight">Ask the Course</h1>
      <p className="mb-5 text-[13px] text-muted">
        Answers come only from what the course has recorded. If it isn&rsquo;t in there, it
        says so.
      </p>
      <AskPanel aiEnabled={aiEnabled()} />
    </>
  );
}
