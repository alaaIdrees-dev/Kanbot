import { createContext } from "react";

/**
 * DOM node inside the top bar, next to the page title, where a page can render small metadata
 * (e.g. the backlog's "18 todos · 42 pts", wireframe 04). `null` until the top bar has mounted.
 */
export const TopBarSlotContext = createContext<HTMLElement | null>(null);
