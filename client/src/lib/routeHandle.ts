/** Data attached to a route (`handle` in router.tsx) and read with `useMatches()`. */
export interface RouteHandle {
  /** Page title shown in the app shell's top bar. */
  title?: string;
}

/** Narrows the untyped `handle` of a route match. */
export function titleOf(handle: unknown): string | undefined {
  if (typeof handle === "object" && handle !== null && "title" in handle) {
    const { title } = handle as RouteHandle;
    return typeof title === "string" ? title : undefined;
  }
  return undefined;
}
