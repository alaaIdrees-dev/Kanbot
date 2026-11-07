import { STORY_POINTS, type DraftTodo, type StoryPoints } from "../types/api";

/** An assistant reply must have at least this many numbered items to count as a list of drafts. */
const MIN_ITEMS = 2;
const TITLE_MAX = 200;

const NUMBERED_ITEM = /^\s*\d+[.)]\s+(.+?)\s*$/;
const POINTS = /\(?\s*(\d+)\s*(?:story\s*)?(?:pts?|points?)\s*\)?/i;
/** The reply talks about work items (not, say, a numbered list of risks). */
const MENTIONS_TODOS = /\b(todos?|tasks?|stor(?:y|ies)|tickets?)\b/i;

const isStoryPoints = (value: number): value is StoryPoints =>
  (STORY_POINTS as readonly number[]).includes(value);

/** Strips the Markdown the model puts around a title (bold, code, trailing colon). */
const cleanTitle = (text: string): string =>
  text
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s:–—-]+$/, "")
    .trim();

/**
 * Wireframe 07: when the assistant answers with a numbered list of draft todos ("1. Profile page
 * layout (5 pts)"), the chat offers "Review & add to backlog". The chat endpoint only returns
 * Markdown, so the list is read back out of it here. It is a best effort: the drafts only go to the
 * review dialog, where the user edits and confirms them. Nothing is saved from here.
 */
export function parseDraftTodos(markdown: string): DraftTodo[] {
  if (!MENTIONS_TODOS.test(markdown)) return [];

  const drafts: DraftTodo[] = [];
  for (const line of markdown.split("\n")) {
    const match = NUMBERED_ITEM.exec(line);
    if (!match) continue;

    const raw = match[1];
    const pointsMatch = POINTS.exec(raw);
    const points = pointsMatch ? Number(pointsMatch[1]) : null;
    const title = cleanTitle(pointsMatch ? raw.replace(POINTS, "") : raw).slice(0, TITLE_MAX);
    if (!title) continue;

    drafts.push({
      title,
      description: "",
      type: "task",
      priority: "medium",
      storyPoints: points !== null && isStoryPoints(points) ? points : null,
    });
  }
  return drafts.length >= MIN_ITEMS ? drafts : [];
}
