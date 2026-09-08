/**
 * Shared between the server page (which validates ?tab=) and the client board.
 * It deliberately lives outside the "use client" module: a plain value exported
 * from a client module reaches the server as a client reference, not an array.
 */
export const SUB_TABS = [
  { id: "pairings", label: "Pairings" },
  { id: "flights", label: "Flights" },
  { id: "scoring", label: "Live Scoring" },
  { id: "payouts", label: "Payouts" },
  { id: "comms", label: "Field Comms" },
  { id: "weather", label: "Play Status" },
  { id: "rulings", label: "Rules Decisions" },
  { id: "sponsors", label: "Sponsors" },
] as const;

export type SubTab = (typeof SUB_TABS)[number]["id"];
