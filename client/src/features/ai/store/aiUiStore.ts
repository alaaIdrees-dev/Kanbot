import { create } from "zustand";
import type { ChatMessage, DraftTodo } from "../../../types/api";

/**
 * UI-only state of the AI features (plan §3.4: dialog open, chat messages stay out of the Query
 * cache). Server data (`['ai-status']`, backlog, sprints) stays in TanStack Query; the dialogs'
 * own form fields are local to each dialog and start fresh on every open.
 *
 * It holds: the assistant drawer, which AI dialogs are open, and the conversation (AI-1). The
 * server keeps no chat memory, so the whole conversation lives here and is sent on every message.
 */

export interface ChatEntry {
  /** Client-only id, used as the React key. Never sent to the server. */
  id: string;
  role: ChatMessage["role"];
  content: string;
}

/** Server limits (types/api.ts): 1–30 messages per request, ≤ 4000 characters each. */
export const CHAT_MAX_MESSAGES = 30;
export const CHAT_MAX_CHARS = 4000;

interface DialogState {
  open: boolean;
  /** Bumped on every open so the dialog remounts with fresh form values. */
  key: number;
}

interface GenerateDialogState extends DialogState {
  /** Drafts read from a chat reply ("Review & add to backlog"); the dialog starts on them. */
  initialDrafts?: DraftTodo[];
}

interface AiUiState {
  /** The project this state belongs to. Switching project resets it (AI-1). */
  projectId: string | null;
  assistantOpen: boolean;
  generateDialog: GenerateDialogState;
  planDialog: DialogState;
  /** The sprint summary dialog on the board (AI-4). The board page renders it, so the sprint is known there. */
  summaryDialog: DialogState;

  messages: ChatEntry[];
  /** A chat request is in flight (kept here, not in a component, so it survives closing the panel). */
  sending: boolean;
  chatError: string | null;
  /** Bumped by every reset; a reply that belongs to an older epoch is stale and is dropped. */
  epoch: number;

  /** Called when the current project changes: a different project starts from a clean slate. */
  syncProject: (projectId: string | null) => void;
  /** Closes the drawer and every AI dialog (used when leaving the project pages). */
  closeAll: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
  /** `drafts` pre-fills the review list (wireframe 07); without them the dialog starts empty. */
  openGenerate: (drafts?: DraftTodo[]) => void;
  closeGenerate: () => void;
  openPlan: () => void;
  closePlan: () => void;
  openSummary: () => void;
  closeSummary: () => void;

  /** Appends the user's message and returns what to send, or `null` when a request is running. */
  beginSend: (content: string) => ChatRequestPayload | null;
  /** Re-sends the conversation after an error (the user's last message is still in the list). */
  beginRetry: () => ChatRequestPayload | null;
  receiveReply: (epoch: number, content: string) => void;
  receiveError: (epoch: number, message: string) => void;
  newChat: () => void;
  /** Clears everything (logout). */
  reset: () => void;
}

export interface ChatRequestPayload {
  epoch: number;
  messages: ChatMessage[];
}

const closedDialog: DialogState = { open: false, key: 0 };

const initial = {
  projectId: null,
  assistantOpen: false,
  generateDialog: closedDialog,
  planDialog: closedDialog,
  summaryDialog: closedDialog,
  messages: [] as ChatEntry[],
  sending: false,
  chatError: null,
} satisfies Partial<AiUiState>;

/** The last `CHAT_MAX_MESSAGES` messages, trimmed to the server's per-message limit. */
function toRequestMessages(entries: ChatEntry[]): ChatMessage[] {
  return entries
    .slice(-CHAT_MAX_MESSAGES)
    .map(({ role, content }) => ({ role, content: content.slice(0, CHAT_MAX_CHARS) }));
}

const newId = (): string => crypto.randomUUID();

export const useAiUiStore = create<AiUiState>()((set, get) => ({
  ...initial,
  epoch: 0,

  syncProject: (projectId) => {
    if (get().projectId === projectId) return;
    // The chat belongs to one project: a new project means a new conversation and no open AI UI.
    set((s) => ({ ...initial, projectId, epoch: s.epoch + 1 }));
  },

  closeAll: () =>
    set((s) => ({
      assistantOpen: false,
      generateDialog: { ...s.generateDialog, open: false },
      planDialog: { ...s.planDialog, open: false },
      summaryDialog: { ...s.summaryDialog, open: false },
    })),
  openAssistant: () => set({ assistantOpen: true }),
  closeAssistant: () => set({ assistantOpen: false }),
  openGenerate: (drafts) =>
    set((s) => ({
      generateDialog: { open: true, key: s.generateDialog.key + 1, initialDrafts: drafts },
    })),
  closeGenerate: () => set((s) => ({ generateDialog: { ...s.generateDialog, open: false } })),
  openPlan: () => set((s) => ({ planDialog: { open: true, key: s.planDialog.key + 1 } })),
  closePlan: () => set((s) => ({ planDialog: { ...s.planDialog, open: false } })),
  openSummary: () => set((s) => ({ summaryDialog: { open: true, key: s.summaryDialog.key + 1 } })),
  closeSummary: () => set((s) => ({ summaryDialog: { ...s.summaryDialog, open: false } })),

  beginSend: (content) => {
    const { sending, messages, epoch } = get();
    const text = content.trim();
    if (sending || !text) return null;
    const next = [...messages, { id: newId(), role: "user" as const, content: text }];
    set({ messages: next, sending: true, chatError: null });
    return { epoch, messages: toRequestMessages(next) };
  },

  beginRetry: () => {
    const { sending, messages, epoch } = get();
    if (sending || messages.at(-1)?.role !== "user") return null;
    set({ sending: true, chatError: null });
    return { epoch, messages: toRequestMessages(messages) };
  },

  receiveReply: (epoch, content) => {
    if (get().epoch !== epoch) return;
    set((s) => ({
      messages: [...s.messages, { id: newId(), role: "assistant", content }],
      sending: false,
    }));
  },

  receiveError: (epoch, message) => {
    if (get().epoch !== epoch) return;
    set({ sending: false, chatError: message });
  },

  newChat: () =>
    set((s) => ({ messages: [], sending: false, chatError: null, epoch: s.epoch + 1 })),

  reset: () => set((s) => ({ ...initial, epoch: s.epoch + 1 })),
}));
