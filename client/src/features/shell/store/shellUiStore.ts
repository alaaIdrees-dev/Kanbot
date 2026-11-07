import { create } from "zustand";
import type { Todo } from "../../../types/api";

/**
 * UI-only state of the app shell (plan §3.4): which global dialogs are open. They are global because
 * keyboard shortcuts and the command palette open them from any project page. Server data stays in
 * TanStack Query. `key` is bumped on every open so a dialog remounts with fresh form values.
 */
interface ShellUiState {
  paletteOpen: boolean;
  paletteKey: number;
  /** A palette command ran: the closing palette must not pull focus back from what the command opened. */
  paletteRan: boolean;
  createTodo: { open: boolean; key: number };
  /** The todo details dialog opened from the palette (pages keep their own for row clicks). */
  todoDetails: { open: boolean; key: number; todo: Todo | null };

  openPalette: () => void;
  closePalette: (ran?: boolean) => void;
  togglePalette: () => void;
  openCreateTodo: () => void;
  closeCreateTodo: () => void;
  openTodoDetails: (todo: Todo) => void;
  closeTodoDetails: () => void;
  /** Closes everything (leaving the project pages, logout). */
  reset: () => void;
}

export const useShellUiStore = create<ShellUiState>()((set) => ({
  paletteOpen: false,
  paletteKey: 0,
  paletteRan: false,
  createTodo: { open: false, key: 0 },
  todoDetails: { open: false, key: 0, todo: null },

  openPalette: () =>
    set((s) => ({ paletteOpen: true, paletteRan: false, paletteKey: s.paletteKey + 1 })),
  closePalette: (ran = false) => set({ paletteOpen: false, paletteRan: ran }),
  togglePalette: () =>
    set((s) =>
      s.paletteOpen
        ? { paletteOpen: false }
        : { paletteOpen: true, paletteRan: false, paletteKey: s.paletteKey + 1 },
    ),
  openCreateTodo: () => set((s) => ({ createTodo: { open: true, key: s.createTodo.key + 1 } })),
  closeCreateTodo: () => set((s) => ({ createTodo: { ...s.createTodo, open: false } })),
  openTodoDetails: (todo) =>
    set((s) => ({ todoDetails: { open: true, key: s.todoDetails.key + 1, todo } })),
  closeTodoDetails: () => set((s) => ({ todoDetails: { ...s.todoDetails, open: false } })),
  reset: () =>
    set((s) => ({
      paletteOpen: false,
      createTodo: { ...s.createTodo, open: false },
      todoDetails: { ...s.todoDetails, open: false },
    })),
}));
