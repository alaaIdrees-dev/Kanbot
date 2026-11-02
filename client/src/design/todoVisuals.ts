import type { SvgIconComponent } from "@mui/icons-material";
import BugReport from "@mui/icons-material/BugReport";
import BookmarkBorder from "@mui/icons-material/BookmarkBorder";
import CheckCircle from "@mui/icons-material/CheckCircle";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardDoubleArrowUp from "@mui/icons-material/KeyboardDoubleArrowUp";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import Remove from "@mui/icons-material/Remove";
import TaskAlt from "@mui/icons-material/TaskAlt";
import Timelapse from "@mui/icons-material/Timelapse";
import Visibility from "@mui/icons-material/Visibility";
import type { TodoPriority, TodoStatus, TodoType } from "../types/api";

/**
 * Icon half of the "colour + shape" contract (NFR-5). Pair each icon with its colour token:
 *   status   → palette `status.<key>`      priority → `priority.<key>`      type → `todoType.<key>`
 * The icons differ in SHAPE, so the meaning survives for colour-blind users and in forced-colours mode.
 */
export const STATUS_ICON: Record<TodoStatus, SvgIconComponent> = {
  todo: RadioButtonUnchecked,
  in_progress: Timelapse,
  in_review: Visibility,
  done: CheckCircle,
};

export const PRIORITY_ICON: Record<TodoPriority, SvgIconComponent> = {
  low: KeyboardArrowDown,
  medium: Remove,
  high: KeyboardArrowUp,
  urgent: KeyboardDoubleArrowUp,
};

export const TYPE_ICON: Record<TodoType, SvgIconComponent> = {
  task: TaskAlt,
  story: BookmarkBorder,
  bug: BugReport,
};
