import { requireModule } from "@/lib/session";
import { loadInventoryView } from "@/lib/inventory-view";
import PageShell from "@/components/page-shell";
import InventoryBoard from "@/components/inventory-board";

export const dynamic = "force-dynamic";

export default async function HalfwayPage() {
  const user = await requireModule("halfway");
  const view = await loadInventoryView(user.clubId, "HALFWAY_HOUSE");

  return (
    <PageShell
      clubId={user.clubId}
      title="Halfway House"
      subtitle={`Snack & beverage stand at the turn · ${view.lowCount} item${
        view.lowCount === 1 ? "" : "s"
      } at or below par`}
    >
      <div className="fade-wrap">
        <InventoryBoard
          location="HALFWAY_HOUSE"
          products={view.productRows}
          members={view.members}
          recentSales={view.saleRows}
          reorderLabel="Restock"
          reorderColumn="Restock At"
        />
      </div>
    </PageShell>
  );
}
