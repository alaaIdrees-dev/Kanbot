/**
 * The `/` shortcut: focus the search box of the current page. Search inputs mark themselves with
 * `data-kb-search`. When the page has none, the caller can navigate to the backlog and ask for the
 * focus to happen once its search box mounts (`requestSearchFocus` + `consumeSearchFocusRequest`).
 */
export const SEARCH_ATTRIBUTE = "data-kb-search";

let pending = false;

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0;

/** Focuses the first visible search input; returns false when the page has none. */
export function focusSearch(): boolean {
  const inputs = document.querySelectorAll<HTMLInputElement>(`input[${SEARCH_ATTRIBUTE}]`);
  for (const input of inputs) {
    if (!isVisible(input) || input.disabled) continue;
    input.focus();
    input.select();
    return true;
  }
  return false;
}

export const requestSearchFocus = () => {
  pending = true;
};

/** True once after `requestSearchFocus`; the search box calls it when it mounts. */
export function consumeSearchFocusRequest(): boolean {
  const value = pending;
  pending = false;
  return value;
}
