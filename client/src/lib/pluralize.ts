/** "1 todo", "3 todos". */
export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** "1 pt", "13 pts". */
export const formatPoints = (n: number): string => `${n} ${n === 1 ? "pt" : "pts"}`;
