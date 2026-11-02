import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Close from "@mui/icons-material/Close";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import { layout } from "../../design/tokens";

interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Day 2: an empty drawer. The chat, quick actions and AI states arrive with the AI day (AI-1, AI-5). */
export function AssistantDrawer({ open, onClose }: AssistantDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          "aria-labelledby": "assistant-title",
          sx: { width: { xs: "100vw", sm: layout.assistantWidth }, maxWidth: "100vw" },
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          height: layout.topbarHeight,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <AutoAwesome fontSize="small" sx={{ color: "ai.text" }} aria-hidden />
        <Typography id="assistant-title" variant="h6" component="h2" sx={{ flex: 1 }}>
          AI assistant
        </Typography>
        <IconButton aria-label="Close assistant" onClick={onClose} autoFocus>
          <Close fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 3, color: "text.secondary" }}>
        <Typography>
          The assistant is coming soon. It will help you write todos, plan sprints and summarise
          them.
        </Typography>
      </Box>
    </Drawer>
  );
}
