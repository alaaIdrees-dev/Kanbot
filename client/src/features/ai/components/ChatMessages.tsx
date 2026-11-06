import { useEffect, useRef, type ReactNode } from "react";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useAiStatus } from "../hooks/useAi";
import type { ChatEntry } from "../store/aiUiStore";
import { AiErrorAlert } from "./AiErrorAlert";
import { AiMarkdown } from "./AiMarkdown";

interface ChatMessagesProps {
  messages: ChatEntry[];
  sending: boolean;
  error: string | null;
  onRetry: () => void;
}

function UserBubble({ content }: { content: string }) {
  return (
    <Box
      sx={{
        alignSelf: "flex-end",
        maxWidth: "85%",
        px: 1.5,
        py: 1,
        borderRadius: 3,
        bgcolor: "tint.primary",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
      }}
    >
      <Typography>{content}</Typography>
    </Box>
  );
}

function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", maxWidth: "95%" }}>
      <AutoAwesome fontSize="small" aria-hidden sx={{ color: "ai.text", mt: 1 }} />
      <Paper variant="outlined" sx={{ px: 1.5, py: 0.5, borderRadius: 3, minWidth: 0 }}>
        {children}
      </Paper>
    </Box>
  );
}

/**
 * AI-1: the conversation. Assistant replies are Markdown, user messages are plain text. A "Thinking…"
 * indicator shows while the request runs; a failed request shows the server message with "Try again".
 * Announced politely to screen readers (`role="log"`); scrolls to the newest message.
 */
export function ChatMessages({ messages, sending, error, onRetry }: ChatMessagesProps) {
  const { data: status } = useAiStatus();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending, error]);

  return (
    <Box
      role="log"
      aria-label="Conversation with the assistant"
      sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      {messages.length === 0 && (
        <Typography color="text.secondary">
          Ask about your backlog or sprint, or use a quick action above.
          {status?.mode === "mock" &&
            " Mock AI answers come from a built-in rule-based assistant, not a real model."}
        </Typography>
      )}

      {messages.map((message) =>
        message.role === "user" ? (
          <UserBubble key={message.id} content={message.content} />
        ) : (
          <AssistantBubble key={message.id}>
            <AiMarkdown>{message.content}</AiMarkdown>
          </AssistantBubble>
        ),
      )}

      {sending && (
        <AssistantBubble>
          <Box
            role="status"
            sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, color: "text.secondary" }}
          >
            <CircularProgress size={14} color="inherit" aria-hidden />
            <Typography variant="body2">Thinking…</Typography>
          </Box>
        </AssistantBubble>
      )}

      {error && <AiErrorAlert message={error} onRetry={onRetry} />}
      <div ref={endRef} />
    </Box>
  );
}
