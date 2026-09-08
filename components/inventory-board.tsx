"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StockLocation } from "@prisma/client";
import { sellAction, adjustStockAction } from "@/app/(app)/pos-actions";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  stock: number;
  reorderPoint: number;
  price: string;
  priceCents: number;
};

export type SaleRow = {
  id: string;
  time: string;
  summary: string;
  total: string;
  tender: string;
};

type Member = { id: string; household: string };

export default function InventoryBoard({
  location,
  products,
  members,
  recentSales,
  reorderLabel,
  reorderColumn,
}: {
  location: StockLocation;
  products: ProductRow[];
  members: Member[];
  recentSales: SaleRow[];
  reorderLabel: string;
  reorderColumn: string;
}) {
  const router = useRouter();
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selling = products.find((p) => p.id === sellingId) ?? null;

  function openSell(p: ProductRow) {
    setSellingId(p.id);
    setQty(1);
    setMemberId("");
    setError(null);
    setFlash(null);
  }

  function adjust(productId: string, delta: number) {
    startTransition(async () => {
      const res = await adjustStockAction(location, { productId, delta });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function completeSale() {
    if (!selling) return;
    startTransition(async () => {
      const res = await sellAction(location, {
        productId: selling.id,
        quantity: qty,
        memberId: memberId || null,
      });
      if (res.ok) {
        setSellingId(null);
        setError(null);
        setFlash(res.message);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const total = selling ? (selling.priceCents * qty) / 100 : 0;

  return (
    <>
      <div className="section">
        <div className="panel-title">Inventory</div>
        <div className="panel-desc">
          Adjust stock as items sell or shipments arrive, or ring up a sale directly.
          Items at or below the {reorderLabel.toLowerCase()} point are flagged
          automatically. Charging to a member posts straight to their account.
        </div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        {flash ? <div className="flash">{flash}</div> : null}

        <table className="inv">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>On Hand</th>
              <th>{reorderColumn}</th>
              <th>Price</th>
              <th>Sell</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.stock <= p.reorderPoint;
              return (
                <tr key={p.id} className={sellingId === p.id ? "row-open" : ""}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>
                    <div className="stock-stepper">
                      <button
                        className="stepper-btn"
                        onClick={() => adjust(p.id, -1)}
                        disabled={pending || p.stock === 0}
                        aria-label={`Decrease ${p.name}`}
                      >
                        &minus;
                      </button>
                      <span className="stock-num">{p.stock}</span>
                      <button
                        className="stepper-btn"
                        onClick={() => adjust(p.id, 1)}
                        disabled={pending}
                        aria-label={`Increase ${p.name}`}
                      >
                        &#43;
                      </button>
                      {low ? <span className="low-flag">{reorderLabel}</span> : null}
                    </div>
                  </td>
                  <td className="mono">{p.reorderPoint}</td>
                  <td className="mono">{p.price}</td>
                  <td>
                    <button
                      className="pos-btn"
                      onClick={() => openSell(p)}
                      disabled={p.stock < 1 || pending}
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {selling ? (
          <div className="drawer show">
            <div className="drawer-row" style={{ alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 2 }}>
                <label>Item</label>
                <input type="text" value={`${selling.name} — ${selling.price}`} disabled />
              </div>
              <div className="field">
                <label>Quantity</label>
                <div className="pos-qty">
                  <button
                    className="stepper-btn"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    &minus;
                  </button>
                  <span className="stock-num">{qty}</span>
                  <button
                    className="stepper-btn"
                    onClick={() => setQty((q) => Math.min(selling.stock, q + 1))}
                  >
                    &#43;
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="posMember">Charge To</label>
                <select
                  id="posMember"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  <option value="">Walk-in / Cash</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.household}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Total</label>
                <div className="pos-total">
                  ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {error ? <div className="drawer-error">{error}</div> : null}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={completeSale} disabled={pending}>
                {pending ? "Recording…" : "Complete Sale"}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setSellingId(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {!selling && error ? <div className="drawer-error">{error}</div> : null}
      </div>

      <div className="section">
        <div className="panel-title">Recent Sales</div>
        <div className="panel-desc">Latest transactions, most recent first.</div>
        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>
        <div className="mini-panel">
          {recentSales.length === 0 ? (
            <div className="mini-row">No sales recorded yet today.</div>
          ) : (
            recentSales.map((s) => (
              <div key={s.id} className="mini-row">
                <span className="mini-time">{s.time}</span>
                <span style={{ flex: 1 }}>{s.summary}</span>
                <span className="tag">{s.tender}</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {s.total}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
