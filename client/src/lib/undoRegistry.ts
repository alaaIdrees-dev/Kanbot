/**
 * The most recent undoable action that still has its toast on screen, so `Ctrl/⌘+Z` can run it
 * without reaching for the toast's button. Only one entry: older toasts keep their own button.
 */
interface UndoEntry {
  id: string;
  run: () => void;
}

let latest: UndoEntry | null = null;

export const registerUndo = (entry: UndoEntry): void => {
  latest = entry;
};

/** Called when a toast closes; a newer toast keeps its registration. */
export const clearUndo = (id: string): void => {
  if (latest?.id === id) latest = null;
};

/** Runs the latest undo once. Returns false when there is nothing to undo. */
export function runLatestUndo(): boolean {
  const entry = latest;
  if (!entry) return false;
  latest = null;
  entry.run();
  return true;
}
