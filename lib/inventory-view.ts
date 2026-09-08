import type { StockLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatCentsShort, formatCents } from "@/lib/money";
import type { ProductRow, SaleRow } from "@/components/inventory-board";

/** "1:59pm" — the prototype's compact form, which fits the narrow time column. */
function clockLabel(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() >= 12 ? "pm" : "am"}`;
}

/** Shared read model for the pro shop and halfway house boards. */
export async function loadInventoryView(clubId: string, location: StockLocation) {
  const [products, members, sales] = await Promise.all([
    prisma.product.findMany({
      where: { clubId, location, active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.member.findMany({
      where: { clubId, status: { not: "RESIGNED" } },
      orderBy: { household: "asc" },
      select: { id: true, household: true },
    }),
    prisma.sale.findMany({
      where: { clubId, location },
      orderBy: { soldAt: "desc" },
      take: 8,
      include: { member: true, lines: { include: { product: true } } },
    }),
  ]);

  const productRows: ProductRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    stock: p.stock,
    reorderPoint: p.reorderPoint,
    price: formatCentsShort(p.priceCents),
    priceCents: p.priceCents,
  }));

  const saleRows: SaleRow[] = sales.map((s) => ({
    id: s.id,
    time: clockLabel(s.soldAt),
    summary: s.lines
      .map((l) => `${l.product.name} ×${l.quantity}`)
      .join(", "),
    total: formatCents(s.totalCents),
    tender: s.member ? s.member.household : "Cash",
  }));

  const lowCount = products.filter((p) => p.stock <= p.reorderPoint).length;

  return { productRows, members, saleRows, lowCount, skuCount: products.length };
}
