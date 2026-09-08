import { requireModule } from "@/lib/session";
import { loadInventoryView } from "@/lib/inventory-view";
import PageShell from "@/components/page-shell";
import InventoryBoard from "@/components/inventory-board";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await requireModule("shop");
  const view = await loadInventoryView(user.clubId, "PRO_SHOP");

  return (
    <PageShell
      clubId={user.clubId}
      title="Pro Shop Inventory"
      subtitle={`${view.skuCount} SKUs tracked · ${view.lowCount} at or below reorder point`}
    >
      <div className="fade-wrap">
        <InventoryBoard
          location="PRO_SHOP"
          products={view.productRows}
          members={view.members}
          recentSales={view.saleRows}
          reorderLabel="Reorder"
          reorderColumn="Reorder At"
        />
      </div>
    </PageShell>
  );
}
