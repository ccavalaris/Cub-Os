"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { StockLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertModule } from "@/lib/session";
import type { ModuleId } from "@/lib/roles";
import { formatCents } from "@/lib/money";

export type PosResult = { ok: true; message: string } | { ok: false; error: string };

const LOCATION_MODULE: Record<StockLocation, ModuleId> = {
  PRO_SHOP: "shop",
  HALFWAY_HOUSE: "halfway",
};

const LOCATION_LABEL: Record<StockLocation, string> = {
  PRO_SHOP: "Pro shop",
  HALFWAY_HOUSE: "Halfway house",
};

const sellSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(999),
  memberId: z.string().nullable(),
});

/**
 * One sell path for both stock locations. Stock decrement, the sale, its lines,
 * and the member charge all happen in one transaction — a sale can never post a
 * charge without moving stock, or move stock without recording the sale.
 */
export async function sellAction(
  location: StockLocation,
  input: z.input<typeof sellSchema>,
): Promise<PosResult> {
  const user = await assertModule(LOCATION_MODULE[location]);
  const parsed = sellSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That sale wasn't valid." };
  const { productId, quantity, memberId } = parsed.data;

  try {
    const message = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, clubId: user.clubId, location },
      });
      if (!product) throw new PosError("That item isn't stocked here.");

      // Conditional update is the actual guard against overselling: if another
      // register got there first, the row no longer matches and count is 0.
      const claimed = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (claimed.count === 0) {
        throw new PosError(
          `Only ${product.stock} of ${product.name} left — adjust the quantity.`,
        );
      }

      let member = null;
      if (memberId) {
        member = await tx.member.findFirst({
          where: { id: memberId, clubId: user.clubId },
        });
        if (!member) throw new PosError("That member isn't on file.");
      }

      const totalCents = product.priceCents * quantity;

      const sale = await tx.sale.create({
        data: {
          clubId: user.clubId,
          location,
          tender: member ? "MEMBER_ACCOUNT" : "CASH",
          memberId: member?.id ?? null,
          totalCents,
          soldById: user.id,
          lines: {
            create: [
              {
                productId: product.id,
                quantity,
                unitPriceCents: product.priceCents,
                lineTotalCents: totalCents,
              },
            ],
          },
        },
      });

      if (member) {
        await tx.memberCharge.create({
          data: {
            clubId: user.clubId,
            memberId: member.id,
            source: location === "PRO_SHOP" ? "PRO_SHOP" : "HALFWAY_HOUSE",
            description: `${product.name} ×${quantity}`,
            amountCents: totalCents,
            postedById: user.id,
            saleId: sale.id,
          },
        });
        await tx.member.update({
          where: { id: member.id },
          data: { lastVisit: new Date() },
        });
        return `${formatCents(totalCents)} charged to ${member.household}.`;
      }

      return `${formatCents(totalCents)} — cash sale recorded.`;
    });

    revalidatePath(location === "PRO_SHOP" ? "/shop" : "/halfway");
    revalidatePath("/members");
    revalidatePath("/");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof PosError) return { ok: false, error: e.message };
    throw e;
  }
}

const adjustSchema = z.object({
  productId: z.string().min(1),
  delta: z.number().int().min(-999).max(999),
});

/** Stock steppers — receiving a shipment or writing off breakage. */
export async function adjustStockAction(
  location: StockLocation,
  input: z.input<typeof adjustSchema>,
): Promise<PosResult> {
  const user = await assertModule(LOCATION_MODULE[location]);
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That adjustment wasn't valid." };
  const { productId, delta } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, clubId: user.clubId, location },
  });
  if (!product) return { ok: false, error: "That item isn't stocked here." };

  const next = Math.max(0, product.stock + delta);
  await prisma.product.update({ where: { id: product.id }, data: { stock: next } });

  revalidatePath(location === "PRO_SHOP" ? "/shop" : "/halfway");
  revalidatePath("/");
  return { ok: true, message: `${LOCATION_LABEL[location]} stock updated.` };
}

class PosError extends Error {}
