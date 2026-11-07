import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import { focusSearch, requestSearchFocus } from "../../lib/searchFocus";
import { runLatestUndo } from "../../lib/undoRegistry";
import { useShellUiStore } from "./store/shellUiStore";

/** After `g`, the second key of the sequence has this long to arrive. */
const SEQUENCE_MS = 1200;

const GO_TO: Record<string, string> = { b: "board", l: "backlog", s: "sprints", p: "projects" };

/** The key as a lower-case Latin letter, also on non-Latin layouts (Arabic…) via the physical key. */
function letterOf(event: KeyboardEvent): string {
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key;
  return /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : key;
}

/** Typing somewhere: single-key shortcuts must not fire. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    !!target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")
  );
}

/** A dialog, drawer or menu is open: the page behind it is not the target of single-key shortcuts. */
const isModalOpen = () => !!document.querySelector(".MuiModal-root");

/**
 * Global keyboard shortcuts (deliberately not advertised anywhere in the UI):
 * `c` create todo · `/` focus search · `g b|l|s|p` go to board|backlog|sprints|projects ·
 * `Ctrl/⌘+K` palette · `Ctrl/⌘+Z` undo while its toast shows.
 *
 * Rules: never while typing in a field, never with Ctrl/Alt/⌘ (except the two chords above), never
 * while a dialog or menu is open, never on key repeat. Works on non-Latin keyboard layouts.
 */
export function useGlobalShortcuts(projectId: string | undefined) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  // The listener is registered once; it reads the latest values from here.
  const latest = useRef({ projectId, pathname, navigate, enqueueSnackbar });
  useEffect(() => {
    latest.current = { projectId, pathname, navigate, enqueueSnackbar };
  });

  useEffect(() => {
    let awaitingSecondKey = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const endSequence = () => {
      awaitingSecondKey = false;
      clearTimeout(timer);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const ui = useShellUiStore.getState();
      const mod = event.ctrlKey || event.metaKey;

      // Chords that also work while typing.
      if (mod && !event.altKey && !event.shiftKey && letterOf(event) === "k") {
        event.preventDefault();
        ui.togglePalette();
        return;
      }
      if (mod && !event.altKey && !event.shiftKey && letterOf(event) === "z") {
        // Inside a text field Ctrl+Z belongs to the field's own undo.
        if (!isTyping(event.target) && runLatestUndo()) event.preventDefault();
        return;
      }

      if (mod || event.altKey || event.repeat) return;
      if (isTyping(event.target) || isModalOpen()) {
        endSequence();
        return;
      }

      const {
        projectId: project,
        pathname: path,
        navigate: go,
        enqueueSnackbar: toast,
      } = latest.current;
      const needProject = (action: () => void) => {
        if (project) action();
        else toast("Open a project first.", { variant: "info" });
      };

      if (awaitingSecondKey) {
        endSequence();
        const section = GO_TO[letterOf(event)];
        if (section && !event.shiftKey) {
          event.preventDefault();
          if (section === "projects") go("/projects");
          else needProject(() => go(`/projects/${project}/${section}`));
        }
        return;
      }

      // "/" may need Shift on some layouts; a plain Slash key on a non-Latin layout has no key "/".
      const isSlash = event.key === "/" || (!event.shiftKey && event.code === "Slash");
      if (isSlash) {
        event.preventDefault();
        if (focusSearch()) return;
        // This page has no search box: the backlog does.
        needProject(() => {
          requestSearchFocus();
          if (!path.endsWith("/backlog")) go(`/projects/${project}/backlog`);
        });
        return;
      }
      if (event.shiftKey) return;

      const letter = letterOf(event);
      if (letter === "c") {
        event.preventDefault();
        needProject(() => ui.openCreateTodo());
      } else if (letter === "g") {
        event.preventDefault();
        awaitingSecondKey = true;
        timer = setTimeout(endSequence, SEQUENCE_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, []);
}
