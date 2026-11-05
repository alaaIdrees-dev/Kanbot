import { useState, type KeyboardEvent } from "react";
import Send from "@mui/icons-material/Send";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { CHAT_MAX_CHARS } from "../../stores/aiUiStore";
import { AiDisclaimer } from "./AiDisclaimer";

interface ChatComposerProps {
  disabled: boolean;
  /** Returns `true` when the message was accepted (the box is then cleared). */
  onSend: (content: string) => boolean;
}

/** AI-1: Enter sends, Shift+Enter adds a new line. The draft is local: it is not worth keeping in a store. */
export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState("");
  const canSend = !disabled && draft.trim().length > 0;

  const submit = () => {
    if (canSend && onSend(draft)) setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // `isComposing`: Enter that confirms an IME candidate must not send the message.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
        <TextField
          label="Ask Kanbot"
          multiline
          maxRows={6}
          fullWidth
          size="small"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{ htmlInput: { maxLength: CHAT_MAX_CHARS } }}
          helperText="Enter to send, Shift+Enter for a new line"
        />
        <Tooltip title={disabled ? "Wait for the answer" : "Send"}>
          <span>
            <IconButton
              aria-label="Send message"
              color="primary"
              onClick={submit}
              disabled={!canSend}
              sx={{ mb: 3 }}
            >
              <Send fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Box sx={{ mt: 0.5 }}>
        <AiDisclaimer align="center" />
      </Box>
    </Box>
  );
}
