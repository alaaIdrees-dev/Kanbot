import { create } from "zustand";

/**
 * Which todo just landed (a drop, or "Move to top" from a menu). Rows and cards read it to play a
 * one-off highlight (`kb-settle`, style.css). UI-only state with no server data in it.
 */
interface MotionState {
  settledId: string | null;
  settle: (todoId: string) => void;
}

const SETTLE_MS = 800;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useMotionStore = create<MotionState>()((set) => ({
  settledId: null,
  settle: (todoId) => {
    clearTimeout(timer);
    set({ settledId: todoId });
    timer = setTimeout(() => set({ settledId: null }), SETTLE_MS);
  },
}));

/** True for the todo that just landed. Per-row selector: only two rows re-render per drop. */
export const useIsSettling = (todoId: string): boolean =>
  useMotionStore((s) => s.settledId === todoId);

/** Sprinkled onto `sx`: the one-off landing highlight. */
export const SETTLE_ANIMATION = `kb-settle ${SETTLE_MS - 100}ms cubic-bezier(0.16, 1, 0.3, 1)`;
