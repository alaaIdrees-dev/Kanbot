import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Close from "@mui/icons-material/Close";
import RestartAlt from "@mui/icons-material/RestartAlt";
import { Box, Button, Drawer, IconButton, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { layout } from "../../design/tokens";
import { useAssistantChat } from "../../hooks/useAi";
import { useProject } from "../../hooks/useProjects";
import { useAiUiStore } from "../../stores/aiUiStore";
import { AiModeBadge } from "../ai/AiModeBadge";
import { ChatComposer } from "../ai/ChatComposer";
import { ChatMessages } from "../ai/ChatMessages";

interface AssistantDrawerProps {
  projectId: string;
}

/**
 * AI-1 and AI-5: the assistant panel, available on every project page. Quick actions open the AI
 * dialogs (rendered by `AiDialogs`); the conversation lives in the AI UI store, so it is kept while
 * the panel is closed and reset when the project changes or with "New chat".
 */
export function AssistantDrawer({ projectId }: AssistantDrawerProps) {
  const navigate = useNavigate();
  const open = useAiUiStore((s) => s.assistantOpen);
  const messages = useAiUiStore((s) => s.messages);
  const sending = useAiUiStore((s) => s.sending);
  const chatError = useAiUiStore((s) => s.chatError);
  const chat = useAssistantChat(projectId);
  const { data: project } = useProject(projectId);
  const activeSprint = project?.stats.activeSprint ?? null;

  const close = () => useAiUiStore.getState().closeAssistant();

  // A quick action hands over to its dialog, so the panel gets out of the way first.
  const runQuickAction = (action: () => void) => {
    close();
    action();
  };

  const summarize = () =>
    runQuickAction(() => {
      // The summary dialog lives on the board page (it needs the sprint), so go there first.
      useAiUiStore.getState().openSummary();
      navigate(`/projects/${projectId}/board`);
    });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={close}
      slotProps={{
        paper: {
          "aria-labelledby": "assistant-title",
          sx: {
            width: { xs: "100vw", sm: layout.assistantWidth },
            maxWidth: "100vw",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          minHeight: layout.topbarHeight,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <AutoAwesome fontSize="small" sx={{ color: "ai.text" }} aria-hidden />
        <Typography id="assistant-title" variant="h6" component="h2" sx={{ flex: 1 }}>
          Kanbot Assistant
        </Typography>
        <AiModeBadge />
        <Tooltip title="New chat">
          <span>
            <IconButton
              aria-label="New chat"
              onClick={() => useAiUiStore.getState().newChat()}
              disabled={messages.length === 0 && !sending && !chatError}
            >
              <RestartAlt fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton aria-label="Close assistant" onClick={close}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      <Box
        role="group"
        aria-label="Quick actions"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button
          size="small"
          variant="outlined"
          color="ai"
          onClick={() => runQuickAction(() => useAiUiStore.getState().openGenerate())}
        >
          Create todos
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="ai"
          onClick={() => runQuickAction(() => useAiUiStore.getState().openPlan())}
        >
          Plan sprint
        </Button>
        {/* A disabled button can't take focus, so the focusable wrapper carries the reason. */}
        <Tooltip title={activeSprint ? "" : "Start a sprint first: there is nothing to summarize yet"}>
          <Box component="span" tabIndex={activeSprint ? undefined : 0} sx={{ display: "inline-flex", borderRadius: 2 }}>
            <Button
              size="small"
              variant="outlined"
              color="ai"
              disabled={!activeSprint}
              onClick={summarize}
            >
              Summarize sprint
            </Button>
          </Box>
        </Tooltip>
      </Box>

      <ChatMessages
        messages={messages}
        sending={sending}
        error={chatError}
        onRetry={chat.retry}
      />
      <ChatComposer disabled={sending} onSend={chat.send} />
    </Drawer>
  );
}
