import { create } from "zustand";
import { TODO_STATUSES, type TodoStatus } from "../../../types/api";
import type { BoardMove, ColumnIds } from "../../../lib/boardColumns";

/**
 * UI-only state of the board page (plan §3.4): the live drag preview and which dialogs are open.
 * The todos themselves are server data and live only in TanStack Query (`['board', sprintId]`);
 * the preview is just column → ordered ids, which the page renders instead of the cache while a
 * card is held.
 */

export interface BoardDrag {
  activeId: string;
  /** Column the card was picked up from, and the column ids at that moment (to detect a no-op). */
  origin: TodoStatus;
  initial: ColumnIds;
  /** Column ids including the live preview. */
  columns: ColumnIds;
}

export interface DragOverInput {
  activeId: string;
  /** A column status when `isColumn`, otherwise the id of the card being held over. */
  id: string;
  isColumn: boolean;
  /** The dragged card is below the middle of the card it is held over. */
  below: boolean;
}

interface BoardUiState {
  drag: BoardDrag | null;
  detailsTodoId: string | null;
  /** Bumped on every open so the dialogs remount with fresh form values. */
  detailsKey: number;
  completeOpen: boolean;
  completeKey: number;

  beginDrag: (activeId: string, columns: ColumnIds) => void;
  /** True when the preview changed (the caller uses it to damp collision flicker). */
  dragOver: (input: DragOverInput) => boolean;
  /** Ends the drag and returns what to send, or null when nothing changed. */
  dropDrag: (over: { id: string; isColumn: boolean } | null) => BoardMove | null;
  endDrag: () => void;
  openDetails: (todoId: string) => void;
  closeDetails: () => void;
  openComplete: () => void;
  closeComplete: () => void;
  reset: () => void;
}

const isStatus = (value: string): value is TodoStatus =>
  (TODO_STATUSES as readonly string[]).includes(value);

const columnHolding = (columns: ColumnIds, id: string): TodoStatus | undefined =>
  TODO_STATUSES.find((status) => columns[status].includes(id));

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const initial = {
  drag: null,
  detailsTodoId: null,
  completeOpen: false,
} satisfies Partial<BoardUiState>;

export const useBoardUiStore = create<BoardUiState>()((set, get) => ({
  ...initial,
  detailsKey: 0,
  completeKey: 0,

  beginDrag: (activeId, columns) => {
    if (get().drag) return;
    const origin = columnHolding(columns, activeId);
    if (!origin) return;
    set({ drag: { activeId, origin, initial: columns, columns } });
  },

  dragOver: ({ activeId, id, isColumn, below }) => {
    const { drag } = get();
    if (!drag || drag.activeId !== activeId) return false;
    const from = columnHolding(drag.columns, activeId);
    const to = isColumn ? (isStatus(id) ? id : undefined) : columnHolding(drag.columns, id);
    // Within one column the sortable strategy handles the order; the drop settles it.
    if (!from || !to || from === to) return false;

    const target = drag.columns[to];
    let index = target.length;
    if (!isColumn) {
      const overIndex = target.indexOf(id);
      index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length;
    }
    set({
      drag: {
        ...drag,
        columns: {
          ...drag.columns,
          [from]: drag.columns[from].filter((cardId) => cardId !== activeId),
          [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
        },
      },
    });
    return true;
  },

  dropDrag: (over) => {
    const { drag } = get();
    if (!drag) return null;
    const to = columnHolding(drag.columns, drag.activeId);
    if (!to) {
      set({ drag: null });
      return null;
    }

    let ids = drag.columns[to];
    if (over) {
      const overColumn = over.isColumn
        ? isStatus(over.id)
          ? over.id
          : undefined
        : columnHolding(drag.columns, over.id);
      if (overColumn === to) {
        const from = ids.indexOf(drag.activeId);
        const target = over.isColumn ? ids.length - 1 : ids.indexOf(over.id);
        if (target >= 0 && target !== from) ids = moveItem(ids, from, target);
      }
    }

    // The column minus the dragged card, so the index of the card is exactly `position`.
    const position = ids.indexOf(drag.activeId);
    const unchanged = to === drag.origin && drag.initial[to].indexOf(drag.activeId) === position;
    if (unchanged) {
      set({ drag: null });
      return null;
    }
    // The preview stays until the optimistic cache update lands (`endDrag`), so no frame shows
    // the old order.
    return { todoId: drag.activeId, status: to, position };
  },

  endDrag: () => set({ drag: null }),

  openDetails: (todoId) => set((s) => ({ detailsTodoId: todoId, detailsKey: s.detailsKey + 1 })),
  closeDetails: () => set({ detailsTodoId: null }),
  openComplete: () => set((s) => ({ completeOpen: true, completeKey: s.completeKey + 1 })),
  closeComplete: () => set({ completeOpen: false }),
  reset: () => set({ ...initial }),
}));

/** Ids of one column while a card is held; `undefined` when nothing is being dragged. */
export const useColumnPreview = (status: TodoStatus): readonly string[] | undefined =>
  useBoardUiStore((s) => s.drag?.columns[status]);

export const useDraggedId = (): string | null => useBoardUiStore((s) => s.drag?.activeId ?? null);

export const useIsHeldOverColumn = (status: TodoStatus): boolean =>
  useBoardUiStore(
    (s) => !!s.drag && s.drag.origin !== status && s.drag.columns[status].includes(s.drag.activeId),
  );
