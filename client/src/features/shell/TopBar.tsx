import AutoAwesome from "@mui/icons-material/AutoAwesome";
import MenuIcon from "@mui/icons-material/Menu";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { ThemeToggle } from "../../components/ThemeToggle";
import { layout } from "../../design/tokens";

interface TopBarProps {
  title: string;
  /** Show the hamburger that opens the collapsed sidebar (below the desktop breakpoint, NFR-4). */
  showMenuButton: boolean;
  onOpenMenu: () => void;
  /** "Ask AI" is only offered on project pages (the assistant needs a project). */
  onAskAi?: () => void;
  /** Receives the element where pages render title metadata through `<TopBarMeta>`. */
  metaSlotRef?: (node: HTMLElement | null) => void;
}

export function TopBar({
  title,
  showMenuButton,
  onOpenMenu,
  onAskAi,
  metaSlotRef,
}: TopBarProps) {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexShrink: 0,
        height: layout.topbarHeight,
        px: { xs: 1, md: 3 },
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {showMenuButton && (
        <IconButton aria-label="Open navigation" onClick={onOpenMenu} edge="start">
          <MenuIcon />
        </IconButton>
      )}
      <Typography variant="h4" component="h1" noWrap sx={{ minWidth: 0 }}>
        {title}
      </Typography>
      {/* Page-provided metadata, e.g. backlog totals. Empty (zero width) on pages that add none. */}
      <Box
        ref={metaSlotRef}
        sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", ml: 1 }}
      />
      {onAskAi && (
        <Button variant="contained" color="ai" startIcon={<AutoAwesome />} onClick={onAskAi}>
          Ask AI
        </Button>
      )}
      <ThemeToggle />
    </Box>
  );
}
