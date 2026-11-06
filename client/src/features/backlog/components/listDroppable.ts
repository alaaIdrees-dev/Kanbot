/** Droppable id of a list. Prefixed so it can never collide with a todo id. */
export const listDroppableId = (containerId: string) => `list:${containerId}`;

export const isListDroppableId = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith("list:");

export const containerIdOfDroppable = (id: string) => id.slice("list:".length);
