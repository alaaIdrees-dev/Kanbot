import { Chip } from "@mui/material";
import type { StoryPoints } from "../../types/api";

/**
 * Story points as a pill: "5 pts", or "–" when not estimated (wireframes 04 / 05).
 * Shared by backlog rows and (Day 5) board cards. The accessible name spells the unit out.
 */
export function PointsBadge({ points }: { points: StoryPoints | null }) {
  return (
    <Chip
      label={points === null ? "–" : `${points} ${points === 1 ? "pt" : "pts"}`}
      size="small"
      aria-label={points === null ? "Not estimated" : `${points} story points`}
      sx={{ flexShrink: 0, minWidth: 44, fontWeight: 600 }}
    />
  );
}
