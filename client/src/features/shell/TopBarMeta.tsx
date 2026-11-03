import { useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TopBarSlotContext } from "./TopBarSlotContext";

/** Renders `children` in the top bar's metadata slot (next to the page title) via a portal. */
export function TopBarMeta({ children }: { children: ReactNode }) {
  const slot = useContext(TopBarSlotContext);
  return slot ? createPortal(children, slot) : null;
}
